"""
Конфигурация подключения к Liferay
"""

# Настройки подключения по умолчанию
DEFAULT_CONFIG = {
    'base_url': 'http://localhost:8080',
    'username': 'ldk99@yandex.ru',
    'password': '123',
    'timeout': 30,
    'verify_ssl': False,  # Для самоподписанных сертификатов
}

# ID сайта по умолчанию (если известен)
DEFAULT_SITE_ID = 33805
DEFAULT_FOLDER_ID = 0  # Корневая папка

# Пути для логирования
LOG_CONFIG = {
    'log_file': 'liferay_uploader.log',
    'log_level': 'INFO',  # DEBUG, INFO, WARNING, ERROR
    'max_file_size': 10485760,  # 10 MB
    'backup_count': 5
}

# Настройки для пакетной загрузки
BATCH_CONFIG = {
    'max_retries': 3,
    'retry_delay': 2,  # секунды
    'chunk_size': 5242880,  # 5 MB для больших файлов
    'max_workers': 4,  # для параллельной загрузки
}


def load_config_from_file(config_path='config.json'):
    """
    Загрузка конфигурации из JSON файла
    """
    import json
    import os
    
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            print(f"✓ Конфигурация загружена из {config_path}")
            return config
        except Exception as e:
            print(f"✗ Ошибка загрузки конфигурации: {e}")
    
    return DEFAULT_CONFIG


def save_config_to_file(config, config_path='config.json'):
    """
    Сохранение конфигурации в JSON файл
    """
    import json
    
    try:
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        print(f"✓ Конфигурация сохранена в {config_path}")
        return True
    except Exception as e:
        print(f"✗ Ошибка сохранения конфигурации: {e}")
        return False


def get_config():
    """
    Получение конфигурации (из файла или дефолтной)
    """
    config = load_config_from_file()
    if not config:
        config = DEFAULT_CONFIG.copy()
    
    # Обновляем значения из переменных окружения
    import os
    env_mapping = {
        'LIFERAY_URL': 'base_url',
        'LIFERAY_USERNAME': 'username',
        'LIFERAY_PASSWORD': 'password'
    }
    
    for env_var, config_key in env_mapping.items():
        env_value = os.getenv(env_var)
        if env_value:
            config[config_key] = env_value
    
    return config