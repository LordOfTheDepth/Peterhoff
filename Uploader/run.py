# save as upload_simple.py
import requests
import base64
import os

def simple_upload():
    BASE_URL = "http://localhost:8080"
    USERNAME = "ldk99@yandex.ru"
    PASSWORD = "123"
    SITE_ID = 33805
    FILE_PATH = r"C:\Users\LDK99\Desktop\PeterhofParts\разрушения\КГИОП. Фото № 52211.jpg"
    
    if not os.path.exists(FILE_PATH):
        print("Файл не найден")
        return
    
    # Читаем файл
    with open(FILE_PATH, 'rb') as f:
        file_content = base64.b64encode(f.read()).decode('utf-8')
    
    # Параметры
    params = {
        'repositoryId': str(SITE_ID),
        'folderId': '0',
        'sourceFileName': os.path.basename(FILE_PATH),
        'mimeType': 'image/jpeg',
        'title': os.path.splitext(os.path.basename(FILE_PATH))[0],
        'description': 'Загружено через API',
        'changeLog': 'API Upload',
        'file': file_content,
        'serviceContext': '{}'
    }
    
    url = f"{BASE_URL}/api/jsonws/dlapp/add-file-entry"
    
    try:
        response = requests.post(url, auth=(USERNAME, PASSWORD), data=params)
        
        if response.status_code == 200:
            print("✓ Файл загружен!")
            print(f"Ответ: {response.text[:200]}")
        else:
            print(f"✗ Ошибка: {response.status_code}")
            print(f"Ответ: {response.text[:500]}")
            
    except Exception as e:
        print(f"✗ Ошибка: {e}")

if __name__ == "__main__":
    simple_upload()