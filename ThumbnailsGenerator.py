from PIL import Image
import os
from pathlib import Path
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ThumbnailGenerator:
    def __init__(self, max_size=(200, 200), quality=85, format='JPEG'):
        """
        Инициализация генератора миниатюр
        
        Args:
            max_size (tuple): Максимальные размеры миниатюры (ширина, высота)
            quality (int): Качество сжатия JPEG (1-100)
            format (str): Формат сохранения ('JPEG', 'PNG', 'WEBP')
        """
        self.max_size = max_size
        self.quality = quality
        self.format = format
        
        # Поддерживаемые форматы изображений
        self.supported_formats = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'}
    
    def createThumbnail(self, image_path, output_folder):
        """
        Создает миниатюру из изображения и сохраняет в указанную папку
        
        Args:
            image_path (str): Путь к исходному изображению
            output_folder (str): Папка для сохранения миниатюры
            
        Returns:
            str: Путь к созданной миниатюре или None в случае ошибки
        """
        try:
            # Проверяем существование файла
            if not os.path.exists(image_path):
                logger.error(f"Файл не найден: {image_path}")
                return None
            
            # Проверяем расширение файла
            file_ext = os.path.splitext(image_path)[1].lower()
            if file_ext not in self.supported_formats:
                logger.error(f"Неподдерживаемый формат файла: {file_ext}")
                return None
            
            # Создаем выходную папку, если ее нет
            os.makedirs(output_folder, exist_ok=True)
            
            # Получаем имя файла без пути
            filename = os.path.basename(image_path)
            
            # Создаем путь для сохранения миниатюры
            output_path = os.path.join(output_folder, filename)
            
            # Открываем изображение
            with Image.open(image_path) as img:
                # Конвертируем в RGB если нужно (для JPEG)
                if self.format == 'JPEG' and img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Создаем миниатюру
                img.thumbnail(self.max_size, Image.Resampling.LANCZOS)
                
                # Сохраняем миниатюру
                if self.format == 'JPEG':
                    img.save(output_path, self.format, quality=self.quality, optimize=True)
                elif self.format == 'PNG':
                    img.save(output_path, self.format, optimize=True)
                else:
                    img.save(output_path, self.format, quality=self.quality)
                
                logger.info(f"Создана миниатюра: {output_path} ({img.width}x{img.height})")
                return output_path
                
        except Exception as e:
            logger.error(f"Ошибка при создании миниатюры для {image_path}: {e}")
            return None
    
    def createThumbnailFromFolder(self, input_folder, output_folder, recursive=False):
        """
        Создает миниатюры для всех изображений в папке
        
        Args:
            input_folder (str): Папка с исходными изображениями
            output_folder (str): Папка для сохранения миниатюр
            recursive (bool): Обрабатывать ли подпапки рекурсивно
            
        Returns:
            list: Список путей к созданным миниатюрам
        """
        created_thumbnails = []
        
        try:
            if not os.path.exists(input_folder):
                logger.error(f"Исходная папка не найдена: {input_folder}")
                return created_thumbnails
            
            # Создаем выходную папку
            os.makedirs(output_folder, exist_ok=True)
            
            if recursive:
                # Рекурсивный обход папок
                for root, dirs, files in os.walk(input_folder):
                    # Определяем соответствующую структуру папок в output
                    rel_path = os.path.relpath(root, input_folder)
                    current_output_folder = os.path.join(output_folder, rel_path)
                    
                    for file in files:
                        file_ext = os.path.splitext(file)[1].lower()
                        if file_ext in self.supported_formats:
                            input_path = os.path.join(root, file)
                            thumbnail_path = self.createThumbnail(input_path, current_output_folder)
                            if thumbnail_path:
                                created_thumbnails.append(thumbnail_path)
            else:
                # Только файлы в корневой папке
                for file in os.listdir(input_folder):
                    file_path = os.path.join(input_folder, file)
                    if os.path.isfile(file_path):
                        file_ext = os.path.splitext(file)[1].lower()
                        if file_ext in self.supported_formats:
                            thumbnail_path = self.createThumbnail(file_path, output_folder)
                            if thumbnail_path:
                                created_thumbnails.append(thumbnail_path)
            
            logger.info(f"Создано миниатюр: {len(created_thumbnails)}")
            return created_thumbnails
            
        except Exception as e:
            logger.error(f"Ошибка при обработке папки {input_folder}: {e}")
            return created_thumbnails


# Пример использования
if __name__ == "__main__":
    # Создаем экземпляр генератора
    thumbnail_generator = ThumbnailGenerator(
        max_size=(300, 300),  # Максимальный размер 300x300 пикселей
        quality=90,           # Качество 90%
        format='JPEG'         # Формат JPEG
    )
    
    # Пример 1: Создание миниатюры для одного файла
    thumbnail_path = thumbnail_generator.createThumbnail(
        image_path="путь/к/изображению.jpg",
        output_folder="путь/к/миниатюрам"
    )
    
    # Пример 2: Создание миниатюр для всех изображений в папке
    thumbnails = thumbnail_generator.createThumbnailFromFolder(
        input_folder="путь/к/папке/с/изображениями",
        output_folder="путь/к/папке/с/миниатюрами",
        recursive=True  # Обрабатывать подпапки
    )
    
    # Пример 3: Генератор с другими настройками
    generator_webp = ThumbnailGenerator(
        max_size=(150, 150),
        quality=80,
        format='WEBP'
    )