"""
Основной клиент для работы с Liferay API
"""

import requests
import json
import logging
from typing import Dict, List, Optional, Any
from .config import get_config


class LiferayClient:
    """
    Базовый клиент для работы с Liferay API
    """
    
    def __init__(self, base_url=None, username=None, password=None, **kwargs):
        """
        Инициализация клиента Liferay
        
        Args:
            base_url: URL сервера Liferay
            username: Имя пользователя
            password: Пароль
            **kwargs: Дополнительные параметры
        """
        config = get_config()
        
        self.base_url = base_url or config.get('base_url', '').rstrip('/')
        self.username = username or config.get('username', '')
        self.password = password or config.get('password', '')
        self.timeout = kwargs.get('timeout', config.get('timeout', 30))
        self.verify_ssl = kwargs.get('verify_ssl', config.get('verify_ssl', False))
        
        # Настройка сессии
        self.session = requests.Session()
        self.session.auth = (self.username, self.password)
        self.session.verify = self.verify_ssl
        
        # Настройка логирования
        self.logger = logging.getLogger(__name__)
        
        self.logger.info(f"Инициализирован клиент Liferay для {self.base_url}")
    
    def test_connection(self) -> bool:
        """
        Тестирование подключения к Liferay
        
        Returns:
            bool: True если подключение успешно
        """
        try:
            url = f"{self.base_url}/api/jsonws"
            response = self.session.get(url, timeout=self.timeout)
            
            if response.status_code == 200:
                self.logger.info("✓ Подключение к Liferay успешно")
                return True
            else:
                self.logger.error(f"✗ Ошибка подключения: {response.status_code}")
                return False
                
        except requests.exceptions.ConnectionError as e:
            self.logger.error(f"✗ Не удается подключиться к серверу: {e}")
            return False
        except Exception as e:
            self.logger.error(f"✗ Ошибка тестирования подключения: {e}")
            return False
    
    def call_jsonws(self, method: str, params: Dict[str, Any] = None) -> Optional[Any]:
        """
        Вызов метода JSON Web Services
        
        Args:
            method: Имя метода (например, 'dlapp/add-file-entry')
            params: Параметры метода
            
        Returns:
            Ответ от сервера или None в случае ошибки
        """
        try:
            url = f"{self.base_url}/api/jsonws/{method}"
            
            # Преобразуем параметры
            data = {}
            if params:
                for key, value in params.items():
                    if isinstance(value, (dict, list)):
                        data[key] = json.dumps(value)
                    else:
                        data[key] = str(value)
            
            self.logger.debug(f"Вызов {method} с параметрами: {data}")
            
            response = self.session.post(url, data=data, timeout=self.timeout)
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    self.logger.debug(f"Ответ от {method}: {result}")
                    return result
                except json.JSONDecodeError:
                    self.logger.warning(f"Ответ не в формате JSON: {response.text[:200]}")
                    return response.text
            else:
                self.logger.error(f"Ошибка вызова {method}: {response.status_code}")
                self.logger.error(f"Ответ: {response.text[:500]}")
                return None
                
        except Exception as e:
            self.logger.error(f"Ошибка при вызове {method}: {e}")
            return None
    
    def get_current_user(self) -> Optional[Dict]:
        """
        Получение информации о текущем пользователе
        
        Returns:
            Словарь с информацией о пользователе или None
        """
        try:
            # Пробуем получить через Headless API если доступен
            url = f"{self.base_url}/o/headless-admin-user/v1.0/my-user-account"
            response = self.session.get(url, timeout=self.timeout)
            
            if response.status_code == 200:
                return response.json()
        except:
            pass
        
        # Используем JSON WS как fallback
        return self.call_jsonws('user/get-current-user')
    
    def get_version(self) -> Optional[str]:
        """
        Получение версии Liferay
        
        Returns:
            Строка с версией или None
        """
        try:
            url = f"{self.base_url}/api/jsonws"
            response = self.session.get(url, timeout=self.timeout)
            
            if response.status_code == 200:
                # Ищем версию в HTML
                import re
                html = response.text
                
                patterns = [
                    r'Liferay.*?(\d+\.\d+\.\d+)',
                    r'Version.*?(\d+\.\d+\.\d+)',
                    r'portal.*?(\d+\.\d+\.\d+)'
                ]
                
                for pattern in patterns:
                    match = re.search(pattern, html, re.IGNORECASE)
                    if match:
                        return match.group(1)
                        
        except Exception as e:
            self.logger.error(f"Ошибка получения версии: {e}")
        
        return None