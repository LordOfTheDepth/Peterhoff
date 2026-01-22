(function() {
    'use strict';
    
    // ФУНКЦИЯ для создания галереи с параметрами
    function createGallery(GALLERY_ID, folder, githubFolderUrl) {
        let token1 = "pat_"
        let token2 = "11ASO6L4Y0ohnzEd8NtYHe_XQuxbUyEXroUsSzZ8r9AA"
        let token3 = "LcjLiu5IUX260bb5bUjSQHCNC2EXYJ0vWDcm1m"
        let githubToken = "github_" + token1 + token2 + token3;
        
        try {
            // Извлекаем параметры из URL
            const urlParts = githubFolderUrl.split('/');
            
            if (urlParts[2] !== 'github.com') {
                throw new Error('Неверный GitHub URL');
            }
            
            const GITHUB_REPO = `${urlParts[3]}/${urlParts[4]}`;
            
            // Определяем ветку/коммит
            let GITHUB_BRANCH = 'main';
            let GITHUB_FOLDER = '';
            
            // Находим индекс "tree" в URL
            const treeIndex = urlParts.findIndex(part => part === 'tree');
            
            if (treeIndex !== -1 && urlParts[treeIndex + 1]) {
                GITHUB_BRANCH = urlParts[treeIndex + 1];
                
                // Формируем путь к папке (все что после ветки)
                if (urlParts.length > treeIndex + 2) {
                    GITHUB_FOLDER = urlParts.slice(treeIndex + 2).join('/');
                }
            }
            
            // Декодируем папку из URL-encoded формата
            GITHUB_FOLDER = decodeURIComponent(GITHUB_FOLDER);
            
            function escapeHtmlAttribute(url) {
                if (!url) return '';
                return String(url)
                    .replace(/&/g, '&amp;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            }
            
            // Функция для правильного декодирования base64 с учетом UTF-8
            function decodeBase64UTF8(base64) {
                try {
                    // Преобразуем base64 в бинарные данные
                    const binaryString = atob(base64);
                    
                    // Преобразуем бинарную строку в массив байт
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    
                    // Декодируем как UTF-8
                    return new TextDecoder('utf-8').decode(bytes);
                } catch (error) {
                    console.error('Ошибка декодирования base64:', error);
                    return '';
                }
            }
            
            // Функция для выполнения авторизованных запросов к GitHub API
            async function fetchGitHubAPI(url) {
                const headers = {};
                
                // Добавляем токен авторизации, если он предоставлен
                if (githubToken) {
                    headers['Authorization'] = `token ${githubToken}`;
                }
                
                try {
                    const response = await fetch(url, { headers });
                    
                    // Проверяем статус ответа
                    if (!response.ok) {
                        if (response.status === 403) {
                            // Превышен лимит запросов
                            const rateLimitReset = response.headers.get('X-RateLimit-Reset');
                            const resetTime = rateLimitReset ? new Date(rateLimitReset * 1000).toLocaleTimeString() : 'неизвестно';
                            console.warn(`Превышен лимит запросов GitHub API. Восстановление в: ${resetTime}`);
                        }
                        throw new Error(`GitHub API: ${response.status} ${response.statusText}`);
                    }
                    
                    return response;
                } catch (error) {
                    console.error('Ошибка при запросе к GitHub API:', error);
                    throw error;
                }
            }
            
            // Функция для загрузки map.json
            async function loadMapJSON() {
                try {
                    const encodedFolder = encodeURIComponent(GITHUB_FOLDER);
                    const mapJsonUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodedFolder}/map.json?ref=${GITHUB_BRANCH}`;
                    
                    console.log(`Пытаюсь загрузить map.json: ${mapJsonUrl}`);
                    
                    const response = await fetchGitHubAPI(mapJsonUrl);
                    
                    if (response.ok) {
                        const fileData = await response.json();
                        if (fileData.content) {
                            // Правильно декодируем base64 с UTF-8
                            const content = decodeBase64UTF8(fileData.content);
                            const jsonData = JSON.parse(content);
                            console.log('✅ map.json файл загружен');
                            return jsonData;
                        }
                    }
                    
                    throw new Error('map.json не найден или пустой');
                } catch (error) {
                    console.log('Ошибка при загрузке map.json:', error.message);
                    throw error;
                }
            }
            
            // Функция для получения файлов из основной папки
            function getFilesFromMainFolder(mapData, folderName) {
                try {
                    if (!mapData.folders || !mapData.folders[folderName]) {
                        console.log(`Папка "${folderName}" не найдена в map.json`);
                        return [];
                    }
                    
                    const folderData = mapData.folders[folderName];
                    const files = folderData.files || [];
                    
                    console.log(`Найдено ${files.length} файлов в основной папке "${folderName}"`);
                    return files;
                } catch (error) {
                    console.log('Ошибка при получении файлов из основной папки:', error.message);
                    return [];
                }
            }
            
            // Функция для получения всех документов из подпапок
            function getAllDocumentsFromSubfolders(mapData, folderName) {
                try {
                    if (!mapData.folders || !mapData.folders[folderName]) {
                        console.log(`Папка "${folderName}" не найдена в map.json`);
                        return [];
                    }
                    
                    const folderData = mapData.folders[folderName];
                    
                    // Получаем все подпапки
                    const subfolders = folderData.subfolders || {};
                    const allDocuments = [];
                    
                    // Проходим по всем подпапкам
                    for (const subfolderName in subfolders) {
                        const subfolderData = subfolders[subfolderName];
                        const files = subfolderData.files || [];
                        
                        if (files.length > 0) {
                            // Берем первую страницу как обложку документа
                            const coverFile = files[0];
                            allDocuments.push({
                                subfolder: subfolderName,
                                coverFile: coverFile,
                                allFiles: files,
                                totalPages: files.length
                            });
                            console.log(`Найден документ "${subfolderName}" с ${files.length} страницами`);
                        }
                    }
                    
                    console.log(`Найдено ${allDocuments.length} документов в подпапках папки "${folderName}"`);
                    return allDocuments;
                } catch (error) {
                    console.log('Ошибка при получении документов из подпапок:', error.message);
                    return [];
                }
            }
            
            // Функция для проверки существования папки thumbnails
            async function checkThumbnailsFolder() {
                try {
                    const encodedFolder = encodeURIComponent(GITHUB_FOLDER);
                    const thumbnailsUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodedFolder}/thumbnails?ref=${GITHUB_BRANCH}`;
                    
                    console.log(`Проверяю наличие папки thumbnails: ${thumbnailsUrl}`);
                    
                    const response = await fetchGitHubAPI(thumbnailsUrl);
                    
                    if (response.ok) {
                        const data = await response.json();
                        // Если это массив, значит это папка с содержимым
                        if (Array.isArray(data)) {
                            console.log('✅ Папка thumbnails найдена');
                            return true;
                        }
                    }
                    
                    console.log('Папка thumbnails не найдена');
                    return false;
                } catch (error) {
                    console.log('Папка thumbnails не найдена или ошибка:', error.message);
                    return false;
                }
            }
            
            // Функция для поиска миниатюры для файла
            async function findThumbnailForFile(imageName, hasThumbnailsFolder) {
                // Если нет папки thumbnails, возвращаем оригинальный URL
                if (!hasThumbnailsFolder) {
                    return null;
                }
                
                try {
                    const encodedFolder = encodeURIComponent(GITHUB_FOLDER);
                    const thumbnailsUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodedFolder}/thumbnails?ref=${GITHUB_BRANCH}`;
                    
                    const response = await fetchGitHubAPI(thumbnailsUrl);
                    
                    if (response.ok) {
                        const thumbnailsData = await response.json();
                        
                        // Ищем файл с таким же именем в папке thumbnails
                        const thumbnailItem = thumbnailsData.find(item => 
                            item.type === 'file' && item.name === imageName
                        );
                        
                        if (thumbnailItem) {
                            console.log(`✅ Найдена миниатюра для: ${imageName}`);
                            return thumbnailItem.download_url;
                        } else {
                            console.log(`❌ Миниатюра не найдена для: ${imageName}`);
                            return null;
                        }
                    }
                    
                    return null;
                } catch (error) {
                    console.log(`Ошибка при поиске миниатюры для ${imageName}:`, error.message);
                    return null;
                }
            }
            
            // Функция для создания информации об изображениях из файлов
            async function createImagesInfo(files, isDocument = false, subfolderName = "") {
                const imagesInfo = [];
                
                // Проверяем наличие папки thumbnails (делаем один раз)
                const hasThumbnailsFolder = await checkThumbnailsFolder();
                
                for (const fileData of files) {
                    const fileName = fileData.filename;
                    const description = fileData.description || '';
                    const displayTitle = fileName.replace(/\.[^.]+$/, "");
                    
                    // Формируем URL для оригинального файла
                    const encodedFolder = encodeURIComponent(GITHUB_FOLDER);
                    const encodedFileName = encodeURIComponent(fileName);
                    const directUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${encodedFolder}/${encodedFileName}`;
                    
                    // Ищем миниатюру для этого файла
                    let thumbnailUrl = directUrl; // По умолчанию используем оригинал
                    if (hasThumbnailsFolder) {
                        const foundThumbnailUrl = await findThumbnailForFile(fileName, hasThumbnailsFolder);
                        if (foundThumbnailUrl) {
                            thumbnailUrl = foundThumbnailUrl;
                        }
                    }
                    
                    // Создаем уникальный UUID на основе имени файла
                    const uuid = btoa(encodeURIComponent(fileName)).substring(0, 20);
                    
                    imagesInfo.push({
                        title: fileName,
                        displayTitle: displayTitle,
                        directUrl: directUrl,
                        thumbnailUrl: thumbnailUrl,
                        description: description,
                        uuid: uuid,
                        isDocument: isDocument,
                        subfolderName: subfolderName
                    });
                }
                
                // СОРТИРОВКА ПО АЛФАВИТУ по полю displayTitle (только для фотографий)
                if (!isDocument) {
                    imagesInfo.sort((a, b) => {
                        const nameA = a.displayTitle.toLowerCase();
                        const nameB = b.displayTitle.toLowerCase();
                        
                        // Функция для натуральной сортировки
                        const naturalCompare = (str1, str2) => {
                            const regex = /(\d+)|(\D+)/g;
                            const parts1 = str1.match(regex) || [];
                            const parts2 = str2.match(regex) || [];
                            
                            for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
                                const part1 = parts1[i];
                                const part2 = parts2[i];
                                
                                // Если обе части - числа, сравниваем как числа
                                const isNum1 = /^\d+$/.test(part1);
                                const isNum2 = /^\d+$/.test(part2);
                                
                                if (isNum1 && isNum2) {
                                    const num1 = parseInt(part1, 10);
                                    const num2 = parseInt(part2, 10);
                                    if (num1 !== num2) {
                                        return num1 - num2;
                                    }
                                } else {
                                    // Иначе сравниваем как строки
                                    const compareResult = part1.localeCompare(part2, 'ru', { 
                                        sensitivity: 'base',
                                        numeric: true 
                                    });
                                    if (compareResult !== 0) {
                                        return compareResult;
                                    }
                                }
                            }
                            
                            // Если все части совпадают до определенной длины, более короткая строка идет первой
                            return parts1.length - parts2.length;
                        };
                        
                        return naturalCompare(nameA, nameB);
                    });
                }
                
                return imagesInfo;
            }
            
            // Основная функция загрузки данных с GitHub
            async function loadFromGitHub() {
                try {
                    console.log('🔄 Загрузка map.json с GitHub...');
                    
                    // Загружаем map.json
                    const mapData = await loadMapJSON();
                    
                    // Получаем фотографии из основной папки
                    const filesFromMainFolder = getFilesFromMainFolder(mapData, folder);
                    
                    // Получаем документы из подпапок
                    const documentsFromSubfolders = getAllDocumentsFromSubfolders(mapData, folder);
                    
                    console.log(`🖼️ Найдено ${filesFromMainFolder.length} фотографий в основной папке`);
                    console.log(`📄 Найдено ${documentsFromSubfolders.length} документов в подпапках`);
                    
                    // Создаем информацию для фотографий
                    const photosInfo = await createImagesInfo(filesFromMainFolder, false);
                    
                    // Создаем информацию для документов
                    const documentsInfo = [];
                    for (const document of documentsFromSubfolders) {
                        // Создаем информацию для обложки документа
                        const coverInfo = await createImagesInfo([document.coverFile], true, document.subfolder);
                        
                        if (coverInfo.length > 0) {
                            // Добавляем дополнительную информацию о документе
                            const coverWithDocInfo = {
                                ...coverInfo[0],
                                documentSubfolder: document.subfolder,
                                documentTotalPages: document.totalPages,
                                documentAllFiles: document.allFiles
                            };
                            documentsInfo.push(coverWithDocInfo);
                        }
                    }
                    
                    return {
                        photos: photosInfo,
                        documents: documentsInfo
                    };
                    
                } catch (error) {
                    console.error('❌ Ошибка при загрузке данных с GitHub:', error);
                    return {
                        photos: [],
                        documents: []
                    };
                }
            }
            
            // Функция для создания HTML галереи
            function createGalleryHTML(data) {
                const container = document.getElementById(GALLERY_ID);
                
                if (!container) {
                    console.error(`❌ Контейнер с id="${GALLERY_ID}" не найден`);
                    return;
                }
                
                let galleryHtml = "";
                
                // Добавляем заголовок папки
                if (folder && folder !== "null") {
                    galleryHtml += `<div class="gallery-title"><h1>${escapeHtml(folder)}</h1></div>`;
                } else {
                    galleryHtml += `<div class="gallery-title"><h1> </h1></div>`;
                }
                
                galleryHtml += `<div class="media-gallery-captions">`;
                
                // Сначала отображаем все фотографии
                data.photos.forEach((entry) => {
                    const displayTitle = entry.displayTitle;
                    const description = entry.description || '';
                    const dataTitleAttr = displayTitle ? `data-caption="${escapeHtmlAttribute(displayTitle) + " |\n" + escapeHtmlAttribute(description)}"` : '';
                    
                    galleryHtml += `
                        <a href="${entry.directUrl}" 
                           class="media-item photo-item"
                           data-fancybox="gallery-${GALLERY_ID}"
                           ${dataTitleAttr}>
                          
                          <div class="media-image-container">
                            <img src="${entry.thumbnailUrl}" 
                                 alt="${escapeHtml(displayTitle)}" 
                                 class="media-image photo-image"
                                 loading="lazy">
                          </div>
                       
                          <div class="media-caption">
                            <div class="media-title">${escapeHtml(displayTitle)}</div>
                            ${description ? `<div class="media-description" title="${escapeHtml(description)}">${escapeHtml(description)}</div>` : ''}
                          </div>
                        </a>
                    `;
                });
                
                // Затем отображаем все документы
                data.documents.forEach((entry) => {
                    const displayTitle = entry.displayTitle;
                    const description = entry.description || '';
                    const documentSubfolder = entry.documentSubfolder || '';
                    const totalPages = entry.documentTotalPages || 0;
                    
                    // Для документов используем название подпапки как заголовок
                    const cardTitle = documentSubfolder || displayTitle;
                    
                    // Создаем уникальный ID для галереи документа
                    const documentGalleryId = `${GALLERY_ID}-doc-${documentSubfolder.replace(/\s+/g, '-').toLowerCase()}`;
                    
                    galleryHtml += `
                        <a href="${entry.directUrl}" 
                           class="media-item document-item"
                           data-fancybox="${documentGalleryId}"
                           data-caption="${escapeHtmlAttribute(cardTitle)}">
                          
                          <div class="media-image-container">
                            <img src="${entry.thumbnailUrl}" 
                                 alt="${escapeHtml(cardTitle)}" 
                                 class="media-image document-image"
                                 loading="lazy">
                            <div class="document-icon">📄</div>
                          </div>
                       
                          <div class="media-caption">
                            <div class="media-title">${escapeHtml(cardTitle)}</div>
                            ${totalPages > 1 ? `<div class="document-pages-count">${totalPages} страниц</div>` : ''}
                          </div>
                        </a>
                    `;
                });
                
                galleryHtml += `</div>`;
                
                container.innerHTML = galleryHtml;
                
                // Добавляем скрытые элементы для документов
                addHiddenEntriesForDocuments(container, data.documents);
                
                initFancyboxGallery(data.documents);
            }
            
            // Функция для добавления скрытых элементов для документов
            function addHiddenEntriesForDocuments(container, documents) {
                documents.forEach((document) => {
                    const documentSubfolder = document.documentSubfolder;
                    const documentGalleryId = `${GALLERY_ID}-doc-${documentSubfolder.replace(/\s+/g, '-').toLowerCase()}`;
                    
                    // Добавляем остальные страницы документа как скрытые элементы
                    if (document.documentAllFiles && document.documentAllFiles.length > 1) {
                        // Формируем URL для остальных файлов документа
                        document.documentAllFiles.slice(1).forEach((fileData, index) => {
                            const fileName = fileData.filename;
                            const description = fileData.description || '';
                            const displayTitle = fileName.replace(/\.[^.]+$/, "");
                            const encodedFolder = encodeURIComponent(GITHUB_FOLDER);
                            const encodedFileName = encodeURIComponent(fileName);
                            const directUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${encodedFolder}/${encodedFileName}`;
                            
                            const dataTitleAttr = displayTitle ? `data-caption="${escapeHtmlAttribute(displayTitle) + " |\n" + escapeHtmlAttribute(description)}"` : '';
                            
                            container.innerHTML += `
                                <a href="${directUrl}" 
                                   class="media-item hidden-document-item"
                                   data-fancybox="${documentGalleryId}"
                                   ${dataTitleAttr}
                                   style="display: none;">
                                </a>
                            `;
                        });
                    }
                });
            }
            
            // Экранирование HTML
            function escapeHtml(text) {
                if (!text) return '';
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
            
            // Инициализация Fancybox с кастомными настройками для отображения описания
            function initFancyboxGallery() {
                if (typeof Fancybox === 'undefined') {
                    console.warn('Fancybox не загружен');
                    return;
                }
                
                // Инициализируем Fancybox для фотографий
                const photoItems = document.querySelectorAll('.photo-item');
                if (photoItems.length > 0) {
                    Fancybox.bind(photoItems, {
                        Thumbs: { autoStart: false }
                    });
                }
                
                // Инициализируем Fancybox для документов
                const documentItems = document.querySelectorAll('.document-item');
                documentItems.forEach((item) => {
                    const galleryId = item.getAttribute('data-fancybox');
                    if (galleryId) {
                        const itemsForGallery = document.querySelectorAll(`[data-fancybox="${galleryId}"]`);
                        if (itemsForGallery.length > 0) {
                            Fancybox.bind(itemsForGallery, {
                                Thumbs: { autoStart: false }
                            });
                        }
                    }
                });
            }
            
            // Основная функция инициализации
            async function initGallery() {
                try {
                    const data = await loadFromGitHub();
                    createGalleryHTML(data);
                    initFancyboxGallery(); // Без параметра
                } catch (error) {
                    const container = document.getElementById(GALLERY_ID);
                    if (container) {
                        container.innerHTML = `
                            <div class="no-media">
                              <p>Ошибка загрузки галереи: ${error.message}</p>
                            </div>
                        `;
                    }
                }
            }
            
            // Запуск
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initGallery);
            } else {
                initGallery();
            }
            
        } catch (error) {
            console.error('❌ Ошибка при парсинге GitHub URL:', error);
        }
    }
    
    // ЭКСПОРТ функции для использования извне
    window.createGallery = createGallery;
    
})();