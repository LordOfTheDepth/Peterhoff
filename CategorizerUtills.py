import os
import json
import shutil
from openpyxl import load_workbook
import logging
from datetime import datetime
from ThumbnailsGenerator import ThumbnailGenerator
from DocxConverter import convert_file_to_html


def get_all_files_recursive(folder_path):

    all_files = {}
    
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            # Полный путь к файлу
            full_path = os.path.join(root, file)
            # Относительный путь от исходной папки
            rel_path = os.path.relpath(full_path, folder_path)
            all_files[full_path] = {
                'rel_path': rel_path,
                'filename': file
            }
    
    return all_files

def normalize_filename(filename):
    """Удаляет расширения изображений и оставляет только буквы и цифры"""
    # Определяем расширения файлов изображений
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp', '.svg'}
    
    # Находим расширение файла (последняя точка в имени)
    name, ext = os.path.splitext(filename)
    ext_lower = ext.lower()
    
    # Если это расширение изображения - удаляем его, иначе оставляем как есть
    if ext_lower in image_extensions:
        name_without_ext = name
    else:
        name_without_ext = filename  # Если не изображение, оставляем все имя
    
    # Создаем пустую строку для результата
    normalized_chars = []
    
    # Проходим по каждому символу
    for char in name_without_ext:
        if char.isalpha() or char.isdigit():
            normalized_chars.append(char)
    
    # Объединяем и приводим к нижнему регистру
    normalized = ''.join(normalized_chars)
    return normalized.lower()

def sanitize_folder_name(folder_name):
    """Очищает имя папки от недопустимых символов"""
    # Удаляем недопустимые символы для имен папок в Windows
    # <>:"/\|?* а также управляющие символы
    invalid_chars = '<>:"/\\|?*\n'
    for char in invalid_chars:
        folder_name = folder_name.replace(char, '')
    
    # Удаляем начальные и конечные пробелы и точки
    folder_name = folder_name.strip(' .')
    
    # Если после очистки имя пустое, используем имя листа
    if not folder_name:
        return "Без_названия"
    
    return folder_name

def get_base_dir():
    """Возвращает базовую директорию скрипта"""
    return os.path.dirname(os.path.abspath(__file__))

def resolve_relative_path(relative_path):
    """Преобразует относительный путь в абсолютный относительно директории скрипта"""
    base_dir = get_base_dir()
    # Если путь уже абсолютный, возвращаем его как есть
    if os.path.isabs(relative_path):
        return relative_path
    return os.path.join(base_dir, relative_path)

