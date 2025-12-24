function scanAndLoad(initialUrl) {
    const loadingElement = document.getElementById('loading-info');
    
    // Показываем сообщение о загрузке
    if (loadingElement) {
        loadingElement.innerHTML = "<p>идёт загрузка</p>";
    }
    
    GitHubFolderScanner.scanFolder(initialUrl)
        .then(folders => {
            console.log('Всего папок:', folders.length);
            
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
            
            folders.forEach((folderUrl, index) => {
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