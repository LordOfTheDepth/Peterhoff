"""
Управление сайтами и папками в Liferay
"""

import logging
from typing import Dict, List, Optional, Any
from .liferay_client import LiferayClient


class SiteManager:
    """
    Менеджер для работы с сайтами и папками Liferay
    """
    
    def __init__(self, client: LiferayClient):
        """
        Инициализация менеджера сайтов
        
        Args:
            client: Клиент Liferay
        """
        self.client = client
        self.logger = logging.getLogger(__name__)
    
    def get_sites(self, include_user_sites: bool = True) -> List[Dict]:
        """
        Получение списка доступных сайтов
        
        Args:
            include_user_sites: Включать ли пользовательские сайты
            
        Returns:
            Список сайтов
        """
        self.logger.info("Получение списка сайтов...")
        sites = []
        
        # Метод 1: Получение сайтов пользователя
        if include_user_sites:
            try:
                result = self.client.call_jsonws('group/get-user-sites')
                if result and isinstance(result, list):
                    sites.extend(result)
            except Exception as e:
                self.logger.warning(f"Не удалось получить пользовательские сайты: {e}")
        
        # Метод 2: Получение всех сайтов
        try:
            params = {
                'companyId': self._get_company_id(),
                'parentGroupId': 0,
                'site': True,
                'active': True,
                'start': -1,
                'end': -1
            }
            
            result = self.client.call_jsonws('group/get-groups', params)
            if result and isinstance(result, list):
                # Исключаем дубликаты
                existing_ids = {site.get('groupId') for site in sites}
                for site in result:
                    if site.get('groupId') not in existing_ids:
                        sites.append(site)
        except Exception as e:
            self.logger.error(f"Ошибка получения всех сайтов: {e}")
        
        self.logger.info(f"Найдено {len(sites)} сайтов")
        return sites
    
    def get_site_by_id(self, site_id: int) -> Optional[Dict]:
        """
        Получение информации о сайте по ID
        
        Args:
            site_id: ID сайта
            
        Returns:
            Информация о сайте или None
        """
        try:
            params = {'groupId': site_id}
            result = self.client.call_jsonws('group/get-group', params)
            return result
        except Exception as e:
            self.logger.error(f"Ошибка получения сайта {site_id}: {e}")
            return None
    
    def get_folders(self, site_id: int, parent_folder_id: int = 0) -> List[Dict]:
        """
        Получение списка папок в библиотеке документов
        
        Args:
            site_id: ID сайта
            parent_folder_id: ID родительской папки (0 для корневой)
            
        Returns:
            Список папок
        """
        try:
            params = {
                'groupId': site_id,
                'parentFolderId': parent_folder_id,
                'start': -1,
                'end': -1
            }
            
            result = self.client.call_jsonws('dlapp/get-folders', params)
            if result and isinstance(result, list):
                self.logger.info(f"Найдено {len(result)} папок в сайте {site_id}")
                return result
            return []
            
        except Exception as e:
            self.logger.error(f"Ошибка получения папок: {e}")
            return []
    
    def create_folder(self, site_id: int, parent_folder_id: int, 
                     name: str, description: str = "") -> Optional[Dict]:
        """
        Создание новой папки
        
        Args:
            site_id: ID сайта
            parent_folder_id: ID родительской папки
            name: Название папки
            description: Описание папки
            
        Returns:
            Информация о созданной папке или None
        """
        try:
            params = {
                'repositoryId': site_id,
                'parentFolderId': parent_folder_id,
                'name': name,
                'description': description,
                'serviceContext': '{}'
            }
            
            result = self.client.call_jsonws('dlapp/add-folder', params)
            
            if result:
                self.logger.info(f"Создана папка '{name}' с ID: {result.get('folderId')}")
                return result
                
        except Exception as e:
            self.logger.error(f"Ошибка создания папки: {e}")
        
        return None
    
    def get_folder_contents(self, site_id: int, folder_id: int = 0) -> Dict:
        """
        Получение содержимого папки
        
        Args:
            site_id: ID сайта
            folder_id: ID папки
            
        Returns:
            Словарь с файлами и подпапками
        """
        try:
            params = {
                'repositoryId': site_id,
                'folderId': folder_id
            }
            
            files = self.client.call_jsonws('dlapp/get-file-entries', params) or []
            folders = self.client.call_jsonws('dlapp/get-folders', params) or []
            
            return {
                'files': files if isinstance(files, list) else [],
                'folders': folders if isinstance(folders, list) else []
            }
            
        except Exception as e:
            self.logger.error(f"Ошибка получения содержимого папки: {e}")
            return {'files': [], 'folders': []}
    
    def _get_company_id(self) -> int:
        """
        Получение ID компании
        
        Returns:
            ID компании (обычно 20097 для Liferay 7.2)
        """
        # Попробуем получить через API
        try:
            params = {'webId': 'liferay.com'}
            result = self.client.call_jsonws('company/get-company-by-web-id', params)
            if result:
                return result.get('companyId', 20097)
        except:
            pass
        
        # Дефолтные значения для Liferay 7.2
        possible_ids = [20097, 10101, 20101]
        
        for company_id in possible_ids:
            try:
                params = {'companyId': company_id}
                result = self.client.call_jsonws('company/get-company-by-id', params)
                if result:
                    return company_id
            except:
                continue
        
        return 20097  # Дефолтное значение для Liferay 7.2