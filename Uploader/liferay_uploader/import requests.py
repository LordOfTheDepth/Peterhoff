import requests
import json


def check_liferay_api_availability(base_url, username, password):
    """
    Проверка доступности различных API endpoints Liferay
    """
    print("=" * 70)
    print("ДИАГНОСТИКА REST API LIFERAY")
    print("=" * 70)
    
    endpoints = [
        # Основные API endpoints (Headless Delivery)
        "/api/jsonws",  # JSON Web Services
        "/o/api",  # OpenAPI документация
        "/o/headless-delivery/v1.0/sites",  # Сайты
        "/o/headless-admin-user/v1.0/my-user-account",  # Информация о пользователе
        "/o/headless-admin-user/v1.0/user-accounts",  # Аккаунты пользователей
        "/o/oauth2/token",  # OAuth2 endpoint
        
        # Другие возможные endpoints
        "/c/portal/login",  # Стандартный вход
        "/api/jsonws/group/get-groups",  # JSON WS для групп
        "/web/guest/home",  # Главная страница сайта
    ]
    
    session = requests.Session()
    session.auth = (username, password)
    
    available_endpoints = []
    
    for endpoint in endpoints:
        url = f"{base_url.rstrip('/')}{endpoint}"
        
        try:
            if endpoint == "/api/jsonws/group/get-groups":
                # Для JSON WS нужен POST запрос
                response = session.post(url, data={'start': '0', 'end': '10'})
            elif endpoint == "/o/oauth2/token":
                # Для OAuth2 нужны специальные заголовки
                headers = {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
                response = session.post(url, headers=headers)
            else:
                response = session.get(url, headers={'Accept': 'application/json'})
            
            print(f"\n{endpoint}:")
            print(f"  Статус: {response.status_code}")
            
            if response.status_code in [200, 201, 204]:
                print(f"  ✓ Доступен")
                available_endpoints.append(endpoint)
                
                # Показываем часть ответа для информативных endpoints
                if endpoint in ["/o/headless-delivery/v1.0/sites", 
                                "/o/headless-admin-user/v1.0/my-user-account",
                                "/api/jsonws"]:
                    try:
                        if response.text:
                            data = json.loads(response.text[:500])
                            print(f"  Ответ: {json.dumps(data, ensure_ascii=False, indent=2)[:200]}...")
                    except:
                        print(f"  Ответ: {response.text[:200]}")
            else:
                print(f"  ✗ Недоступен (код: {response.status_code})")
                
        except requests.exceptions.ConnectionError:
            print(f"\n{endpoint}:")
            print(f"  ✗ Не удается подключиться")
        except Exception as e:
            print(f"\n{endpoint}:")
            print(f"  ✗ Ошибка: {e}")
    
    print("\n" + "=" * 70)
    print("РЕЗУЛЬТАТЫ:")
    print("=" * 70)
    
    if available_endpoints:
        print(f"Найдено доступных endpoints: {len(available_endpoints)}")
        for endpoint in available_endpoints:
            print(f"  - {endpoint}")
    else:
        print("Нет доступных endpoints API")
    
    return available_endpoints


def get_liferay_version(base_url, username, password):
    """
    Определение версии Liferay
    """
    print("\n" + "=" * 70)
    print("ОПРЕДЕЛЕНИЕ ВЕРСИИ LIFERAY")
    print("=" * 70)
    
    test_urls = [
        f"{base_url}/api/jsonws",
        f"{base_url}/web/guest/home",
        f"{base_url}/c/portal/login"
    ]
    
    session = requests.Session()
    session.auth = (username, password)
    
    for url in test_urls:
        try:
            response = session.get(url)
            
            if response.status_code == 200:
                # Ищем информацию о версии в заголовках или теле ответа
                html = response.text.lower()
                
                version_patterns = [
                    r'liferay.*?(\d+\.\d+\.\d+)',
                    r'version.*?(\d+\.\d+\.\d+)',
                    r'dxp.*?(\d+)',
                    r'portal.*?(\d+\.\d+\.\d+)'
                ]
                
                for pattern in version_patterns:
                    import re
                    match = re.search(pattern, html)
                    if match:
                        print(f"✓ Найден в {url}: Liferay {match.group(1)}")
                        return match.group(1)
                
                # Проверяем заголовки
                server_header = response.headers.get('Server', '')
                if 'liferay' in server_header.lower():
                    print(f"✓ В заголовках: {server_header}")
                    return server_header
                    
        except Exception as e:
            continue
    
    print("✗ Не удалось определить версию Liferay")
    return None


def test_basic_connection(base_url):
    """
    Базовая проверка подключения к серверу
    """
    print("\n" + "=" * 70)
    print("БАЗОВАЯ ПРОВЕРКА ПОДКЛЮЧЕНИЯ")
    print("=" * 70)
    
    try:
        # Проверяем, отвечает ли сервер вообще
        response = requests.get(base_url, timeout=10)
        
        print(f"Сервер отвечает: {response.status_code}")
        
        # Проверяем заголовки
        print("Заголовки ответа:")
        for key, value in response.headers.items():
            if any(x in key.lower() for x in ['server', 'powered', 'x-liferay']):
                print(f"  {key}: {value}")
        
        # Пробуем найти Liferay в теле ответа
        if 'liferay' in response.text.lower()[:1000]:
            print("✓ Обнаружен Liferay в теле ответа")
        else:
            print("✗ Liferay не обнаружен в теле ответа")
            print("Первые 500 символов ответа:")
            print(response.text[:500])
            
    except requests.exceptions.ConnectionError:
        print("✗ Не удается подключиться к серверу")
        print("Проверьте:")
        print("  1. Запущен ли сервер Liferay")
        print("  2. Правильный ли URL")
        print("  3. Нет ли проблем с сетью/файрволом")
        return False
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        return False
    
    return True


def check_api_configuration(base_url, username, password):
    """
    Проверка конфигурации API в Liferay
    """
    print("\n" + "=" * 70)
    print("ПРОВЕРКА КОНФИГУРАЦИИ API")
    print("=" * 70)
    
    # Пробуем получить доступ через различные методы аутентификации
    
    auth_methods = [
        ("Basic Auth", {'auth': (username, password)}),
        ("Cookie", {'cookies': {'JSESSIONID': 'test'}}),
        ("No auth", {})
    ]
    
    test_endpoints = [
        "/api/jsonws",
        "/o/api"
    ]
    
    for endpoint in test_endpoints:
        print(f"\nТестируем endpoint: {endpoint}")
        url = f"{base_url.rstrip('/')}{endpoint}"
        
        for auth_name, auth_params in auth_methods:
            try:
                if 'auth' in auth_params:
                    response = requests.get(url, **auth_params)
                else:
                    response = requests.get(url)
                
                print(f"  {auth_name}: {response.status_code}")
                
                if response.status_code == 200:
                    print(f"    ✓ Успешно")
                elif response.status_code == 401:
                    print(f"    ✗ Требуется аутентификация")
                elif response.status_code == 403:
                    print(f"    ✗ Доступ запрещен")
                    
            except Exception as e:
                print(f"  {auth_name}: Ошибка - {e}")


def interactive_api_test():
    """
    Интерактивное тестирование API
    """
    print("=" * 70)
    print("ИНТЕРАКТИВНОЕ ТЕСТИРОВАНИЕ API LIFERAY")
    print("=" * 70)
    
    # Запрашиваем настройки
    base_url = input("Введите URL сервера Liferay (по умолчанию: http://localhost:8080): ").strip()
    if not base_url:
        base_url = "http://localhost:8080"
    
    username = input("Введите имя пользователя: ").strip()
    password = input("Введите пароль: ").strip()
    
    print(f"\nПроверяю подключение к: {base_url}")
    
    # Базовая проверка
    if not test_basic_connection(base_url):
        return
    
    # Определяем версию
    version = get_liferay_version(base_url, username, password)
    
    # Проверяем доступность API
    endpoints = check_liferay_api_availability(base_url, username, password)
    
    # Проверяем конфигурацию
    check_api_configuration(base_url, username, password)
    
    print("\n" + "=" * 70)
    print("РЕКОМЕНДАЦИИ:")
    print("=" * 70)
    
    if not endpoints:
        print("1. API недоступен. Возможные причины:")
        print("   - REST API не включен в Liferay")
        print("   - Неправильный путь к API")
        print("   - Проблемы с аутентификацией")
        print("\n2. Что проверить в Liferay:")
        print("   a. Control Panel → Configuration → System Settings")
        print("   b. Найдите 'API Authentication'")
        print("   c. Убедитесь, что включена опция 'Basic Auth Header'")
        print("\n3. Для Liferay 6.x-7.x:")
        print("   - API находится по пути: /api/jsonws")
        print("   - Для загрузки файлов используйте другие методы")
    
    elif "/o/headless-delivery" not in str(endpoints):
        print("1. Headless Delivery API недоступен, но другие API работают")
        print("2. Попробуйте использовать:")
        print("   - /api/jsonws для вызова веб-сервисов")
        print("   - Документация по API: /o/api")
        
        # Предлагаем альтернативные методы
        print("\n3. Альтернативные методы загрузки файлов:")
        print("   - Через портал (веб-интерфейс)")
        print("   - Через Document & Media API (если доступен)")
        print("   - Через устаревшие Web Services")


def get_api_info_for_version(version):
    """
    Возвращает информацию об API для конкретной версии Liferay
    """
    api_info = {
        "7.4": {
            "headless_api": "/o/headless-delivery/v1.0",
            "auth_method": "Basic Auth или OAuth2",
            "file_upload_endpoint": "/o/headless-delivery/v1.0/sites/{siteId}/documents",
            "notes": "Стандартный REST API"
        },
        "7.3": {
            "headless_api": "/o/headless-delivery/v1.0",
            "auth_method": "Basic Auth или OAuth2",
            "file_upload_endpoint": "/o/headless-delivery/v1.0/sites/{siteId}/documents",
            "notes": "Аналогично 7.4"
        },
        "7.2": {
            "headless_api": "/o/headless-delivery/v1.0",
            "auth_method": "Basic Auth",
            "file_upload_endpoint": "/o/headless-delivery/v1.0/sites/{siteId}/documents",
            "notes": "Могут быть небольшие отличия"
        },
        "7.1": {
            "headless_api": "/o/headless-delivery/v1.0",
            "auth_method": "Basic Auth",
            "file_upload_endpoint": "/o/headless-delivery/v1.0/sites/{siteId}/documents",
            "notes": "Первая версия с Headless API"
        },
        "7.0": {
            "headless_api": "Может отсутствовать",
            "auth_method": "Basic Auth",
            "file_upload_endpoint": "/api/jsonws/dlapp/add-file-entry",
            "notes": "Используйте JSON Web Services"
        },
        "6.2": {
            "headless_api": "Отсутствует",
            "auth_method": "Basic Auth",
            "file_upload_endpoint": "/api/jsonws/dlapp/add-file-entry",
            "notes": "Только JSON Web Services"
        }
    }
    
    # Находим наиболее подходящую версию
    for key in sorted(api_info.keys(), reverse=True):
        if version and key in version:
            return api_info[key]
    
    return api_info.get("7.4", {})


if __name__ == "__main__":
    interactive_api_test()