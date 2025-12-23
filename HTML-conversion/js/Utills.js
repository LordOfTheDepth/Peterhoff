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
 * GitHub Pages Folder Scanner
 * Рекурсивно находит все вложенные папки в указанной папке GitHub Pages
 */

class GitHubFolderScanner {
    

    static async scanFolder(pagesUrl) {
        try {
            // Парсим URL GitHub Pages
            const { baseUrl, folderPath } = this.parsePagesUrl(pagesUrl);
            
            console.log(`🔍 Начинаю сканирование папки: ${folderPath || '/'}`);
            
            // Собираем все папки рекурсивно в правильном порядке
            const allFolders = [];
            const foldersInfo = await this.scanRecursive(baseUrl, folderPath);
            
            // Добавляем папки в правильном порядке: сначала папки первого уровня, затем их подпапки
            this.collectFoldersInOrder(foldersInfo, allFolders);
            
            console.log(`✅ Найдено ${allFolders.length} папок с изображениями`);
            return allFolders;
            
        } catch (error) {
            console.error('❌ Ошибка при сканировании папки GitHub Pages:', error);
            throw error;
        }
    }
    
    /**
     * Рекурсивно сканирует папку и собирает информацию о ней и ее подпапках
     */
    static async scanRecursive(baseUrl, folderPath, depth = 0) {
        try {
            const indexUrl = this.buildIndexUrl(baseUrl, folderPath);
            const htmlContent = await this.fetchPagesContent(indexUrl);
            const contents = this.parseDirectoryListing(htmlContent);
            
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
                    baseUrl, fullFolderPath, depth + 1
                );
                
                subfoldersInfo.push({
                    name: folder.name,
                    path: fullFolderPath,
                    url: this.buildPagesUrl(baseUrl, fullFolderPath),
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
     * Парсит URL GitHub Pages и извлекает базовый URL и путь
     */
    static parsePagesUrl(pagesUrl) {
        // Пример: https://lordofthedepth.github.io/Peterhoff/images/
        const url = new URL(pagesUrl);
        const pathParts = url.pathname.split('/').filter(part => part.length > 0);
        
        // Базовый URL (без конечного пути)
        let folderPath = '';
        let baseUrl = url.origin;
        
        if (pathParts.length > 0) {
            // Последняя часть может быть папкой или файлом
            // Для простоты считаем, что это папка, если не указано расширение
            const lastPart = pathParts[pathParts.length - 1];
            const hasExtension = lastPart.includes('.') && !lastPart.endsWith('/');
            
            if (hasExtension) {
                // Это файл, путь - все кроме последней части
                folderPath = pathParts.slice(0, -1).join('/');
                baseUrl = url.origin + '/' + pathParts.slice(0, -1).join('/');
            } else {
                // Это папка
                folderPath = pathParts.join('/');
                baseUrl = url.origin + '/' + pathParts.join('/');
            }
        }
        
        return {
            baseUrl: baseUrl,
            folderPath: folderPath,
            hostname: url.hostname
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
    static async checkFolderForImages(pagesUrl) {
        try {
            const { baseUrl, folderPath } = this.parsePagesUrl(pagesUrl);
            const indexUrl = this.buildIndexUrl(baseUrl, folderPath);
            const htmlContent = await this.fetchPagesContent(indexUrl);
            const contents = this.parseDirectoryListing(htmlContent);
            
            return this.checkForImages(contents);
        } catch (error) {
            console.error(`Ошибка при проверке папки ${pagesUrl}:`, error);
            return false;
        }
    }
    
    /**
     * Создает URL для доступа к index странице папки
     */
    static buildIndexUrl(baseUrl, folderPath) {
        // GitHub Pages автоматически показывает список файлов в папке, если нет index.html
        return folderPath ? `${baseUrl}/${folderPath}/` : `${baseUrl}/`;
    }
    
    /**
     * Создает GitHub Pages URL для пользователя
     */
    static buildPagesUrl(baseUrl, folderPath) {
        return folderPath ? `${baseUrl}/${folderPath}/` : `${baseUrl}/`;
    }
    
    /**
     * Выполняет запрос к GitHub Pages
     */
    static async fetchPagesContent(url) {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`GitHub Pages: ${response.status} ${response.statusText}`);
        }
        
        return await response.text();
    }
    
    /**
     * Парсит HTML листинг директории GitHub Pages
     * ВАЖНО: GitHub Pages не предоставляет API для листинга директорий,
     * поэтому этот метод зависит от структуры HTML, которую генерирует GitHub
     */
    static parseDirectoryListing(htmlContent) {
        const contents = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // GitHub Pages генерирует простой список файлов в <body>
        // Ищем все ссылки, которые ведут на файлы и папки
        const links = doc.querySelectorAll('a');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            const text = link.textContent.trim();
            
            // Пропускаем ссылки на текущую директорию и родительскую
            if (href === './' || href === '../' || href === '/' || !href) {
                return;
            }
            
            // Определяем тип: папка или файл
            const isDirectory = href.endsWith('/');
            const name = isDirectory ? text.replace('/', '') : text;
            
            // Пропускаем скрытые файлы
            if (name.startsWith('.')) {
                return;
            }
            
            contents.push({
                name: name,
                type: isDirectory ? 'dir' : 'file',
                url: href
            });
        });
        
        return contents;
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
        return decodeURIComponent(lastPart) || 'root';
    }
}

/**
 * Утилиты для удобного использования
 */
class GitHubFolderScannerUtils {
    
    /**
     * Сканирует папку и отображает результат на странице
     */
    static async scanAndDisplay(pagesUrl, containerId) {
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.error(`Контейнер с id="${containerId}" не найден`);
            return;
        }
        
        // Показываем индикатор загрузки
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Сканирование папки GitHub Pages...</p>
            </div>
        `;
        
        try {
            const folders = await GitHubFolderScanner.scanFolder(pagesUrl);
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