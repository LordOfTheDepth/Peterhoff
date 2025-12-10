import os
import re
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import logging

# Импортируем существующие модули для работы с Liferay
try:
    from liferay_uploader.liferay_client import LiferayClient
    from liferay_uploader.file_uploader import FileUploader
except ImportError:
    # Если модули не установлены, создаем заглушки
    pass


def normalize_text(text):
    """
    Нормализует текст: оставляет только буквы и цифры, приводит к нижнему регистру.
    """
    if not isinstance(text, str):
        text = str(text)
    
    text = text.lower()
    normalized = re.sub(r'[^a-zа-яё0-9]', '', text)
    
    return normalized


def normalize_filename(filename):
    """
    Нормализует имя файла: убирает расширение, нормализует текст.
    """
    filename_without_ext = os.path.splitext(filename)[0]
    return normalize_text(filename_without_ext)


class LiferayFileUploader:
    def __init__(self):
        # === КОНФИГУРАЦИЯ ДАННЫХ ===
        self.SOURCE_FOLDER = "C:/Users/LDK99/Desktop/PeterhofParts/восстановление/Нижний парк"
        self.EXCEL_FILE = "C:/Users/LDK99/Desktop/PeterhofParts/восстановление/восстановление_подписи_текст.xlsx"
        self.EXCEL_SHEET = "Лист6"  # Название листа в Excel
        self.NAME_COLUMN = 0  # Столбец с именами (0-based, обычно 0 = столбец A)
        self.DESC_COLUMN = 1  # Столбец с описаниями (0-based, 1 = столбец B)
        
        # === КОНФИГУРАЦИЯ LIFERAY ===
        self.LIFERAY_URL = "http://localhost:8080"  # URL вашего сервера Liferay
        self.USERNAME = "ldk99@yandex.ru"  # Имя пользователя Liferay
        self.PASSWORD = "123"  # Пароль Liferay
        
        # ID сайта и папки на Liferay
        self.SITE_ID = 33805  # ID сайта в Liferay (Group ID)
        self.FOLDER_ID = 55274  # ID папки (0 для корневой папки Documents and Media)
        
        # Настройка логирования
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
        # Клиент и загрузчик Liferay
        self.liferay_client = None
        self.file_uploader = None
        
        self.descriptions = {}
        
    def init_liferay_client(self):
        """Инициализация клиента Liferay."""
        try:
            self.logger.info(f"Инициализация клиента Liferay для {self.LIFERAY_URL}")
            self.liferay_client = LiferayClient(
                base_url=self.LIFERAY_URL,
                username=self.USERNAME,
                password=self.PASSWORD
            )
            
            # Проверяем подключение
            if self.liferay_client.test_connection():
                self.logger.info("✓ Подключение к Liferay успешно")
            else:
                self.logger.error("✗ Не удалось подключиться к Liferay")
                return False
            
            # Инициализируем загрузчик файлов
            self.file_uploader = FileUploader(self.liferay_client)
            self.logger.info("✓ Загрузчик файлов инициализирован")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Ошибка инициализации Liferay: {e}")
            return False
    
    def load_descriptions_from_excel(self) -> bool:
        """Загружает описания из Excel файла."""
        try:
            self.logger.info(f"Загрузка описаний из Excel файла: {self.EXCEL_FILE}")
            self.logger.info(f"Лист: {self.EXCEL_SHEET}")
            self.logger.info(f"Столбец имен: {self.NAME_COLUMN}, Столбец описаний: {self.DESC_COLUMN}")
            
            # Загружаем данные из Excel
            df = pd.read_excel(self.EXCEL_FILE, 
                              sheet_name=self.EXCEL_SHEET, 
                              header=None, 
                              dtype=str)
            
            self.logger.info(f"Загружено строк из Excel: {len(df)}")
            
            # Создаем словарь: нормализованное_имя -> описание
            for index, row in df.iterrows():
                if len(row) > max(self.NAME_COLUMN, self.DESC_COLUMN):
                    name = str(row[self.NAME_COLUMN]) if pd.notna(row[self.NAME_COLUMN]) else ""
                    desc = str(row[self.DESC_COLUMN]) if pd.notna(row[self.DESC_COLUMN]) else ""
                    
                    if name:  # Если есть имя
                        norm_name = normalize_text(name)
                        if norm_name and desc:  # Если есть и нормализованное имя, и описание
                            self.descriptions[norm_name] = {
                                'original_name': name,
                                'description': desc,
                                'excel_row': index + 1  # Для отладки (+1 потому что Excel строки начинаются с 1)
                            }
            
            self.logger.info(f"Загружено {len(self.descriptions)} описаний из Excel")
            
            # Показываем примеры
            if self.descriptions:
                self.logger.info("Примеры загруженных описаний:")
                for i, (norm_name, data) in enumerate(list(self.descriptions.items())[:5]):
                    self.logger.info(f"  {i+1}. '{data['original_name']}' -> '{data['description'][:50]}...'")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Ошибка при загрузке Excel файла: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def find_description_for_file(self, filename: str) -> Optional[str]:
        """Находит описание для файла в загруженных данных."""
        # Нормализуем имя файла
        file_norm = normalize_filename(filename)
        
        # Прямое совпадение
        if file_norm in self.descriptions:
            return self.descriptions[file_norm]['description']
        
        # Частичное совпадение: проверяем, содержится ли имя файла в именах из Excel или наоборот
        for norm_name, data in self.descriptions.items():
            if file_norm in norm_name or norm_name in file_norm:
                return data['description']
        
        return None
    
    def upload_file_to_liferay(self, file_path: str, description: str) -> Tuple[bool, str]:
        """
        Загружает файл на сервер Liferay с описанием.
        
        Использует существующий механизм из file_uploader.py
        """
        try:
            if not self.file_uploader:
                return False, "Загрузчик Liferay не инициализирован"
            
            # Используем метод upload_or_replace_file из FileUploader
            result = self.file_uploader.upload_or_replace_file(
                file_path=file_path,
                site_id=self.SITE_ID,
                folder_id=self.FOLDER_ID,
                description=description,
                replace_existing=True,  # Заменять существующие файлы
                change_log="Загружено через скрипт с описанием"
            )
            
            if result:
                file_entry_id = result.get('fileEntryId', 'N/A')
                file_name = result.get('title', os.path.basename(file_path))
                return True, f"Успешно загружен (ID: {file_entry_id})"
            else:
                return False, "Не удалось загрузить файл"
                
        except Exception as e:
            return False, f"Ошибка загрузки: {type(e).__name__}: {str(e)[:100]}"
    
    def upload_files_batch_to_liferay(self, files_with_descriptions: Dict[str, str]) -> Dict:
        """
        Пакетная загрузка файлов на Liferay с описаниями.
        
        Args:
            files_with_descriptions: Словарь {имя_файла: описание}
            
        Returns:
            Словарь с результатами
        """
        if not self.file_uploader:
            return {'error': 'Загрузчик Liferay не инициализирован'}
        
        # Подготавливаем список файлов для загрузки
        files_list = []
        metadata = {}
        
        for filename, description in files_with_descriptions.items():
            file_path = os.path.join(self.SOURCE_FOLDER, filename)
            if os.path.exists(file_path):
                files_list.append(file_path)
                metadata[filename] = {'description': description}
        
        if not files_list:
            return {'error': 'Нет файлов для загрузки'}
        
        # Используем метод upload_files_batch из FileUploader
        results = self.file_uploader.upload_files_batch(
            files_list=files_list,
            site_id=self.SITE_ID,
            folder_id=self.FOLDER_ID,
            description_template="",  # Описания уже есть в metadata
            replace_existing=True,
            metadata=metadata
        )
        
        return results
    
    def process_files(self):
        """Основная функция обработки файлов."""
        print("=" * 80)
        print("СКРИПТ ДЛЯ ЗАГРУЗКИ ФАЙЛОВ НА LIFERAY С ОПИСАНИЯМИ")
        print("=" * 80)
        print(f"Исходная папка: {self.SOURCE_FOLDER}")
        print(f"Excel файл: {self.EXCEL_FILE}")
        print(f"Сервер Liferay: {self.LIFERAY_URL}")
        print(f"SITE_ID: {self.SITE_ID}, FOLDER_ID: {self.FOLDER_ID}")
        print("=" * 80)
        
        # Проверяем существование папок и файлов
        if not os.path.exists(self.SOURCE_FOLDER):
            print(f"ОШИБКА: Исходная папка не существует: {self.SOURCE_FOLDER}")
            return
        
        if not os.path.exists(self.EXCEL_FILE):
            print(f"ОШИБКА: Excel файл не существует: {self.EXCEL_FILE}")
            return
        
        # Инициализируем клиент Liferay
        if not self.init_liferay_client():
            print("ОШИБКА: Не удалось инициализировать клиент Liferay")
            return
        
        # Загружаем описания из Excel
        if not self.load_descriptions_from_excel():
            print("ОШИБКА: Не удалось загрузить описания из Excel")
            return
        
        if not self.descriptions:
            print("ПРЕДУПРЕЖДЕНИЕ: Не загружено ни одного описания из Excel")
        
        # Получаем список файлов
        try:
            files = [f for f in os.listdir(self.SOURCE_FOLDER) 
                    if os.path.isfile(os.path.join(self.SOURCE_FOLDER, f))]
        except Exception as e:
            print(f"ОШИБКА при чтении папки: {e}")
            return
        
        print(f"\nНайдено {len(files)} файлов в папке")
        
        # Собираем файлы с описаниями для загрузки
        files_with_descriptions = {}
        
        print("\nПоиск описаний для файлов:")
        print("-" * 100)
        
        for filename in files:
            description = self.find_description_for_file(filename)
            if description:
                files_with_descriptions[filename] = description
                print(f"✓ {filename}: найдено описание")
            else:
                print(f"✗ {filename}: описание не найдено")
        
        print(f"\nНайдено описаний для {len(files_with_descriptions)} из {len(files)} файлов")
        
        if not files_with_descriptions:
            print("Нет файлов с описаниями для загрузки")
            return
        
        # Загружаем файлы на Liferay
        print(f"\nНачинаю загрузку файлов на Liferay...")
        print("-" * 100)
        
        # Вариант 1: Индивидуальная загрузка (с подробным выводом)
        if len(files_with_descriptions) <= 20:  # Для небольшого количества файлов
            self._upload_files_individually(files_with_descriptions)
        else:
            # Вариант 2: Пакетная загрузка (для большого количества файлов)
            results = self.upload_files_batch_to_liferay(files_with_descriptions)
            self._process_batch_results(results)
        
        # Создаем отчет
        self._generate_report(files, files_with_descriptions)
    
    def _upload_files_individually(self, files_with_descriptions: Dict[str, str]):
        """Индивидуальная загрузка файлов с подробным выводом."""
        results = {
            'uploaded': [],
            'failed': [],
            'skipped': []
        }
        
        for i, (filename, description) in enumerate(files_with_descriptions.items(), 1):
            file_path = os.path.join(self.SOURCE_FOLDER, filename)
            
            if not os.path.exists(file_path):
                results['skipped'].append((filename, "Файл не найден"))
                print(f"[{i}/{len(files_with_descriptions)}] ✗ {filename}: файл не найден")
                continue
            
            print(f"\n[{i}/{len(files_with_descriptions)}] Загрузка: {filename}")
            print(f"   Описание: {description[:100]}{'...' if len(description) > 100 else ''}")
            
            success, message = self.upload_file_to_liferay(file_path, description)
            
            if success:
                results['uploaded'].append((filename, message))
                print(f"   ✓ Успешно: {message}")
            else:
                results['failed'].append((filename, message))
                print(f"   ✗ Ошибка: {message}")
        
        self._print_individual_results(results)
    
    def _process_batch_results(self, results: Dict):
        """Обработка результатов пакетной загрузки."""
        if 'error' in results:
            print(f"Ошибка пакетной загрузки: {results['error']}")
            return
        
        print(f"\nРЕЗУЛЬТАТЫ ПАКЕТНОЙ ЗАГРУЗКИ:")
        print(f"{'='*60}")
        print(f"Всего обработано: {len(results.get('successful', [])) + len(results.get('failed', [])) + len(results.get('skipped', []))}")
        print(f"Успешно загружено: {len(results.get('successful', []))}")
        print(f"Из них заменено: {len(results.get('replaced', []))}")
        print(f"Не удалось загрузить: {len(results.get('failed', []))}")
        print(f"Пропущено: {len(results.get('skipped', []))}")
        
        if results.get('failed'):
            print(f"\nФайлы с ошибками:")
            for failed_file in results['failed'][:10]:
                print(f"  - {failed_file}")
    
    def _print_individual_results(self, results: Dict):
        """Вывод результатов индивидуальной загрузки."""
        print(f"\n{'='*60}")
        print("РЕЗУЛЬТАТЫ ЗАГРУЗКИ:")
        print(f"{'='*60}")
        print(f"Успешно загружено: {len(results['uploaded'])}")
        print(f"Не удалось загрузить: {len(results['failed'])}")
        print(f"Пропущено: {len(results['skipped'])}")
        
        if results['failed']:
            print(f"\nФайлы с ошибками:")
            for filename, error in results['failed'][:10]:
                print(f"  - {filename}: {error}")
    
    def _generate_report(self, all_files: List[str], files_with_desc: Dict[str, str]):
        """Генерирует отчет о результатах."""
        print("\n" + "=" * 80)
        print("ИТОГОВЫЙ ОТЧЕТ")
        print("=" * 80)
        print(f"Всего файлов в папке: {len(all_files)}")
        print(f"Найдено описаний в Excel: {len(self.descriptions)}")
        print(f"Файлов с описаниями: {len(files_with_desc)}")
        print(f"Файлов без описаний: {len(all_files) - len(files_with_desc)}")
        
        # Сохраняем отчет в CSV
        report_data = []
        for filename in all_files:
            has_description = filename in files_with_desc
            report_data.append({
                'Имя файла': filename,
                'Нормализованное имя': normalize_filename(filename),
                'Найдено описание': 'Да' if has_description else 'Нет',
                'Описание': files_with_desc.get(filename, 'Нет описания')[:500]
            })
        
        report_file = os.path.join(self.SOURCE_FOLDER, "отчет_liferay.csv")
        try:
            df_report = pd.DataFrame(report_data)
            df_report.to_csv(report_file, index=False, encoding='utf-8-sig')
            print(f"\nОтчет сохранен в: {report_file}")
        except Exception as e:
            print(f"\nНе удалось сохранить отчет: {e}")
        
        print("\n" + "=" * 80)
        print("КОНФИГУРАЦИЯ LIFERAY:")
        print("=" * 80)
        print(f"URL: {self.LIFERAY_URL}")
        print(f"Пользователь: {self.USERNAME}")
        print(f"SITE_ID: {self.SITE_ID}")
        print(f"FOLDER_ID: {self.FOLDER_ID}")
        print("\nДля изменения параметров отредактируйте значения в классе LiferayFileUploader.__init__()")


def main():
    """Основная функция."""
    uploader = LiferayFileUploader()
    uploader.process_files()


if __name__ == "__main__":
    main()