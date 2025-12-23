
   function scanAndLoad(initialUrl)
   {
        GitHubFolderScanner.scanFolder(initialUrl)
        .then(folders => {
            console.log('Всего папок:', folders.length);
            
            // Парсим начальную папку
            const initialInfo = GitHubFolderScanner.parseGitHubUrl(initialUrl);
            const initialPath = initialInfo.folderPath || "";
            
            folders.forEach((folderUrl, index) => {
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
                    `gallery-${index + 1}`,
                    title,  // "" или "null"
                    "",
                    folderUrl
                );
            });
        })
        .catch(error => {
            console.error('Ошибка:', error);
        });
    }