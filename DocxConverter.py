import re
from pathlib import Path
import zipfile
import xml.etree.ElementTree as ET

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
        
        # Убираем лишние пробелы и разделяем на строки
        lines = [line.strip() for line in text.split('\n')]
        lines = [line for line in lines if line]  # Убираем пустые строки
        
        if not lines:
            return ""
        
        # Первая непустая строка - заголовок
        title = lines[0]
        html_parts = [f'<h1 class="header-content align-center">{title}</h1>']
        
        # Добавляем основную часть
        html_parts.append('<div class="main-text-content align-justify size-medium">')
        
        # Обрабатываем остальные строки (абзацы)
        for line in lines[1:]:
            if line.strip():  # Пропускаем пустые строки
                html_parts.append(f'<p>{line}</p>')
        
        html_parts.append('</div>')
        
        # Возвращаем только HTML контент (без DOCTYPE, html, head, body и стилей)
        return '\n'.join(html_parts)
    
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


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Если запускается из командной строки с аргументом
        input_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else None
        
        try:
            result_path = convert_file_to_html(input_file, output_file)
            print(f"Файл успешно конвертирован: {result_path}")
        except FileNotFoundError as e:
            print(f"Ошибка: {e}")
        except ValueError as e:
            print(f"Ошибка: {e}")
        except Exception as e:
            print(f"Непредвиденная ошибка: {e}")
            import traceback
            traceback.print_exc()
    else:
        # Автоматическая конвертация указанного файла
        try:
            result_path = convert_file_to_html(r"F:\MiscProjects\Peterhoff\Тексты\Павловск\1. Павловск до войны.docx")
            print(f"Файл успешно конвертирован: {result_path}")
        except Exception as e:
            print(f"Ошибка при конвертации: {e}")