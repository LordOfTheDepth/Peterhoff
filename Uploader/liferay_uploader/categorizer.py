import os
import shutil
import re
import pandas as pd
from pathlib import Path
import unicodedata


def normalize_text(text):
    """
    Нормализует текст: оставляет только буквы и цифры, приводит к нижнему регистру.
    
    Параметры:
    - text: строка для нормализации
    
    Возвращает:
    - нормализованную строку (только буквы и цифры в нижнем регистре)
    """
    if not isinstance(text, str):
        text = str(text)
    
    # Приводим к нижнему регистру
    text = text.lower()
    
    # Удаляем все небуквенно-цифровые символы (включая пробелы, пунктуацию и т.д.)
    # Используем регулярное выражение: оставляем только буквы, цифры и кириллические символы
    # [^a-zа-яё0-9] означает "все символы, НЕ являющиеся a-z, а-я, ё или 0-9"
    normalized = re.sub(r'[^a-zа-яё0-9]', '', text)
    
    return normalized


def normalize_filename(filename):
    """
    Нормализует имя файла: убирает расширение, нормализует текст.
    
    Параметры:
    - filename: имя файла
    
    Возвращает:
    - нормализованное имя файла (без расширения, только буквы и цифры)
    """
    # Убираем расширение файла
    filename_without_ext = os.path.splitext(filename)[0]
    
    # Нормализуем текст
    return normalize_text(filename_without_ext)


def find_matching_name(file_normalized, excel_names_normalized_dict):
    """
    Находит совпадение нормализованного имени файла в словаре нормализованных имен из Excel.
    
    Параметры:
    - file_normalized: нормализованное имя файла
    - excel_names_normalized_dict: словарь {нормализованное_имя: оригинальное_имя}
    
    Возвращает:
    - оригинальное имя из Excel, если найдено совпадение, иначе None
    """
    # Проверяем прямое совпадение
    if file_normalized in excel_names_normalized_dict:
        return excel_names_normalized_dict[file_normalized]
    
    # Дополнительная проверка: если нормализованное имя файла содержится в нормализованном имени из Excel
    for excel_normalized, excel_original in excel_names_normalized_dict.items():
        if file_normalized in excel_normalized or excel_normalized in file_normalized:
            return excel_original
    
    return None


def move_files_based_on_excel(source_folder, excel_path, target_folder, excel_column=0, sheet_name=0):
    """
    Сравнивает названия файлов с данными в Excel и перемещает совпадающие файлы.
    Сравнение происходит только по буквам и цифрам, игнорируя пробелы, пунктуацию и регистр.
    
    Параметры:
    - source_folder: папка с исходными файлами
    - excel_path: путь к Excel файлу
    - target_folder: папка для перемещения файлов
    - excel_column: номер столбца в Excel (по умолчанию первый столбец, 0-based)
    - sheet_name: имя листа в Excel (по умолчанию первый лист)
    """
    
    # Создаем целевую папку, если она не существует
    Path(target_folder).mkdir(parents=True, exist_ok=True)
    
    try:
        # Загружаем данные из Excel
        print(f"Чтение Excel файла: {excel_path}")
        if excel_path.endswith('.xlsx'):
            df = pd.read_excel(excel_path, sheet_name=sheet_name, header=None, dtype=str)
        elif excel_path.endswith('.csv'):
            df = pd.read_csv(excel_path, header=None, dtype=str)
        else:
            print(f"Неподдерживаемый формат файла: {excel_path}")
            return
        
        # Получаем список названий из указанного столбца Excel
        excel_names = df.iloc[:, excel_column].dropna().astype(str).tolist()
        
        print(f"Найдено {len(excel_names)} названий в Excel файле")
        print(f"Примеры оригинальных названий: {excel_names[:10]}")
        
        # Создаем словарь нормализованных имен
        # Ключ: нормализованное имя, Значение: оригинальное имя из Excel
        excel_names_normalized_dict = {}
        for name in excel_names:
            normalized = normalize_text(name)
            if normalized:  # Добавляем только если после нормализации что-то осталось
                excel_names_normalized_dict[normalized] = name
        
        print(f"Уникальных нормализованных названий: {len(excel_names_normalized_dict)}")
        print(f"Примеры нормализованных названий: {list(excel_names_normalized_dict.keys())[:10]}")
        
        # Получаем список файлов в исходной папке
        files_in_folder = os.listdir(source_folder)
        print(f"Найдено {len(files_in_folder)} файлов в исходной папке")
        
        moved_count = 0
        skipped_count = 0
        matches = []
        
        # Проходим по всем файлам в исходной папке
        for filename in files_in_folder:
            file_path = os.path.join(source_folder, filename)
            
            # Пропускаем папки, работаем только с файлами
            if os.path.isfile(file_path):
                # Нормализуем имя файла (без расширения)
                file_normalized = normalize_filename(filename)
                
                # Ищем совпадение
                matching_excel_name = find_matching_name(file_normalized, excel_names_normalized_dict)
                
                if matching_excel_name:
                    # Формируем путь для целевого файла
                    target_path = os.path.join(target_folder, filename)
                    
                    try:
                        # Копируем файл (можно заменить на shutil.move для перемещения)
                        shutil.copy2(file_path, target_path)
                        matches.append((filename, matching_excel_name))
                        print(f"✓ Совпадение: '{filename}' -> '{matching_excel_name}'")
                        moved_count += 1
                    except Exception as copy_error:
                        print(f"✗ Ошибка копирования {filename}: {copy_error}")
                else:
                    skipped_count += 1
                    # Выводим отладочную информацию для первых 10 пропущенных файлов
                    if skipped_count <= 10:
                        print(f"✗ Не найдено: '{filename}' (нормализовано: '{file_normalized}')")
        
        # Выводим подробный отчет о совпадениях
        print(f"\n{'='*60}")
        print("ДЕТАЛЬНЫЙ ОТЧЕТ О СОВПАДЕНИЯХ:")
        print(f"{'='*60}")
        for i, (filename, excel_name) in enumerate(matches, 1):
            print(f"{i:3d}. Файл: '{filename}'")
            print(f"     Совпало с: '{excel_name}'")
            print(f"     Нормализованные: '{normalize_filename(filename)}' == '{normalize_text(excel_name)}'")
        
        print(f"\n{'='*60}")
        print("ИТОГИ:")
        print(f"{'='*60}")
        print(f"Всего файлов в папке: {len(files_in_folder)}")
        print(f"Найдено совпадений: {moved_count}")
        print(f"Файлов без совпадений: {skipped_count}")
        
        if moved_count == 0:
            print(f"\nСОВЕТЫ:")
            print("1. Проверьте, что названия в Excel действительно содержат имена файлов")
            print("2. Пример нормализации:")
            print("   - Оригинал: 'File-Name_123.jpg'")
            print("   - Нормализовано: 'filename123'")
            print("3. Убедитесь, что выбран правильный столбец в Excel (столбец {excel_column})")
            print("4. Попробуйте другой столбец или лист в Excel")
        
    except Exception as e:
        print(f"Произошла ошибка: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


def find_partial_matches(source_folder, excel_path, output_file="совпадения.txt", excel_column=0, sheet_name=0):
    """
    Находит частичные совпадения между файлами и названиями из Excel.
    Полезно для отладки, когда полных совпадений нет.
    
    Параметры:
    - source_folder: папка с файлами
    - excel_path: путь к Excel файлу
    - output_file: файл для сохранения результатов
    - excel_column: номер столбца в Excel
    - sheet_name: имя листа в Excel
    """
    try:
        # Загружаем данные из Excel
        if excel_path.endswith('.xlsx'):
            df = pd.read_excel(excel_path, sheet_name=sheet_name, header=None, dtype=str)
        elif excel_path.endswith('.csv'):
            df = pd.read_csv(excel_path, header=None, dtype=str)
        
        excel_names = df.iloc[:, excel_column].dropna().astype(str).tolist()
        
        # Нормализуем имена из Excel
        excel_normalized_dict = {}
        for name in excel_names:
            norm = normalize_text(name)
            if norm:
                excel_normalized_dict[norm] = name
        
        # Получаем файлы
        files = [f for f in os.listdir(source_folder) if os.path.isfile(os.path.join(source_folder, f))]
        
        # Ищем частичные совпадения
        results = []
        for filename in files:
            file_norm = normalize_filename(filename)
            
            best_match = None
            best_score = 0
            
            for excel_norm, excel_orig in excel_normalized_dict.items():
                # Вычисляем сходство по длине общего подстроки
                common_len = 0
                if file_norm in excel_norm:
                    common_len = len(file_norm)
                elif excel_norm in file_norm:
                    common_len = len(excel_norm)
                else:
                    # Ищем максимальную общую подстроку
                    for i in range(len(file_norm)):
                        for j in range(len(excel_norm)):
                            k = 0
                            while (i + k < len(file_norm) and 
                                   j + k < len(excel_norm) and 
                                   file_norm[i + k] == excel_norm[j + k]):
                                k += 1
                            if k > common_len:
                                common_len = k
                
                if common_len > best_score:
                    best_score = common_len
                    best_match = (excel_orig, excel_norm, common_len)
            
            if best_match and best_score >= 3:  # Минимум 3 общих символа
                results.append((filename, file_norm, best_match[0], best_match[1], best_score))
        
        # Сохраняем результаты
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("Частичные совпадения файлов с Excel:\n")
            f.write("=" * 80 + "\n\n")
            
            for filename, file_norm, excel_orig, excel_norm, score in sorted(results, key=lambda x: x[4], reverse=True):
                f.write(f"Файл: {filename}\n")
                f.write(f"Нормализовано: {file_norm}\n")
                f.write(f"Excel: {excel_orig}\n")
                f.write(f"Нормализовано Excel: {excel_norm}\n")
                f.write(f"Общих символов: {score}\n")
                f.write("-" * 80 + "\n")
        
        print(f"\nНайдено {len(results)} возможных частичных совпадений")
        print(f"Результаты сохранены в {output_file}")
        
    except Exception as e:
        print(f"Ошибка при поиске частичных совпадений: {e}")


# Пример использования
if __name__ == "__main__":
    # Настройки путей (измените на свои)
    SOURCE_FOLDER = "C:/Users/LDK99/Desktop/PeterhofParts/восстановление"
    EXCEL_FILE = "C:/Users/LDK99/Desktop/PeterhofParts/восстановление/восстановление_подписи_текст.xlsx"
    TARGET_FOLDER = "C:/Users/LDK99/Desktop/PeterhofParts/восстановление/КГИОП"
    
    # Проверяем существование исходной папки
    if not os.path.exists(SOURCE_FOLDER):
        print(f"Исходная папка не существует: {SOURCE_FOLDER}")
    elif not os.path.exists(EXCEL_FILE):
        print(f"Excel файл не существует: {EXCEL_FILE}")
    else:
        print("=" * 60)
        print("СКРИПТ ДЛЯ ПОИСКА И ПЕРЕМЕЩЕНИЯ ФАЙЛОВ ПО СОВПАДЕНИЯМ")
        print("=" * 60)
        print("ПРАВИЛА СРАВНЕНИЯ:")
        print("- Игнорируются пробелы, знаки пунктуации, тире, подчеркивания")
        print("- Игнорируется регистр (все приводится к нижнему)")
        print("- Сравниваются только буквы и цифры")
        print("- У файлов игнорируются расширения (.jpg, .png и т.д.)")
        print("=" * 60)
        
        # Используем основную функцию
        move_files_based_on_excel(
            source_folder=SOURCE_FOLDER,
            excel_path=EXCEL_FILE,
            target_folder=TARGET_FOLDER,
            excel_column=0,  # Первый столбец (A)
            sheet_name="Лист8"  # Указанный лист
        )
        
        # Для отладки можно также запустить поиск частичных совпадений
        # find_partial_matches(SOURCE_FOLDER, EXCEL_FILE, "частичные_совпадения.txt")