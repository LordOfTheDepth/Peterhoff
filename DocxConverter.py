import re
from pathlib import Path
import zipfile
import xml.etree.ElementTree as ET
import os
import json
import shutil
from openpyxl import load_workbook
import logging

class DocxConverter:
    def __init__(self, file_path):
        """
        Инициализирует конвертер с указанным путем к файлу.
        
        Args:
            file_path (str or Path): Путь к файлу для конвертации (.txt или .docx).
        """
        self.file_path = Path(file_path)
        
    def read_text_file(self):
        """
        Читает содержимое текстового файла (.txt).
        
        Returns:
            str: Текст из файла.
            
        Raises:
            FileNotFoundError: Если файл не найден.
        """
        if not self.file_path.exists():
            raise FileNotFoundError(f"Файл не найден: {self.file_path}")
        
        encodings = ['utf-8', 'cp1251', 'latin-1', 'iso-8859-1']
        
        for encoding in encodings:
            try:
                with open(self.file_path, 'r', encoding=encoding) as file:
                    return file.read()
            except UnicodeDecodeError:
                continue
        
        # Если ни одна кодировка не подошла, попробуем прочитать как бинарный и декодировать с ошибками
        with open(self.file_path, 'rb') as file:
            return file.read().decode('utf-8', errors='ignore')
    
    def read_docx_file(self):
        """
        Читает содержимое файла .docx.
        
        Returns:
            str: Текст из файла .docx.
            
        Raises:
            ValueError: Если файл не является валидным .docx.
        """
        try:
            # Открываем .docx как ZIP архив
            with zipfile.ZipFile(self.file_path) as docx:
                # Извлекаем основной документ
                document_content = docx.read('word/document.xml')
                
                # Парсим XML
                root = ET.fromstring(document_content)
                
                # Находим все текстовые элементы
                namespaces = {
                    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
                }
                
                # Собираем текст из всех параграфов
                text_parts = []
                for paragraph in root.findall('.//w:p', namespaces):
                    paragraph_text = []
                    for text_element in paragraph.findall('.//w:t', namespaces):
                        if text_element.text:
                            paragraph_text.append(text_element.text)
                    
                    if paragraph_text:
                        text_parts.append(''.join(paragraph_text))
                
                return '\n'.join(text_parts)
                
        except (zipfile.BadZipFile, KeyError) as e:
            raise ValueError(f"Файл не является валидным .docx: {e}")
        except ET.ParseError as e:
            raise ValueError(f"Ошибка при парсинге XML .docx файла: {e}")
    
    def read_file(self):
        """
        Читает файл в зависимости от его расширения.
        
        Returns:
            str: Текст из файла.
        """
        suffix = self.file_path.suffix.lower()
        
        if suffix == '.txt':
            return self.read_text_file()
        elif suffix == '.docx':
            return self.read_docx_file()
        else:
            # Пробуем сначала как текстовый, потом как .docx
            try:
                return self.read_text_file()
            except:
                try:
                    return self.read_docx_file()
                except:
                    raise ValueError(f"Неподдерживаемый формат файла: {suffix}")
    
    
    
    def save_html(self, output_path=None):
        """
        Конвертирует текст в HTML и сохраняет в файл.
        
        Args:
            output_path (str or Path, optional): Путь для сохранения HTML файла.
                Если None, сохраняет в той же папке с тем же именем, но расширением .html
                
        Returns:
            Path: Путь к сохраненному файлу.
        """
        html_content = self.convert_to_html()
        
        if output_path is None:
            output_path = self.file_path.with_suffix('.html')
        
        output_path = Path(output_path)
        
        # Создаем директорию, если она не существует
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as file:
            file.write(html_content)
        
        return output_path
    def convert_to_html(self, text=None):
        """
        Конвертирует текст в HTML формат.
        
        Args:
            text (str, optional): Текст для конвертации. Если None, читает из файла.
            
        Returns:
            str: HTML представление текста (только содержимое).
        """
        if text is None:
            text = self.read_file()
        text = format_text_to_html(text)
        # Убираем лишние пробелы и разделяем на строки
        lines = [line.strip() for line in text.split('<br>')]
        lines = [line for line in lines if line]  # Убираем пустые строки
        
        if not lines:
            return ""
        
        # Первая непустая строка - заголовок
        title = lines[0]
        
        # Проверяем вторую строку (если она есть) - начинается ли она с "(" и заканчивается ")"
        if len(lines) > 1 and lines[1].startswith('(') and lines[1].endswith(')'):
            title += f'<br>{lines[1]}'  # Добавляем вторую строку к заголовку
            # Убираем первую и вторую строки из основного текста
            remaining_lines = lines[2:]
        else:
            # Убираем только первую строку
            remaining_lines = lines[1:]
        
        html_parts = [f'<h1 class="header-content align-center">{title}</h1>']
        
        # Добавляем основную часть
        html_parts.append('<div class="main-text-content align-justify size-medium">')
        
        # Обрабатываем остальные строки (абзацы)
        for line in remaining_lines:
            if line.strip():  # Пропускаем пустые строки
                html_parts.append(f'<p>{line}</p>')
        
        html_parts.append('</div>')
        
        # Возвращаем только HTML контент (без DOCTYPE, html, head, body и стилей)
        return '\n'.join(html_parts)
    
def convert_file_to_html(file_path, output_path=None):
    """
    Функция для быстрой конвертации файла в HTML.
    
    Args:
        file_path (str or Path): Путь к исходному файлу (.txt или .docx).
        output_path (str or Path, optional): Путь для сохранения HTML файла.
        
    Returns:
        Path: Путь к сохраненному HTML файлу.
    """
    converter = DocxConverter(file_path)
    return converter.save_html(output_path)

    
        
def convert_docx_in_folder(source_folder, target_folder):
    """
    Ищет и конвертирует docx файлы из исходной папки в целевую папку
    
    Args:
        source_folder (str): Путь к исходной папке
        target_folder (str): Путь к целевой папке
    
    Returns:
        int: Количество сконвертированных файлов
    """
    converted_count = 0
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    logger = logging.getLogger(__name__)
    try:
        # Проверяем существование исходной папки
        if not os.path.exists(source_folder):
            logger.warning(f"Исходная папка не найдена: {source_folder}")
            return 0
        
        # Создаем целевую папку, если ее нет
        os.makedirs(target_folder, exist_ok=True)
        
        # Ищем все docx файлы в исходной папке
        for filename in os.listdir(source_folder):
            if filename.lower().endswith('.docx'):
                docx_path = os.path.join(source_folder, filename)
                
                try:
                    # Конвертируем docx в html
                    html_filename = "text.html" #os.path.basename(html_path)
                    target_html_path = os.path.join(target_folder, html_filename)
                    logger.info(f"Найден docx файл: {filename}, конвертируем...")
                    html_path = convert_file_to_html(docx_path, target_html_path)
                    
                    # Получаем имя файла для копирования в целевую папку
                    
                    
                    # Копируем сгенерированный html в целевую папку
                    
                    converted_count += 1
                    logger.info(f"Успешно сконвертирован и скопирован: {filename} -> {html_filename}")
                    
                except Exception as e:
                    logger.error(f"Ошибка при конвертации файла {filename}: {e}")
                
                break
        
        if converted_count > 0:
            logger.info(f"Сконвертировано {converted_count} docx файлов в папке: {target_folder}")
        else:
            logger.info(f"Docx файлы не найдены в папке: {source_folder}")
            
    except Exception as e:
        logger.error(f"Ошибка при поиске docx файлов в папке {source_folder}: {e}")
    
    return converted_count




def format_text_to_html(text):
    """
    Расширенная версия с поддержкой:
    - Диапазонов чисел (через тире, дефис или двоеточие)
    - Римских цифр
    - Составных номеров (через точку или с буквами)
    - Инициалов (не отрываются от фамилий)
    """
    if not text:
        return ""
    
    # Заменяем переносы строк
    html_text = text.replace('\n', '<br>')
    
    # Обрабатываем "г." как год (после цифры)
    html_text = re.sub(r'(\d{1,4})\s*г\.', r'\1&nbsp;г.', html_text)
    
    # Обрабатываем "г." как город (перед словом с большой буквы)
    html_text = re.sub(r'г\.\s*([А-ЯЁA-Z][а-яёa-z]+)', r'г.&nbsp;\1', html_text)
    
    # Паттерн для чисел: может быть просто число, диапазон, римские цифры, составной номер
    number_pattern = r'\d+(?:[-\—:]\d+)?(?:[а-яa-z]?|\.\d+)?|(?:\b[IVXLCDM]+\b)'
    
    # Обрабатываем все сокращения с числами
    abbreviations = [r'Л\.', r'Д\.', r'Оп\.', r'Ф\.']
    
    for abbr in abbreviations:
        # Ищем сокращение, за которым следует число/номер
        pattern = fr'({abbr})\s*({number_pattern})'
        html_text = re.sub(pattern, r'\1&nbsp;\2', html_text, flags=re.IGNORECASE)
    
    # Дополнительно: обработка возможных вариантов с разным регистром
    html_text = re.sub(r'(?i)(л\.|д\.|оп\.)\s*(\d+)', 
                       lambda m: f'{m.group(1)}&nbsp;{m.group(2)}', 
                       html_text)
    html_text = re.sub(
        r'\sгг\.',          # пробел + гг.
        '&nbsp;гг.',       # заменяем на &nbsp; + гг.
        html_text)

    html_text = re.sub(
        r'(\d)\sг\.',      # цифра (\d) + пробел (\s) + г.
        r'\1&nbsp;г.',     # цифра + &nbsp; + г.
        html_text
    )
    html_text = re.sub(
        r'\.-',        
        '-',       
        html_text)

    html_text = re.sub(
        r'\s.\.\s-',        
        '',       
        html_text)
    
    html_text = re.sub(
        r'-егг.',        
        '-е гг.',       
        html_text)
    # ОБРАБОТКА ИНИЦИАЛОВ - БОЛЕЕ ТОЧНАЯ ВЕРСИЯ
    
    # Улучшенный паттерн для фамилий: только слова, которые могут быть фамилиями
    # Ограничиваем длину фамилии и используем более строгий паттерн
    # Фамилия должна быть от 2 до 25 букв, может содержать дефис
    
    # Вариант 1: Два инициала с точками после фамилии (Иванов И.И.)
    html_text = re.sub(
        r'([А-ЯЁ][а-яё]{1,24}(?:-[А-ЯЁ][а-яё]{1,24})?)\s+([А-ЯЁ])\.\s*([А-ЯЁ])\.',
        r'\1&nbsp;\2.\3.',
        html_text
    )
    html_text = re.sub(
        r'([А-ЯЁ])\.\s*([А-ЯЁ])\.\s*([А-ЯЁ][а-яё]{1,24}(?:-[А-ЯЁ][а-яё]{1,24})?)',
        r'\1.&nbsp;\2.&nbsp;\3',
        html_text)

    html_text = re.sub(
        r'(?<![А-ЯЁа-яёA-Za-z])([А-ЯЁA-Zа-яёa-z]{1,2})\s',
        r'\1&nbsp;',
        html_text)
    
    return html_text

def main():
    convert_file_to_html("F:/MiscProjects/Peterhoff/Тексты/MainText.docx")

if __name__ == "__main__":
    main()