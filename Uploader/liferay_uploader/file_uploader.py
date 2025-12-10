"""
Класс для загрузки файлов в Liferay с заменой существующих
"""

import os
import base64
import mimetypes
import logging
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from .liferay_client import LiferayClient


class FileUploader:
    """
    Класс для загрузки файлов в Liferay с поддержкой замены существующих
    """
    
    def __init__(self, client: LiferayClient):
        """
        Инициализация загрузчика файлов
        
        Args:
            client: Клиент Liferay
        """
        self.client = client
        self.logger = logging.getLogger(__name__)
        
        # Кэш MIME-типов
        self._mime_cache = {}
    
    def check_file_exists(self, site_id: int, folder_id: int, filename: str) -> Optional[Dict]:
        """
        Проверка существования файла на сервере
        
        Args:
            site_id: ID сайта
            folder_id: ID папки
            filename: Имя файла
            
        Returns:
            Информация о существующем файле или None
        """
        try:
            # Пробуем найти файл по имени
            params = {
                'repositoryId': site_id,
                'folderId': folder_id,
                'start': -1,
                'end': -1
            }
            
            result = self.client.call_jsonws('dlapp/get-file-entries', params)
            
            if result and isinstance(result, list):
                for file_entry in result:
                    if file_entry.get('title') == os.path.splitext(filename)[0] or \
                       file_entry.get('name') == filename:
                        self.logger.debug(f"Файл найден на сервере: {filename}")
                        return file_entry
            
            return None
            
        except Exception as e:
            self.logger.error(f"Ошибка проверки существования файла: {e}")
            return None
    
    def update_file_description(self, file_entry_id: int, description: str) -> bool:
        """
        Обновление описания файла
        
        Args:
            file_entry_id: ID файла в Liferay
            description: Новое описание
            
        Returns:
            True если обновление успешно
        """
        try:
            params = {
                'fileEntryId': file_entry_id,
                'description': description,
                'serviceContext': '{}'
            }
            
            result = self.client.call_jsonws('dlapp/update-file-entry', params)
            
            if result:
                self.logger.info(f"✓ Обновлено описание файла ID: {file_entry_id}")
                return True
            else:
                self.logger.error(f"✗ Не удалось обновить описание файла ID: {file_entry_id}")
                return False
                
        except Exception as e:
            self.logger.error(f"Ошибка обновления описания файла: {e}")
            return False
    
    def delete_file(self, file_entry_id: int) -> bool:
        """
        Удаление файла
        
        Args:
            file_entry_id: ID файла в Liferay
            
        Returns:
            True если удаление успешно
        """
        try:
            params = {
                'fileEntryId': file_entry_id
            }
            
            result = self.client.call_jsonws('dlapp/delete-file-entry', params)
            
            if result:
                self.logger.info(f"✓ Удален файл ID: {file_entry_id}")
                return True
            else:
                self.logger.error(f"✗ Не удалось удалить файл ID: {file_entry_id}")
                return False
                
        except Exception as e:
            self.logger.error(f"Ошибка удаления файла: {e}")
            return False
    
    def upload_or_replace_file(self, file_path: str, site_id: int, 
                              folder_id: int = 0, description: str = "",
                              replace_existing: bool = True,
                              change_log: str = "Загружено через API") -> Optional[Dict]:
        """
        Загрузка файла с возможностью замены существующего
        
        Args:
            file_path: Путь к файлу
            site_id: ID сайта (repositoryId)
            folder_id: ID папки (0 для корневой)
            description: Описание файла
            replace_existing: Заменять ли существующий файл
            change_log: Комментарий к изменению
            
        Returns:
            Информация о загруженном файле или None
        """
        if not os.path.exists(file_path):
            self.logger.error(f"Файл не найден: {file_path}")
            return None
        
        file_name = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        
        self.logger.info(f"Обработка файла: {file_name} ({file_size} байт)")
        
        # Проверяем существование файла
        existing_file = self.check_file_exists(site_id, folder_id, file_name)
        
        if existing_file and replace_existing:
            self.logger.info(f"Файл уже существует на сервере (ID: {existing_file.get('fileEntryId')})")
            
            # Удаляем старый файл
            if self.delete_file(existing_file.get('fileEntryId')):
                self.logger.info(f"✓ Старый файл удален, загружаю новый...")
            else:
                self.logger.warning(f"✗ Не удалось удалить старый файл, пробую загрузить как новый...")
        
        # Загружаем файл
        result = self._upload_file_internal(file_path, site_id, folder_id, 
                                           description, change_log)
        
        # Если загрузка не удалась и файл существовал, возможно он уже был обновлен другим способом
        if not result and existing_file and not replace_existing:
            # Просто обновляем описание
            if description:
                self.update_file_description(existing_file.get('fileEntryId'), description)
                return existing_file
        
        return result
    
    def _upload_file_internal(self, file_path: str, site_id: int, 
                             folder_id: int, description: str,
                             change_log: str) -> Optional[Dict]:
        """
        Внутренний метод загрузки файла
        """
        try:
            # Читаем и кодируем файл
            file_name = os.path.basename(file_path)
            
            with open(file_path, 'rb') as f:
                file_content = base64.b64encode(f.read()).decode('utf-8')
            
            # Получаем MIME-тип
            mime_type = self._get_mime_type(file_path)
            
            # Подготавливаем параметры
            params = {
                'repositoryId': str(site_id),
                'folderId': str(folder_id),
                'sourceFileName': file_name,
                'mimeType': mime_type,
                'title': os.path.splitext(file_name)[0],
                'description': description,  # Добавляем описание при загрузке
                'changeLog': change_log,
                'file': file_content,
                'serviceContext': '{}'
            }
            
            # Загружаем файл
            self.logger.debug(f"Параметры загрузки: {list(params.keys())}")
            
            result = self.client.call_jsonws('dlapp/add-file-entry', params)
            
            if result:
                self.logger.info(f"✓ Файл загружен: {file_name}")
                self.logger.debug(f"Результат: {result}")
                
                # Если описание не было добавлено при загрузке (бывает в некоторых версиях Liferay)
                if description and not result.get('description'):
                    self.update_file_description(result.get('fileEntryId'), description)
                
                return result
            else:
                self.logger.error(f"✗ Не удалось загрузить файл: {file_name}")
                
        except Exception as e:
            self.logger.error(f"✗ Ошибка при загрузке файла {file_path}: {e}")
        
        return None
    
    def upload_files_batch(self, files_list: List[str], site_id: int,
                          folder_id: int = 0, description_template: str = "",
                          replace_existing: bool = True,
                          metadata: Dict[str, Dict] = None) -> Dict[str, List]:
        """
        Пакетная загрузка файлов с заменой существующих
        
        Args:
            files_list: Список путей к файлам
            site_id: ID сайта
            folder_id: ID папки
            description_template: Шаблон описания
            replace_existing: Заменять ли существующие файлы
            metadata: Метаданные для файлов (filename -> metadata_dict)
            
        Returns:
            Словарь с результатами
        """
        self.logger.info(f"Начинаю пакетную загрузку {len(files_list)} файлов...")
        self.logger.info(f"Замена существующих файлов: {'Да' if replace_existing else 'Нет'}")
        
        results = {
            'successful': [],
            'failed': [],
            'skipped': [],
            'replaced': []
        }
        
        for i, file_path in enumerate(files_list, 1):
            if not os.path.exists(file_path):
                self.logger.warning(f"Файл не найден, пропускаю: {file_path}")
                results['skipped'].append(file_path)
                continue
            
            file_name = os.path.basename(file_path)
            self.logger.info(f"[{i}/{len(files_list)}] Обработка: {file_name}")
            
            # Формируем описание
            if description_template:
                description = description_template.format(
                    filename=file_name,
                    index=i,
                    total=len(files_list)
                )
            else:
                description = ""
            
            # Добавляем метаданные если есть
            if metadata and file_name in metadata:
                file_meta = metadata[file_name]
                if 'description' in file_meta:
                    if description:
                        description += f"\n{file_meta['description']}"
                    else:
                        description = file_meta['description']
            
            # Проверяем существование файла перед загрузкой
            existing_file = self.check_file_exists(site_id, folder_id, file_name)
            is_replacement = existing_file and replace_existing
            
            # Загружаем или заменяем файл
            result = self.upload_or_replace_file(
                file_path=file_path,
                site_id=site_id,
                folder_id=folder_id,
                description=description,
                replace_existing=replace_existing,
                change_log=f"Пакетная загрузка, файл {i} из {len(files_list)}"
            )
            
            if result:
                result_info = {
                    'file_path': file_path,
                    'file_name': file_name,
                    'file_entry_id': result.get('fileEntryId'),
                    'uuid': result.get('uuid'),
                    'title': result.get('title'),
                    'description': result.get('description', description),
                    'was_replaced': is_replacement
                }
                
                results['successful'].append(result_info)
                
                if is_replacement:
                    results['replaced'].append(result_info)
                    self.logger.info(f"  ✓ Заменен существующий файл")
                else:
                    self.logger.info(f"  ✓ Загружен новый файл")
            else:
                results['failed'].append(file_path)
                self.logger.error(f"  ✗ Не удалось загрузить файл")
            
            # Небольшая задержка между загрузками
            if i < len(files_list):
                time.sleep(0.5)
        
        # Вывод результатов
        self._log_batch_results(results)
        return results
    
    def upload_directory(self, directory_path: str, site_id: int,
                        folder_id: int = 0, recursive: bool = False,
                        extensions: List[str] = None,
                        replace_existing: bool = True) -> Dict[str, List]:
        """
        Загрузка всех файлов из директории с заменой существующих
        
        Args:
            directory_path: Путь к директории
            site_id: ID сайта
            folder_id: ID папки
            recursive: Рекурсивный обход поддиректорий
            extensions: Список разрешенных расширений
            replace_existing: Заменять ли существующие файлы
            
        Returns:
            Словарь с результатами
        """
        if not os.path.exists(directory_path):
            self.logger.error(f"Директория не найдена: {directory_path}")
            return {'successful': [], 'failed': [], 'skipped': [], 'replaced': []}
        
        # Собираем список файлов
        files_list = []
        
        if recursive:
            for root, _, files in os.walk(directory_path):
                for file in files:
                    if self._check_file_extension(file, extensions):
                        files_list.append(os.path.join(root, file))
        else:
            for item in os.listdir(directory_path):
                item_path = os.path.join(directory_path, item)
                if os.path.isfile(item_path) and self._check_file_extension(item, extensions):
                    files_list.append(item_path)
        
        self.logger.info(f"Найдено {len(files_list)} файлов в директории {directory_path}")
        
        # Загружаем файлы с возможностью замены
        return self.upload_files_batch(files_list, site_id, folder_id, 
                                      replace_existing=replace_existing)
    
    def update_descriptions_batch(self, site_id: int, folder_id: int = 0,
                                 descriptions: Dict[str, str] = None) -> Dict[str, List]:
        """
        Пакетное обновление описаний файлов
        
        Args:
            site_id: ID сайта
            folder_id: ID папки
            descriptions: Словарь {имя_файла: описание}
            
        Returns:
            Словарь с результатами
        """
        if not descriptions:
            return {'updated': [], 'failed': []}
        
        self.logger.info(f"Начинаю обновление описаний для {len(descriptions)} файлов...")
        
        results = {
            'updated': [],
            'failed': []
        }
        
        # Получаем список файлов в папке
        try:
            params = {
                'repositoryId': site_id,
                'folderId': folder_id,
                'start': -1,
                'end': -1
            }
            
            files_on_server = self.client.call_jsonws('dlapp/get-file-entries', params)
            
            if not files_on_server or not isinstance(files_on_server, list):
                self.logger.error("Не удалось получить список файлов с сервера")
                return results
            
            # Создаем словарь для быстрого поиска файлов по имени
            file_dict = {}
            for file_entry in files_on_server:
                file_name = file_entry.get('name') or f"{file_entry.get('title')}.xxx"
                file_dict[file_name] = file_entry
            
            # Обновляем описания
            for filename, description in descriptions.items():
                if filename in file_dict:
                    file_entry = file_dict[filename]
                    file_entry_id = file_entry.get('fileEntryId')
                    
                    if self.update_file_description(file_entry_id, description):
                        results['updated'].append({
                            'filename': filename,
                            'file_entry_id': file_entry_id
                        })
                        self.logger.info(f"✓ Обновлено описание для: {filename}")
                    else:
                        results['failed'].append(filename)
                        self.logger.error(f"✗ Не удалось обновить описание для: {filename}")
                else:
                    results['failed'].append(filename)
                    self.logger.warning(f"✗ Файл не найден на сервере: {filename}")
        
        except Exception as e:
            self.logger.error(f"Ошибка при пакетном обновлении описаний: {e}")
        
        return results
    
    def _get_mime_type(self, file_path: str) -> str:
        """
        Определение MIME-типа файла
        """
        if file_path in self._mime_cache:
            return self._mime_cache[file_path]
        
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = 'application/octet-stream'
        
        self._mime_cache[file_path] = mime_type
        return mime_type
    
    def _check_file_extension(self, filename: str, extensions: List[str] = None) -> bool:
        """
        Проверка расширения файла
        """
        if not extensions:
            return True
        
        file_ext = os.path.splitext(filename)[1].lower()
        return file_ext in extensions or f".{file_ext}" in extensions
    
    def _log_batch_results(self, results: Dict[str, List]):
        """
        Логирование результатов пакетной загрузки
        """
        total_processed = len(results['successful']) + len(results['failed']) + len(results['skipped'])
        
        self.logger.info(f"{'='*60}")
        self.logger.info("РЕЗУЛЬТАТЫ ПАКЕТНОЙ ЗАГРУЗКИ:")
        self.logger.info(f"{'='*60}")
        self.logger.info(f"Всего обработано файлов: {total_processed}")
        self.logger.info(f"Успешно загружено/обновлено: {len(results['successful'])}")
        self.logger.info(f"  - Из них заменено: {len(results['replaced'])}")
        self.logger.info(f"Не удалось загрузить: {len(results['failed'])}")
        self.logger.info(f"Пропущено (не найдены): {len(results['skipped'])}")
        
        if results['failed']:
            self.logger.warning("Файлы с ошибками:")
            for filename in results['failed'][:10]:
                self.logger.warning(f"  - {filename}")
            if len(results['failed']) > 10:
                self.logger.warning(f"  ... и еще {len(results['failed']) - 10} файлов")