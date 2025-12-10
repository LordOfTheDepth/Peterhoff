"""
Вспомогательные функции и утилиты
"""

import os
import sys
import json
import logging
import logging.config
from pathlib import Path
from typing import Dict, List, Optional, Any
import mimetypes


def setup_logging(log_level: str = 'INFO', log_file: str = None):
    """
    Настройка логирования
    
    Args:
        log_level: Уровень логирования
        log_file: Путь к файлу логов
    """
    log_config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'standard': {
                'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
            'detailed': {
                'format': '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d: %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': log_level,
                'formatter': 'standard',
                'stream': sys.stdout
            }
        },
        'loggers': {
            '': {
                'handlers': ['console'],
                'level': log_level,
                'propagate': True
            }
        }
    }
    
    if log_file:
        log_config['handlers']['file'] = {
            'class': 'logging.handlers.RotatingFileHandler',
            'level': log_level,
            'formatter': 'detailed',
            'filename': log_file,
            'maxBytes': 10485760,  # 10 MB
            'backupCount': 5,
            'encoding': 'utf8'
        }
        log_config['loggers']['']['handlers'].append('file')
    
    logging.config.dictConfig(log_config)


def validate_file_path(file_path: str) -> bool:
    """
    Проверка существования файла
    
    Args:
        file_path: Путь к файлу
        
    Returns:
        True если файл существует
    """
    return os.path.exists(file_path) and os.path.isfile(file_path)


def get_file_info(file_path: str) -> Dict[str, Any]:
    """
    Получение информации о файле
    
    Args:
        file_path: Путь к файлу
        
    Returns:
        Словарь с информацией о файле
    """
    if not validate_file_path(file_path):
        return {}
    
    try:
        stat_info = os.stat(file_path)
        
        return {
            'filename': os.path.basename(file_path),
            'path': file_path,
            'size': stat_info.st_size,
            'created': stat_info.st_ctime,
            'modified': stat_info.st_mtime,
            'extension': os.path.splitext(file_path)[1],
            'mime_type': mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
        }
    except Exception as e:
        logging.getLogger(__name__).error(f"Ошибка получения информации о файле: {e}")
        return {}


def read_metadata_file(metadata_path: str) -> Dict[str, Dict]:
    """
    Чтение метаданных из файла (JSON, CSV)
    
    Args:
        metadata_path: Путь к файлу метаданных
        
    Returns:
        Словарь метаданных (filename -> metadata_dict)
    """
    if not os.path.exists(metadata_path):
        return {}
    
    try:
        ext = os.path.splitext(metadata_path)[1].lower()
        
        if ext == '.json':
            with open(metadata_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        elif ext == '.csv':
            import pandas as pd
            df = pd.read_csv(metadata_path)
            metadata = {}
            
            for _, row in df.iterrows():
                filename = str(row.get('filename', '')).strip()
                if filename:
                    metadata[filename] = {
                        'title': str(row.get('title', '')).strip(),
                        'description': str(row.get('description', '')).strip(),
                        'tags': str(row.get('tags', '')).split(',') if 'tags' in row else []
                    }
            return metadata
            
        else:
            logging.getLogger(__name__).warning(f"Неподдерживаемый формат файла метаданных: {ext}")
            return {}
            
    except Exception as e:
        logging.getLogger(__name__).error(f"Ошибка чтения файла метаданных: {e}")
        return {}


def create_progress_bar(iteration: int, total: int, length: int = 50) -> str:
    """
    Создание текстового progress bar
    
    Args:
        iteration: Текущая итерация
        total: Общее количество
        length: Длина progress bar
        
    Returns:
        Строка с progress bar
    """
    percent = ("{0:.1f}").format(100 * (iteration / float(total)))
    filled_length = int(length * iteration // total)
    bar = '█' * filled_length + '░' * (length - filled_length)
    return f"|{bar}| {percent}% ({iteration}/{total})"


def yes_no_prompt(question: str, default: bool = True) -> bool:
    """
    Вопрос с ответом Да/Нет
    
    Args:
        question: Текст вопроса
        default: Значение по умолчанию
        
    Returns:
        True если ответ Да
    """
    prompt = f"{question} {'[Y/n]' if default else '[y/N]'}: "
    
    while True:
        answer = input(prompt).strip().lower()
        
        if not answer:
            return default
        elif answer in ['y', 'yes', 'да', 'д']:
            return True
        elif answer in ['n', 'no', 'нет', 'н']:
            return False
        else:
            print("Пожалуйста, введите 'y' или 'n'")


def select_from_list(items: List[Any], prompt: str = "Выберите номер") -> Optional[int]:
    """
    Выбор элемента из списка
    
    Args:
        items: Список элементов
        prompt: Текст подсказки
        
    Returns:
        Выбранный индекс или None
    """
    if not items:
        return None
    
    print(f"\n{prompt}:")
    for i, item in enumerate(items, 1):
        print(f"{i:3d}. {item}")
    
    while True:
        try:
            choice = input(f"\nВведите номер (1-{len(items)}): ").strip()
            
            if not choice:
                return None
            
            idx = int(choice) - 1
            if 0 <= idx < len(items):
                return idx
            else:
                print(f"Пожалуйста, введите число от 1 до {len(items)}")
        except ValueError:
            print("Пожалуйста, введите число")