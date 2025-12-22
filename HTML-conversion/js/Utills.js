
function createElement(id, link)
{
    // Возвращаем Promise для поддержки цепочки .then()
    return new Promise((resolve, reject) => {
        fetch(link)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                insertHtml(id, html);
                // Разрешаем Promise с DOM элементом после вставки
                const element = document.getElementById(id);
                if (element) {
                    resolve(element);
                } else {
                    reject(new Error(`Элемент с id "${id}" не найден после вставки`));
                }
            })
            .catch(error => {
                console.error(`Ошибка загрузки элемента ${id}:`, error);
                
                // Создаем заглушку в случае ошибки
                const errorHtml = `
                    <div style="padding: 20px; text-align: center; background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;">
                        <p>Элемент "${id}" временно недоступен</p>
                    </div>
                `;
                
                insertHtml(id, errorHtml);
                
                // Разрешаем Promise с элементом даже при ошибке загрузки
                const element = document.getElementById(id);
                if (element) {
                    resolve(element);
                } else {
                    reject(error);
                }
            });
    });
}

function insertHtml(id, html)
{
    const element = document.getElementById(id);
    if (element) {
        element.innerHTML = html;
        
        // Выполняем скрипты, если они есть в загруженном HTML
        const scripts = element.querySelectorAll('script');
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            
            // Копируем атрибуты
            Array.from(script.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            
            script.parentNode.replaceChild(newScript, script);
        });
    } else {
        console.log(`Элемент с id ${id} не найден`);
    }
}

// Дополнительная функция для создания элемента с колбэком
function createElementWithCallback(id, link, callback) {
    createElement(id, link)
        .then(element => {
            if (callback && typeof callback === 'function') {
                callback(element);
            }
        })
        .catch(error => {
            console.error(`Ошибка при создании элемента ${id}:`, error);
        });
}


/**
 * GitHub Folder Scanner
 * Рекурсивно находит все вложенные папки в указанной папке GitHub
 */

class GitHubFolderScanner {
    
    /**
     * Сканирует папку GitHub и возвращает все вложенные папки
     * @param {string} githubUrl - URL папки GitHub в формате: https://github.com/username/repo/tree/branch/path/to/folder
     * @param {string} githubToken - Необязательный токен GitHub для увеличения лимита запросов
     * @returns {Promise<Array<string>>} - Массив URL всех вложенных папок
     */

    githubToken = "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"

    static async scanFolder(githubUrl) {
        try {
            // Парсим URL GitHub
            const { repo, branch, folderPath } = this.parseGitHubUrl(githubUrl);
            
            console.log(`🔍 Начинаю сканирование папки: ${folderPath || '/'}`);
            
            // Собираем все папки рекурсивно в правильном порядке
            const allFolders = [];
            const foldersInfo = await this.scanRecursive(repo, branch, folderPath, githubToken);
            
            // Добавляем папки в правильном порядке: сначала папки первого уровня, затем их подпапки
            this.collectFoldersInOrder(foldersInfo, allFolders);
            
            
            
            console.log(`✅ Найдено ${allFolders.length} папок с изображениями`);
            return allFolders;
            
        } catch (error) {
            console.error('❌ Ошибка при сканировании папки GitHub:', error);
            throw error;
        }
    }
    
    /**
     * Рекурсивно сканирует папку и собирает информацию о ней и ее подпапках
     */
    static async scanRecursive(repo, branch, folderPath, githubToken, depth = 0) {
        try {
            const apiUrl = this.buildGitHubApiUrl(repo, branch, folderPath);
            const contents = await this.fetchGitHubContents(apiUrl, githubToken);
            
            // Проверяем, есть ли изображения в текущей папке (только JPG и PNG)
            const hasImagesInCurrentFolder = this.checkForImages(contents);
            
            // Фильтруем только папки
            const folders = contents.filter(item => item.type === 'dir');
            
            // Сканируем все вложенные папки и собираем их информацию
            const subfoldersInfo = [];
            for (const folder of folders) {
                // Создаем полный путь к папке
                const fullFolderPath = folderPath ? `${folderPath}/${folder.name}` : folder.name;
                
                // Рекурсивно сканируем вложенную папку
                const subfolderInfo = await this.scanRecursive(
                    repo, branch, fullFolderPath, githubToken, depth + 1
                );
                
                subfoldersInfo.push({
                    name: folder.name,
                    path: fullFolderPath,
                    url: this.buildGitHubUrl(repo, branch, fullFolderPath),
                    info: subfolderInfo,
                    hasImagesInSubfolder: subfolderInfo.hasImagesInCurrentFolder
                });
                
                if (subfolderInfo.hasImagesInCurrentFolder || subfolderInfo.hasImagesInSubfolders) {
                    console.log(`${'  '.repeat(depth)}├── 📁 ${folder.name} (содержит изображения)`);
                } else {
                    console.log(`${'  '.repeat(depth)}├── 📁 ${folder.name} (нет изображений)`);
                }
            }
            
            // Проверяем, есть ли изображения в подпапках
            const hasImagesInSubfolders = subfoldersInfo.some(folder => 
                folder.hasImagesInSubfolder
            );
            
            return {
                hasImagesInCurrentFolder,
                hasImagesInSubfolders,
                subfolders: subfoldersInfo
            };
            
        } catch (error) {
            console.error(`Ошибка при сканировании папки ${folderPath}:`, error);
            return {
                hasImagesInCurrentFolder: false,
                hasImagesInSubfolders: false,
                subfolders: []
            };
        }
    }
    
    /**
     * Собирает папки в правильном порядке: сначала папки первого уровня, потом их подпапки
     */
    static collectFoldersInOrder(folderInfo, resultArray, currentPath = null) {
        // Если это папка с изображениями (или ее подпапки содержат изображения),
        // добавляем ее в результат
        if (currentPath && 
            (folderInfo.hasImagesInCurrentFolder || folderInfo.hasImagesInSubfolders)) {
            resultArray.push(currentPath);
        }
        
        // Рекурсивно обрабатываем все подпапки
        folderInfo.subfolders.forEach(subfolder => {
            if (subfolder.hasImagesInSubfolder) {
                this.collectFoldersInOrder(subfolder.info, resultArray, subfolder.url);
            }
        });
    }
    
    /**
     * Парсит URL GitHub и извлекает информацию о репозитории, ветке и пути
     */
    static parseGitHubUrl(githubUrl) {
        const urlParts = githubUrl.split('/');
        
        if (urlParts[2] !== 'github.com') {
            throw new Error('Неверный GitHub URL');
        }
        
        const username = urlParts[3];
        const repoName = urlParts[4];
        
        // Находим индекс "tree" в URL
        const treeIndex = urlParts.findIndex(part => part === 'tree');
        
        let branch = 'main';
        let folderPath = '';
        
        if (treeIndex !== -1 && urlParts[treeIndex + 1]) {
            branch = urlParts[treeIndex + 1];
            
            // Формируем путь к папке (все что после ветки)
            if (urlParts.length > treeIndex + 2) {
                folderPath = urlParts.slice(treeIndex + 2).join('/');
                folderPath = decodeURIComponent(folderPath);
            }
        }
        
        return {
            repo: `${username}/${repoName}`,
            branch: branch,
            folderPath: folderPath,
            username: username,
            repoName: repoName
        };
    }
    
    /**
     * Проверяет, есть ли изображения (только JPG и PNG) в содержимом папки
     */
    static checkForImages(contents) {
        if (!contents || !Array.isArray(contents)) {
            return false;
        }
        
        // Ищем файлы (type === 'file')
        const files = contents.filter(item => item.type === 'file');
        
        // Фильтруем только изображения JPG и PNG
        const imageFiles = files.filter(item => {
            const fileName = item.name.toLowerCase();
            return fileName.endsWith('.jpg') || 
                   fileName.endsWith('.jpeg') || 
                   fileName.endsWith('.png');
        });
        
        return imageFiles.length > 0;
    }
    
    /**
     * Проверяет, есть ли изображения в папке (без рекурсивного сканирования подпапок)
     */
    static async checkFolderForImages(githubUrl, githubToken = null) {
        try {
            const { repo, branch, folderPath } = this.parseGitHubUrl(githubUrl);
            const apiUrl = this.buildGitHubApiUrl(repo, branch, folderPath);
            const contents = await this.fetchGitHubContents(apiUrl, githubToken);
            
            return this.checkForImages(contents);
        } catch (error) {
            console.error(`Ошибка при проверке папки ${githubUrl}:`, error);
            return false;
        }
    }
    
    /**
     * Создает URL для GitHub API
     */
    static buildGitHubApiUrl(repo, branch, folderPath) {
        const encodedPath = encodeURIComponent(folderPath || '');
        return `https://api.github.com/repos/${repo}/contents/${encodedPath}?ref=${branch}`;
    }
    
    /**
     * Создает GitHub URL для пользователя
     */
    static buildGitHubUrl(repo, branch, folderPath) {
        const encodedPath = encodeURIComponent(folderPath || '');
        return `https://github.com/${repo}/tree/${branch}/${encodedPath}`;
    }
    
    /**
     * Выполняет запрос к GitHub API
     */
    static async fetchGitHubContents(apiUrl, githubToken) {
        const headers = {};
        
        if (githubToken) {
            headers['Authorization'] = `token ${githubToken}`;
        }
        
        const response = await fetch(apiUrl, { headers });
        
        if (!response.ok) {
            if (response.status === 403) {
                const rateLimitReset = response.headers.get('X-RateLimit-Reset');
                const resetTime = rateLimitReset ? new Date(rateLimitReset * 1000).toLocaleTimeString() : 'неизвестно';
                console.warn(`Превышен лимит запросов GitHub API. Восстановление в: ${resetTime}`);
            }
            throw new Error(`GitHub API: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    /**
     * Генерирует HTML список папок
     */
    static generateFoldersList(folders) {
        let html = `
            <div class="github-folders-list">
                <h3>Найдено папок с изображениями: ${folders.length}</h3>
                <div class="folders-container">
        `;
        
        folders.forEach((folder, index) => {
            const folderName = this.extractFolderName(folder);
            html += `
                <div class="folder-item">
                    <span class="folder-index">${index + 1}.</span>
                    <a href="${folder}" target="_blank" class="folder-link">
                        📁 ${folderName}
                    </a>
                    <span class="folder-url">${folder}</span>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    /**
     * Извлекает имя папки из URL
     */
    static extractFolderName(folderUrl) {
        const parts = folderUrl.split('/');
        const lastPart = parts[parts.length - 1];
        return decodeURIComponent(lastPart);
    }
}

/**
 * Утилиты для удобного использования
 */
class GitHubFolderScannerUtils {
    
    /**
     * Сканирует папку и отображает результат на странице
     */
    static async scanAndDisplay(githubUrl, containerId, githubToken = null) {
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.error(`Контейнер с id="${containerId}" не найден`);
            return;
        }
        
        // Показываем индикатор загрузки
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Сканирование папки GitHub...</p>
            </div>
        `;
        
        try {
            const folders = await GitHubFolderScanner.scanFolder(githubUrl, githubToken);
            const html = GitHubFolderScanner.generateFoldersList(folders);
            container.innerHTML = html;
            
            // Возвращаем результат для дальнейшей обработки
            return folders;
            
        } catch (error) {
            container.innerHTML = `
                <div class="error">
                    <h3>Ошибка при сканировании</h3>
                    <p>${error.message}</p>
                    <button onclick="retryScan()">Повторить</button>
                </div>
            `;
            throw error;
        }
    }
    
    /**
     * Экспортирует список папок в JSON файл
     */
    static exportToJson(folders, filename = 'github-folders.json') {
        const dataStr = JSON.stringify(folders, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', filename);
        linkElement.click();
    }
    
    /**
     * Копирует список папок в буфер обмена
     */
    static async copyToClipboard(folders) {
        const text = folders.join('\n');
        
        try {
            await navigator.clipboard.writeText(text);
            console.log('Список папок скопирован в буфер обмена');
            return true;
        } catch (error) {
            console.error('Ошибка при копировании в буфер обмена:', error);
            
            // Fallback для старых браузеров
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            return true;
        }
    }
}
