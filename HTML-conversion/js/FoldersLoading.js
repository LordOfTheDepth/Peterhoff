function scanAndLoad(initialUrl) {
    const loadingElement = document.getElementById('loading-info');
    
    if (loadingElement) {
        loadingElement.innerHTML = "<p>идёт загрузка</p>";
    }
    
    // Минимизируем логирование в production
    const DEBUG = false; // Можно установить false для production
    
    GitHubFolderScanner.scanFolder(initialUrl)
        .then(folders => {
            if (DEBUG) console.log('Всего элементов до фильтрации:', folders.length);
            
            // ЭФФЕКТИВНАЯ фильтрация - проверяем только наличие "thumbnails" в URL
            const filteredFolders = [];
            
            for (const folderUrl of folders) {
                // Быстрая проверка: если URL содержит "thumbnails", пропускаем
                if (folderUrl.toLowerCase().includes('thumbnails')) {
                    if (DEBUG) console.log('Быстро игнорируем thumbnails:', folderUrl);
                    continue;
                }
                
                // Дополнительная проверка через parseGitHubUrl (медленнее, но точнее)
                const folderInfo = GitHubFolderScanner.parseGitHubUrl(folderUrl);
                const folderPath = folderInfo.folderPath || "";
                
                // Проверяем все сегменты пути
                const pathSegments = folderPath.split('/').filter(segment => segment.length > 0);
                const hasThumbnails = pathSegments.some(segment => 
                    segment.toLowerCase() === 'thumbnails'
                );
                
                if (!hasThumbnails) {
                    filteredFolders.push(folderUrl);
                } else if (DEBUG) {
                    console.log('Игнорируем элемент с thumbnails:', folderUrl);
                }
            }
            
            if (DEBUG) console.log('Всего элементов после фильтрации:', filteredFolders.length);
            
            const initialInfo = GitHubFolderScanner.parseGitHubUrl(initialUrl);
            const initialPath = initialInfo.folderPath || "";
            
            let mainContainer = document.getElementById('main-gallery-container');
            if (!mainContainer) {
                console.error('Контейнер с id="main-gallery-container" не найден');
                return;
            }
            
            mainContainer.innerHTML = '';
            
            // Создаем все галереи одновременно с помощью Promise.all
            const galleryPromises = filteredFolders.map((folderUrl, index) => {
                const galleryId = `gallery-${index + 1}`;
                const galleryDiv = document.createElement('div');
                galleryDiv.id = galleryId;
                mainContainer.appendChild(galleryDiv);
                
                const currentInfo = GitHubFolderScanner.parseGitHubUrl(folderUrl);
                const currentPath = currentInfo.folderPath || "";
                const relativePath = currentPath.replace(initialPath, '').replace(/^\/+/, '');
                const depth = relativePath ? relativePath.split('/').length : 0;
                const title = depth > 1 ? "null" : "";
                
                // Возвращаем промис создания галереи
                return new Promise(resolve => {
                    createGallery(galleryId, title, "", folderUrl);
                    // Даем небольшую задержку между созданием галерей
                    setTimeout(resolve, 50);
                });
            });
            
            // Ждем завершения всех промисов
            return Promise.all(galleryPromises);
        })
        .then(() => {
            // Скрываем сообщение о загрузке
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            
            if (loadingElement) {
                loadingElement.textContent = "Ошибка загрузки: " + error.message;
                loadingElement.style.color = 'red';
                loadingElement.style.display = 'block';
            }
        });
}