function scanAndLoad(initialUrl) {
    const loadingElement = document.getElementById('loading-info');
    
    // Показываем сообщение о загрузке
    if (loadingElement) {
        loadingElement.innerHTML = "<p>идёт загрузка</p>";
    }
    
    GitHubFolderScanner.scanFolder(initialUrl)
        .then(folders => {
            console.log('Всего элементов до фильтрации:', folders.length);
            
            // Фильтруем элементы, исключая папки с названием "thumbnails"
            const filteredFolders = folders.filter(folderUrl => {
                // Парсим URL папки
                const folderInfo = GitHubFolderScanner.parseGitHubUrl(folderUrl);
                const folderPath = folderInfo.folderPath || "";
                
                console.log('Проверяемый путь:', folderPath);
                
                // Разбиваем путь на сегменты
                const pathSegments = folderPath.split('/').filter(segment => segment.length > 0);
                
                // Проверяем ВСЕ сегменты пути на наличие "thumbnails"
                const hasThumbnailsInPath = pathSegments.some(segment => 
                    segment.toLowerCase() === 'thumbnails'
                );
                
                if (hasThumbnailsInPath) {
                    console.log('Игнорируем элемент с thumbnails в пути:', folderUrl);
                    return false;
                }
                
                return true;
            });
            
            console.log('Всего элементов после фильтрации:', filteredFolders.length);
            console.log('Отфильтрованные элементы:', filteredFolders);
            
            // Парсим начальную папку
            const initialInfo = GitHubFolderScanner.parseGitHubUrl(initialUrl);
            const initialPath = initialInfo.folderPath || "";
            
            // Получаем или создаем основной контейнер для галерей
            let mainContainer = document.getElementById('main-gallery-container');
            if (!mainContainer) {
                console.error('Контейнер с id="main-gallery-container" не найден');
                return;
            }
            
            // Очищаем контейнер перед добавлением новых галерей
            mainContainer.innerHTML = '';
            
            filteredFolders.forEach((folderUrl, index) => {
                // Создаем контейнер для галереи
                const galleryId = `gallery-${index + 1}`;
                const galleryDiv = document.createElement('div');
                galleryDiv.id = galleryId;
                
                // Добавляем в основной контейнер
                mainContainer.appendChild(galleryDiv);
                
                // Парсим текущую папку
                const currentInfo = GitHubFolderScanner.parseGitHubUrl(folderUrl);
                const currentPath = currentInfo.folderPath || "";
                
                // Вычисляем относительный путь
                const relativePath = currentPath.replace(initialPath, '').replace(/^\/+/, '');
                
                // Подсчитываем уровень вложенности по количеству слэшей в относительном пути
                const depth = relativePath ? relativePath.split('/').length : 0;
                
                // Определяем заголовок
                let title = ""; // По умолчанию пустой
                if (depth > 1) {
                    title = "null"; // Если глубина больше 1
                }
                
                createGallery(
                    galleryId,
                    title,  // "" или "null"
                    "",
                    folderUrl
                );
            });
            
            // Скрываем сообщение о загрузке
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            
            // В случае ошибки тоже скрываем сообщение о загрузке
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            // Дополнительно можно показать сообщение об ошибке
            if (loadingElement) {
                loadingElement.textContent = "Ошибка загрузки: " + error.message;
                loadingElement.style.color = 'red';
                loadingElement.style.display = 'block';
            }
        });
}