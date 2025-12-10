import requests
import base64
import os
import json
import mimetypes
from pathlib import Path


class Liferay72FileUploader:
    """
    Класс для загрузки файлов в Liferay 7.2 через JSON Web Services API
    """
    
    def __init__(self, base_url, username, password):
        self.base_url = base_url.rstrip('/')
        self.username = username
        self.password = password
        self.session = requests.Session()
        self.session.auth = (username, password)
        
        print(f"Подключение к Liferay 7.2: {base_url}")
        
    def test_connection(self):
        """
        Тестирование подключения к Liferay
        """
        try:
            url = f"{self.base_url}/api/jsonws"
            response = self.session.get(url)
            
            if response.status_code == 200:
                print("✓ Подключение к JSON Web Services успешно")
                return True
            else:
                print(f"✗ Ошибка подключения: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ Ошибка подключения: {e}")
            return False
    
    def get_user_info(self):
        """
        Получение информации о текущем пользователе
        """
        try:
            # В Liferay 7.2 используем JSON WS для получения информации о пользователе
            url = f"{self.base_url}/api/jsonws/user/get-current-user"
            response = self.session.post(url)
            
            if response.status_code == 200:
                user_info = response.json()
                print(f"✓ Аутентифицирован как: {user_info.get('screenName')}")
                print(f"  User ID: {user_info.get('userId')}")
                print(f"  Email: {user_info.get('emailAddress')}")
                return user_info
            else:
                # Пробуем другой метод
                url = f"{self.base_url}/api/jsonws/user/get-user-by-id"
                params = {'userId': self._get_current_user_id()}
                response = self.session.post(url, data=params)
                
                if response.status_code == 200:
                    user_info = response.json()
                    print(f"✓ Аутентифицирован как: {user_info.get('screenName')}")
                    return user_info
                
                return None
                
        except Exception as e:
            print(f"✗ Ошибка получения информации о пользователе: {e}")
            return None
    
    def _get_current_user_id(self):
        """
        Получение ID текущего пользователя
        """
        try:
            url = f"{self.base_url}/api/jsonws/user/get-current-user"
            response = self.session.post(url)
            if response.status_code == 200:
                return response.json().get('userId')
        except:
            pass
        return None
    
    def get_sites(self):
        """
        Получение списка сайтов через JSON Web Services
        """
        print("\nПолучение списка сайтов...")
        
        try:
            # Метод 1: Получение всех групп (сайтов)
            url = f"{self.base_url}/api/jsonws/group/get-user-sites"
            response = self.session.post(url)
            
            sites = []
            
            if response.status_code == 200:
                sites = response.json()
                print(f"✓ Найдено сайтов (get-user-sites): {len(sites)}")
            
            if not sites:
                # Метод 2: Получение групп по companyId
                url = f"{self.base_url}/api/jsonws/group/get-groups"
                params = {
                    'companyId': self._get_company_id(),
                    'parentGroupId': 0,
                    'site': True,
                    'active': True,
                    'start': -1,
                    'end': -1
                }
                
                response = self.session.post(url, data=params)
                
                if response.status_code == 200:
                    sites = response.json()
                    print(f"✓ Найдено сайтов (get-groups): {len(sites)}")
            
            # Выводим информацию о сайтах
            for i, site in enumerate(sites[:20], 1):  # Показываем первые 20
                site_id = site.get('groupId') or site.get('groupKey') or site.get('id')
                site_name = site.get('name') or site.get('descriptiveName') or f"Сайт {i}"
                print(f"  {i:2d}. ID: {site_id}, Название: {site_name}")
            
            return sites
            
        except Exception as e:
            print(f"✗ Ошибка получения сайтов: {e}")
            return []
    
    def _get_company_id(self):
        """
        Получение companyId (обычно 10101 или 20097 в Liferay 7.2)
        """
        # В Liferay 7.2 часто используется 20097
        possible_ids = [20097, 10101, 20101]
        
        for company_id in possible_ids:
            if self._test_company_id(company_id):
                return company_id
        
        return 20097  # Дефолтное значение для Liferay 7.2
    
    def _test_company_id(self, company_id):
        """
        Тестирование companyId
        """
        try:
            url = f"{self.base_url}/api/jsonws/company/get-company-by-id"
            params = {'companyId': company_id}
            
            response = self.session.post(url, data=params)
            return response.status_code == 200
            
        except:
            return False
    
    def get_document_library_folders(self, group_id, parent_folder_id=0):
        """
        Получение списка папок в библиотеке документов
        """
        try:
            url = f"{self.base_url}/api/jsonws/dlapp/get-folders"
            params = {
                'groupId': group_id,
                'parentFolderId': parent_folder_id,
                'start': -1,
                'end': -1
            }
            
            response = self.session.post(url, data=params)
            
            if response.status_code == 200:
                folders = response.json()
                print(f"✓ Найдено папок в библиотеке документов: {len(folders)}")
                
                for i, folder in enumerate(folders[:10], 1):
                    folder_id = folder.get('folderId')
                    folder_name = folder.get('name')
                    print(f"  {i:2d}. ID папки: {folder_id}, Название: {folder_name}")
                
                return folders
            else:
                print(f"✗ Ошибка получения папок: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"✗ Ошибка: {e}")
            return []
    
    def upload_file(self, file_path, repository_id, folder_id=0, 
                   description="", change_log="Загружено через API"):
        """
        Загрузка файла в Liferay 7.2 через JSON Web Services
        
        Параметры:
        - file_path: путь к файлу
        - repository_id: ID репозитория (обычно groupId сайта)
        - folder_id: ID папки (0 для корневой)
        - description: описание файла
        - change_log: комментарий к изменению
        """
        try:
            if not os.path.exists(file_path):
                print(f"✗ Файл не найден: {file_path}")
                return None
            
            # Читаем и кодируем файл в base64
            with open(file_path, 'rb') as f:
                file_content = base64.b64encode(f.read()).decode('utf-8')
            
            # Получаем MIME-тип
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                mime_type = 'application/octet-stream'
            
            # Имя файла без пути
            filename = os.path.basename(file_path)
            title = os.path.splitext(filename)[0]  # Название без расширения
            
            # Параметры для загрузки файла
            params = {
                'repositoryId': repository_id,
                'folderId': folder_id,
                'sourceFileName': filename,
                'mimeType': mime_type,
                'title': title,
                'description': description,
                'changeLog': change_log,
                'file': file_content,  # Base64 содержимое файла
                'serviceContext': '{}'  # Пустой контекст
            }
            
            print(f"\nПараметры загрузки:")
            print(f"  Файл: {filename}")
            print(f"  Репозиторий ID: {repository_id}")
            print(f"  Папка ID: {folder_id}")
            print(f"  MIME-тип: {mime_type}")
            print(f"  Размер файла: {os.path.getsize(file_path)} байт")
            
            # Отправляем запрос
            url = f"{self.base_url}/api/jsonws/dlapp/add-file-entry"
            response = self.session.post(url, data=params)
            
            print(f"Статус ответа: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✓ Файл успешно загружен!")
                print(f"  ID файла: {result.get('fileEntryId')}")
                print(f"  Название: {result.get('title')}")
                print(f"  UUID: {result.get('uuid')}")
                return result
            else:
                print(f"✗ Ошибка загрузки: {response.status_code}")
                print(f"Ответ сервера: {response.text[:500]}")
                
                # Пробуем альтернативный метод
                return self._upload_file_alternative(file_path, repository_id, folder_id, 
                                                    description, change_log)
                
        except Exception as e:
            print(f"✗ Ошибка при загрузке файла: {e}")
            return None
    
    def _upload_file_alternative(self, file_path, repository_id, folder_id, 
                                description, change_log):
        """
        Альтернативный метод загрузки файла
        """
        try:
            # Читаем файл
            with open(file_path, 'rb') as f:
                file_content = f.read()
            
            filename = os.path.basename(file_path)
            
            # Используем multipart/form-data
            files = {
                'file': (filename, file_content)
            }
            
            # Другие параметры
            data = {
                'repositoryId': str(repository_id),
                'folderId': str(folder_id),
                'sourceFileName': filename,
                'title': os.path.splitext(filename)[0],
                'description': description,
                'changeLog': change_log
            }
            
            url = f"{self.base_url}/api/jsonws/dlapp/add-file-entry"
            response = requests.post(
                url,
                auth=(self.username, self.password),
                files=files,
                data=data
            )
            
            print(f"Альтернативный метод - статус: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✓ Файл загружен альтернативным методом!")
                return result
            else:
                print(f"✗ Альтернативный метод также не сработал")
                return None
                
        except Exception as e:
            print(f"✗ Ошибка в альтернативном методе: {e}")
            return None
    
    def create_folder(self, repository_id, parent_folder_id, folder_name, description=""):
        """
        Создание папки в библиотеке документов
        """
        try:
            url = f"{self.base_url}/api/jsonws/dlapp/add-folder"
            
            params = {
                'repositoryId': repository_id,
                'parentFolderId': parent_folder_id,
                'name': folder_name,
                'description': description,
                'serviceContext': '{}'
            }
            
            response = self.session.post(url, data=params)
            
            if response.status_code == 200:
                folder_info = response.json()
                print(f"✓ Создана папка: {folder_name} (ID: {folder_info.get('folderId')})")
                return folder_info
            else:
                print(f"✗ Ошибка создания папки: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"✗ Ошибка создания папки: {e}")
            return None
    
    def upload_files_batch(self, files_list, repository_id, folder_id=0, 
                          description_template="", metadata_file=None):
        """
        Пакетная загрузка файлов
        """
        print(f"\nНачинаю пакетную загрузку {len(files_list)} файлов...")
        
        successful = []
        failed = []
        
        for i, file_path in enumerate(files_list, 1):
            if os.path.exists(file_path):
                print(f"\n[{i}/{len(files_list)}] Загрузка: {os.path.basename(file_path)}")
                
                # Формируем описание
                description = description_template.format(
                    filename=os.path.basename(file_path),
                    index=i,
                    total=len(files_list)
                ) if description_template else ""
                
                # Загружаем файл
                result = self.upload_file(
                    file_path=file_path,
                    repository_id=repository_id,
                    folder_id=folder_id,
                    description=description,
                    change_log="Пакетная загрузка через API"
                )
                
                if result:
                    successful.append({
                        'filename': os.path.basename(file_path),
                        'file_entry_id': result.get('fileEntryId'),
                        'uuid': result.get('uuid')
                    })
                else:
                    failed.append(os.path.basename(file_path))
            else:
                print(f"✗ Файл не найден: {file_path}")
                failed.append(os.path.basename(file_path))
        
        # Вывод результатов
        print(f"\n{'='*60}")
        print("РЕЗУЛЬТАТЫ ПАКЕТНОЙ ЗАГРУЗКИ:")
        print(f"{'='*60}")
        print(f"Всего файлов: {len(files_list)}")
        print(f"Успешно загружено: {len(successful)}")
        print(f"Не удалось загрузить: {len(failed)}")
        
        if successful:
            print(f"\nЗагруженные файлы:")
            for item in successful:
                print(f"  - {item['filename']} (ID: {item['file_entry_id']})")
        
        if failed:
            print(f"\nФайлы с ошибками:")
            for filename in failed:
                print(f"  - {filename}")
        
        return successful


# Основной скрипт
def main():
    print("=" * 70)
    print("СКРИПТ ДЛЯ ЗАГРУЗКИ ФАЙЛОВ В LIFERAY 7.2")
    print("=" * 70)
    
    # Настройки подключения
    BASE_URL = "http://localhost:8080"
    USERNAME = "ldk99@yandex.ru"
    PASSWORD = "123"
    
    # Создаем загрузчик
    uploader = Liferay72FileUploader(BASE_URL, USERNAME, PASSWORD)
    
    # Тестируем подключение
    if not uploader.test_connection():
        print("Не удалось подключиться к Liferay")
        return
    
    # Получаем информацию о пользователе
    uploader.get_user_info()
    
    # Получаем список сайтов
    print("\n" + "=" * 70)
    print("СПИСОК ДОСТУПНЫХ САЙТОВ:")
    print("=" * 70)
    
    sites = uploader.get_sites()
    
    if not sites:
        print("Сайты не найдены")
        return
    
    # Выбираем сайт
    print("\nВыберите сайт для загрузки файлов:")
    
    site_choices = []
    for i, site in enumerate(sites[:20], 1):
        site_id = site.get('groupId') or site.get('groupKey') or site.get('id')
        site_name = site.get('name') or site.get('descriptiveName') or f"Сайт {i}"
        site_choices.append((site_id, site_name))
        print(f"{i:2d}. {site_name} (ID: {site_id})")
    
    try:
        choice = int(input("\nВведите номер сайта: "))
        if 1 <= choice <= len(site_choices):
            selected_site_id, selected_site_name = site_choices[choice - 1]
            print(f"Выбран сайт: {selected_site_name} (ID: {selected_site_id})")
        else:
            print("Некорректный выбор, используем первый сайт")
            selected_site_id, selected_site_name = site_choices[0]
    except:
        print("Использую первый сайт")
        selected_site_id, selected_site_name = site_choices[0]
    
    # Получаем папки документов
    print("\n" + "=" * 70)
    print("ПАПКИ ДОКУМЕНТОВ НА САЙТЕ:")
    print("=" * 70)
    
    folders = uploader.get_document_library_folders(selected_site_id)
    
    folder_id = 0  # По умолчанию корневая папка
    
    if folders:
        print("\nВыберите папку для загрузки:")
        print(" 0. Корневая папка (ID: 0)")
        for i, folder in enumerate(folders[:10], 1):
            folder_id_val = folder.get('folderId')
            folder_name = folder.get('name')
            print(f" {i:2d}. {folder_name} (ID: {folder_id_val})")
        
        try:
            choice = input("\nВведите номер папки (или Enter для корневой): ").strip()
            if choice.isdigit() and int(choice) > 0:
                idx = int(choice) - 1
                if idx < len(folders):
                    folder_id = folders[idx].get('folderId')
                    print(f"Выбрана папка: {folders[idx].get('name')} (ID: {folder_id})")
        except:
            pass
    
    # Создаем новую папку если нужно
    create_new = input("\nСоздать новую папку? (y/n): ").strip().lower()
    if create_new == 'y':
        folder_name = input("Введите название новой папки: ").strip()
        if folder_name:
            new_folder = uploader.create_folder(selected_site_id, folder_id, folder_name)
            if new_folder:
                folder_id = new_folder.get('folderId')
    
    # Загружаем файлы
    print("\n" + "=" * 70)
    print("ЗАГРУЗКА ФАЙЛОВ")
    print("=" * 70)
    
    # Список файлов для загрузки
    files_to_upload = [
        r"C:\Users\LDK99\Desktop\PeterhofParts\разрушения\КГИОП. Фото № 52211.jpg",
        # Добавьте другие файлы
        # r"C:\путь\к\файлу2.jpg",
        # r"C:\путь\к\файлу3.pdf",
    ]
    
    # Проверяем существование файлов
    existing_files = []
    for file_path in files_to_upload:
        if os.path.exists(file_path):
            existing_files.append(file_path)
            print(f"✓ Файл найден: {os.path.basename(file_path)}")
        else:
            print(f"✗ Файл не найден: {file_path}")
    
    if not existing_files:
        print("Нет файлов для загрузки")
        return
    
    # Загружаем файлы
    uploader.upload_files_batch(
        files_list=existing_files,
        repository_id=selected_site_id,
        folder_id=folder_id,
        description_template="Файл {filename}"
    )


# Быстрый запуск для тестирования
def quick_test():
    """
    Быстрая загрузка одного файла без дополнительных проверок
    """
    BASE_URL = "http://localhost:8080"
    USERNAME = "ldk99@yandex.ru"
    PASSWORD = "123"
    
    # ID сайта (ваш SITE_ID)
    SITE_ID = 33805  # Замените на ваш ID сайта
    
    # ID папки (0 для корневой)
    FOLDER_ID = 0
    
    # Файл для загрузки
    FILE_PATH = r"C:\Users\LDK99\Desktop\PeterhofParts\разрушения\КГИОП. Фото № 52211.jpg"
    
    if not os.path.exists(FILE_PATH):
        print(f"Файл не найден: {FILE_PATH}")
        return
    
    print("Быстрая загрузка файла...")
    
    uploader = Liferay72FileUploader(BASE_URL, USERNAME, PASSWORD)
    
    # Тестируем подключение
    if not uploader.test_connection():
        return
    
    # Загружаем файл
    result = uploader.upload_file(
        file_path=FILE_PATH,
        repository_id=SITE_ID,
        folder_id=FOLDER_ID,
        description="Тестовая загрузка файла",
        change_log="Загружено через JSON WS API"
    )
    
    if result:
        print(f"\n✓ Файл успешно загружен!")
        print(f"ID файла: {result.get('fileEntryId')}")
        print(f"Название: {result.get('title')}")
        print(f"UUID: {result.get('uuid')}")
    else:
        print("\n✗ Не удалось загрузить файл")


# Альтернативный простой метод
def simple_upload():
    """
    Самый простой метод загрузки файла
    """
    BASE_URL = "http://localhost:8080"
    USERNAME = "ldk99@yandex.ru"
    PASSWORD = "123"
    SITE_ID = 33805
    FILE_PATH = r"C:\Users\LDK99\Desktop\PeterhofParts\разрушения\КГИОП. Фото № 52211.jpg"
    
    if not os.path.exists(FILE_PATH):
        print("Файл не найден")
        return
    
    # Читаем файл
    with open(FILE_PATH, 'rb') as f:
        file_content = base64.b64encode(f.read()).decode('utf-8')
    
    # Параметры запроса
    params = {
        'repositoryId': str(SITE_ID),
        'folderId': '0',
        'sourceFileName': os.path.basename(FILE_PATH),
        'mimeType': 'image/jpeg',
        'title': os.path.splitext(os.path.basename(FILE_PATH))[0],
        'description': 'Загружено через API',
        'changeLog': 'API Upload',
        'file': file_content,
        'serviceContext': '{}'
    }
    
    url = f"{BASE_URL}/api/jsonws/dlapp/add-file-entry"
    
    try:
        response = requests.post(
            url,
            auth=(USERNAME, PASSWORD),
            data=params
        )
        
        print(f"Статус: {response.status_code}")
        print(f"Ответ: {response.text[:500]}")
        
        if response.status_code == 200:
            print("✓ Файл успешно загружен!")
            try:
                result = response.json()
                print(f"ID файла: {result.get('fileEntryId')}")
            except:
                print("Не удалось разобрать JSON ответ")
        else:
            print("✗ Ошибка загрузки")
            
    except Exception as e:
        print(f"✗ Ошибка: {e}")


if __name__ == "__main__":
    print("Выберите режим работы:")
    print("1. Полный режим с выбором сайта и папки")
    print("2. Быстрая загрузка (требует знания ID сайта)")
    print("3. Простейшая загрузка одного файла")
    
    choice = input("\nВведите номер (1-3): ").strip()
    
    if choice == "1":
        main()
    elif choice == "2":
        quick_test()
    elif choice == "3":
        simple_upload()
    else:
        print("Запускаю быструю загрузку...")
        quick_test()