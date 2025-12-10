"""
Liferay File Uploader - Пакет для загрузки файлов в Liferay через API
"""

__version__ = "1.0.0"
__author__ = "Your Name"
__email__ = "your.email@example.com"

from .liferay_client import LiferayClient
from .site_manager import SiteManager
from .file_uploader import FileUploader
from .utils import (
    setup_logging,
    validate_file_path,
    get_file_info,
    read_metadata_file,
    create_progress_bar,
    yes_no_prompt,
    select_from_list
)
from .config import (
    get_config,
    load_config_from_file,
    save_config_to_file,
    DEFAULT_CONFIG
)

__all__ = [
    'LiferayClient',
    'SiteManager', 
    'FileUploader',
    'setup_logging',
    'validate_file_path',
    'get_file_info',
    'read_metadata_file',
    'create_progress_bar',
    'yes_no_prompt',
    'select_from_list',
    'get_config',
    'load_config_from_file',
    'save_config_to_file',
    'DEFAULT_CONFIG'
]