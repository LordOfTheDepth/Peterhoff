from PIL import Image
import os
from pathlib import Path
import logging
import warnings

# Отключаем предупреждение о decompression bomb
warnings.filterwarnings('ignore', category=Image.DecompressionBombWarning)

# Увеличиваем лимит размера изображения
Image.MAX_IMAGE_PIXELS = None  # Снимаем ограничение полностью

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ThumbnailGenerator:
    def __init__(self, max_size=(200, 200), quality=100, format='JPEG', 
                 preserve_aspect_ratio=True, upscale=False):
        """
        Инициализация генератора миниатюр
        
        Args:
            max_size (tuple): Максимальные размеры миниатюры (ширина, высота)
            quality (int): Качество сжатия JPEG (1-100)
            format (str): Формат сохранения ('JPEG', 'PNG', 'WEBP')
            preserve_aspect_ratio (bool): Сохранять ли соотношение сторон
            upscale (bool): Увеличивать ли маленькие изображения до max_size
        """
        self.max_size = max_size
        self.quality = quality
        self.format = format
        self.preserve_aspect_ratio = preserve_aspect_ratio
        self.upscale = upscale
        
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
            output_path = os.path.join(output_folder, "t_"+filename)
            
            # Открываем изображение
            with Image.open(image_path) as img:
                logger.info(f"Обрабатываю: {filename} ({img.width}x{img.height})")
                
                # Конвертируем в RGB если нужно (для JPEG)
                if self.format == 'JPEG' and img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Проверяем, нужно ли создавать миниатюру
                original_size = img.size
                
                if self.preserve_aspect_ratio:
                    # Масштабируем с сохранением пропорций
                    img.thumbnail(self.max_size, Image.Resampling.LANCZOS)
                    
                    # Если upscale=True и изображение меньше миниатюры, увеличиваем его
                    if self.upscale:
                        if img.width < self.max_size[0] and img.height < self.max_size[1]:
                            # Создаем новое изображение нужного размера с белым фоном
                            new_img = Image.new('RGB', self.max_size, (255, 255, 255))
                            
                            # Вставляем масштабированное изображение по центру
                            x_offset = (self.max_size[0] - img.width) // 2
                            y_offset = (self.max_size[1] - img.height) // 2
                            new_img.paste(img, (x_offset, y_offset))
                            img = new_img
                else:
                    # Масштабируем к точному размеру (может исказить пропорции)
                    img = img.resize(self.max_size, Image.Resampling.LANCZOS)
                
                # Сохраняем миниатюру
                save_options = {}
                if self.format == 'JPEG':
                    save_options = {'quality': self.quality, 'optimize': True}
                elif self.format == 'PNG':
                    save_options = {'optimize': True}
                elif self.format == 'WEBP':
                    save_options = {'quality': self.quality}
                
                img.save(output_path, self.format, **save_options)
                
                logger.info(f"Создана миниатюра: {output_path} ({img.width}x{img.height})")
                return output_path
                
        except MemoryError as e:
            logger.error(f"Недостаточно памяти для обработки {image_path}: {e}")
            return None
        except Exception as e:
            logger.error(f"Ошибка при создании миниатюры для {image_path}: {e}")
            return None
    
    def createThumbnailFromFolder(self, input_folder, output_folder, recursive=False, 
                                 exclude_folders=None, max_workers=None):
        """
        Создает миниатюры для всех изображений в папке
        
        Args:
            input_folder (str): Папка с исходными изображениями
            output_folder (str): Папка для сохранения миниатюр
            recursive (bool): Обрабатывать ли подпапки рекурсивно
            exclude_folders (list): Список папок для исключения
            max_workers (int): Максимальное количество потоков (None для автоматического)
            
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
                    # Исключаем указанные папки
                    if exclude_folders:
                        dirs[:] = [d for d in dirs if d not in exclude_folders]
                    
                    # Определяем соответствующую структуру папок в output

                    current_output_folder = output_folder
    
                    
                    os.makedirs(current_output_folder, exist_ok=True)
                    
                    for file in files:
                        file_ext = os.path.splitext(file)[1].lower()
                        if file_ext in self.supported_formats:
                            input_path = os.path.join(root, file)
                            output_path = os.path.join(current_output_folder, "t_"+file)
                            
                            # Пропускаем, если миниатюра уже существует
                            if os.path.exists(output_path):
                                logger.info(f"Миниатюра уже существует: {output_path}")
                                continue
                            
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
                            output_path = os.path.join(output_folder, file)
                            
                            # Пропускаем, если миниатюра уже существует
                            if os.path.exists(output_path):
                                logger.info(f"Миниатюра уже существует: {output_path}")
                                continue
                            
                            thumbnail_path = self.createThumbnail(file_path, output_folder)
                            if thumbnail_path:
                                created_thumbnails.append(thumbnail_path)
            
            logger.info(f"Создано миниатюр: {len(created_thumbnails)}")
            return created_thumbnails
            
        except Exception as e:
            logger.error(f"Ошибка при обработке папки {input_folder}: {e}")
            return created_thumbnails
    
    def batch_process(self, input_folders, output_folders, recursive=False):
        """
        Пакетная обработка нескольких папок
        
        Args:
            input_folders (list): Список путей к исходным папкам
            output_folders (list): Список путей к выходным папкам
            recursive (bool): Обрабатывать ли подпапки рекурсивно
            
        Returns:
            dict: Результаты обработки по каждой папке
        """
        results = {}
        
        for input_folder, output_folder in zip(input_folders, output_folders):
            logger.info(f"Обрабатываю папку: {input_folder} -> {output_folder}")
            
            thumbnails = self.createThumbnailFromFolder(
                input_folder=input_folder,
                output_folder=output_folder,
                recursive=recursive
            )
            
            results[input_folder] = {
                'output_folder': output_folder,
                'thumbnails_count': len(thumbnails),
                'thumbnails': thumbnails
            }
        
        return results

# Функция для быстрой обработки больших изображений
def process_large_images(input_folder, output_folder, max_size=(1000, 1000), 
                        skip_existing=True, format='JPEG'):
    """
    Функция для обработки очень больших изображений с обработкой ошибок
    
    Args:
        input_folder (str): Папка с большими изображениями
        output_folder (str): Папка для миниатюр
        max_size (tuple): Максимальный размер
        skip_existing (bool): Пропускать существующие миниатюры
        format (str): Формат сохранения
    """
    generator = ThumbnailGenerator(
        max_size=max_size,
        quality=85,
        format=format,
        preserve_aspect_ratio=True,
        upscale=False
    )
    
    # Исключаем папку с миниатюрами из обработки
    thumb_folder_name = os.path.basename(output_folder)
    
    thumbnails = generator.createThumbnailFromFolder(
        input_folder=input_folder,
        output_folder=output_folder,
        recursive=True,
        exclude_folders=[thumb_folder_name] if thumb_folder_name else None
    )
    
    return thumbnails

# Пример использования
if __name__ == "__main__":
    # Вариант 1: Для очень больших изображений (снимаем все ограничения)
    print("=== ОБРАБОТКА БОЛЬШИХ ИЗОБРАЖЕНИЙ ===")
    
    generator = ThumbnailGenerator(
        max_size=(300, 300),  # Максимальный размер 300x300 пикселей
        quality=90,           # Качество 90%
        format='JPEG',        # Формат JPEG
        preserve_aspect_ratio=True,
        upscale=False
    )
    
    # Пример 1: Создание миниатюры для одного большого файла
    thumbnail_path = generator.createThumbnail(
        image_path="путь/к/большому/изображению.tif",
        output_folder="путь/к/миниатюрам"
    )
    
    # Пример 2: Создание миниатюр для всех изображений в папке
    thumbnails = generator.createThumbnailFromFolder(
        input_folder="путь/к/папке/с/большими/изображениями",
        output_folder="путь/к/папке/с/миниатюрами",
        recursive=True,
        exclude_folders=['thumbnails', 'temp']  # Исключаем служебные папки
    )
    
    # Пример 3: Пакетная обработка нескольких папок
    input_folders = [
        "путь/к/папке1",
        "путь/к/папке2",
        "путь/к/папке3"
    ]
    
    output_folders = [
        "путь/к/миниатюрам1",
        "путь/к/миниатюрам2", 
        "путь/к/миниатюрам3"
    ]
    
    results = generator.batch_process(input_folders, output_folders, recursive=True)
    
    # Пример 4: Специальная функция для очень больших изображений
    print("\n=== ОБРАБОТКА ОЧЕНЬ БОЛЬШИХ ИЗОБРАЖЕНИЙ ===")
    
    large_thumbnails = process_large_images(
        input_folder="путь/к/папке/с/огромными/изображениями",
        output_folder="путь/к/миниатюрам/больших",
        max_size=(500, 500),  # Более крупные миниатюры для детализации
        format='JPEG'
    )
    
    print(f"Обработано {len(large_thumbnails)} больших изображений")
    
    # Сохранение отчета о выполнении
    with open("thumbnails_report.txt", "w", encoding="utf-8") as f:
        f.write("Отчет о создании миниатюр\n")
        f.write("=" * 50 + "\n\n")
        
        for folder, result in results.items():
            f.write(f"Папка: {folder}\n")
            f.write(f"Выходная папка: {result['output_folder']}\n")
            f.write(f"Создано миниатюр: {result['thumbnails_count']}\n")
            f.write(f"Миниатюры:\n")
            for thumb in result['thumbnails']:
                f.write(f"  - {thumb}\n")
            f.write("\n")
        
        if large_thumbnails:
            f.write("\nБольшие изображения:\n")
            f.write("=" * 30 + "\n")
            f.write(f"Обработано: {len(large_thumbnails)}\n")
            for thumb in large_thumbnails:
                f.write(f"  - {thumb}\n")