// GalleryNew.js для GitHub Pages
(function() {
    'use strict';
    
    // ФУНКЦИЯ для создания галереи с параметрами
    function createGallery(GALLERY_ID, folder, githubPagesUrl) {
        try {
            // Создаем плашку загрузки
            function showLoading() {
                const container = document.getElementById(GALLERY_ID);
                if (container) {
                    container.innerHTML = `
                        <div class="gallery-title"><h1>${GalleryUtils.escapeHtml(folder)}</h1></div>
                        <div class="loading">Материалы загружаются...</div>
                    `;
                }
            }
            
            // Скрываем плашку загрузки
            function hideLoading() {
                const loadingElement = document.querySelector(`#${GALLERY_ID} .loading`);
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
            }
            
            
            // Кэш для миниатюр
            const thumbnailCache = new Map();
            // Кэш для проверки существования файлов
            const fileExistenceCache = new Map();
            // Флаг наличия папки thumbnails
            let hasThumbnailsFolderCached = true;
            
            // Функция для выполнения запросов с кэшированием
            async function fetchWithCache(url, options = {}, cacheKey = null) {
                const cache = options.method === 'HEAD' ? fileExistenceCache : null;
                
                if (cache && cacheKey && cache.has(cacheKey)) {
                    return cache.get(cacheKey);
                }
                
                try {
                    const response = await fetch(url, options);
                    
                    if (!response.ok) {
                        if (cache && cacheKey) {
                            cache.set(cacheKey, null);
                        }
                        return null;
                    }
                    
                    if (cache && cacheKey) {
                        cache.set(cacheKey, response);
                    }
                    
                    return response;
                } catch (error) {
                    if (cache && cacheKey) {
                        cache.set(cacheKey, null);
                    }
                    return null;
                }
            }
            
            // Функция для загрузки map.json с кэшированием
            let mapDataCache = null;
            async function loadMapJSON() {
                if (mapDataCache) {
                    console.log('✅ map.json загружен из кэша');
                    return mapDataCache;
                }
                
                try {
                    // Вариант 1: Через GitHub Pages (простой доступ к файлу)
                    const mapJsonUrl = `${githubPagesUrl}/map.json`;
                    
                    
                    const response = await fetch(mapJsonUrl);
                    
                    if (response.ok) {
                        const jsonData = await response.json();
                        console.log('✅ map.json файл загружен через GitHub Pages');
                        mapDataCache = jsonData;
                        return jsonData;
                    }

                    throw new Error('map.json не найден ни через GitHub Pages');
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
                    const subfolders = folderData.subfolders || {};
                    const allDocuments = [];
                    
                    // Проходим по всем подпапкам
                    for (const subfolderName in subfolders) {
                        const subfolderData = subfolders[subfolderName];
                        const files = subfolderData.files || [];
                        
                        if (files.length > 0) {
                            const coverFile = files[0];
                            allDocuments.push({
                                subfolder: subfolderName,
                                coverFile: coverFile,
                                allFiles: files,
                                totalPages: files.length
                            });
                        }
                    }
                    
                    console.log(`Найдено ${allDocuments.length} документов в подпапках папки "${folderName}"`);
                    return allDocuments;
                } catch (error) {
                    console.log('Ошибка при получении документов из подпапок:', error.message);
                    return [];
                }
            }
            
            // Функция для проверки существования папки thumbnails (один раз)
            
            // Функция для получения URL изображения
            function getImageUrl(fileName) {
                return `${githubPagesUrl}/${encodeURIComponent(fileName)}`;
            }
            
            // Функция для поиска миниатюры для файла с кэшированием
            async function findThumbnailForFile(imageName) {
                const cacheKey = `thumbnail:${imageName}`;
                
                if (thumbnailCache.has(cacheKey)) {
                    return thumbnailCache.get(cacheKey);
                }
                
                const thumbnailUrl = `${githubPagesUrl}/thumbnails/${encodeURIComponent(imageName)}`;
                const response = await fetchWithCache(thumbnailUrl, { method: 'HEAD' }, cacheKey);
                
                const result = response ? thumbnailUrl : null;
                thumbnailCache.set(cacheKey, result);
                
                return result;
            }
            
            // Функция для параллельной загрузки миниатюр
            async function createImagesInfo(files, isDocument = false, subfolderName = "", documentAllFiles = []) {
                const imagesInfo = [];
                
                // Проверяем наличие папки thumbnails один раз
                const hasThumbnailsFolder = true;
                
                // Создаем массив промисов для параллельной обработки
                const processingPromises = files.map(async (fileData) => {
                    const fileName = fileData.filename;
                    const description = fileData.description || '';
                    const displayTitle = GalleryUtils.formatDisplayTitle(fileName);
                    
                    // Формируем URL для оригинального файла
                    const directUrl = getImageUrl(fileName);
                    
                    // Ищем миниатюру для этого файла
                    let thumbnailUrl = directUrl;
                    if (hasThumbnailsFolder) {
                        const foundThumbnailUrl = await findThumbnailForFile(fileName);
                        if (foundThumbnailUrl) {
                            thumbnailUrl = foundThumbnailUrl;
                        }
                    }
                    
                    // Для документов собираем первые 3 страницы
                    let previewPages = [];
                    if (isDocument && documentAllFiles.length > 1) {
                        const pagesToShow = Math.min(3, documentAllFiles.length);
                        const pagePromises = [];
                        
                        for (let i = 0; i < pagesToShow; i++) {
                            const pageFile = documentAllFiles[i];
                            if (pageFile) {
                                pagePromises.push((async () => {
                                    const pageFileName = pageFile.filename;
                                    const pageDirectUrl = getImageUrl(pageFileName);
                                    let pageThumbnailUrl = pageDirectUrl;
                                    
                                    if (hasThumbnailsFolder) {
                                        const foundPageThumbnailUrl = await findThumbnailForFile(pageFileName);
                                        if (foundPageThumbnailUrl) {
                                            pageThumbnailUrl = foundPageThumbnailUrl;
                                        }
                                    }
                                    
                                    return {
                                        title: GalleryUtils.formatDisplayTitle(pageFileName),
                                        thumbnailUrl: pageThumbnailUrl,
                                        directUrl: pageDirectUrl,
                                        description: pageFile.description || ''
                                    };
                                })());
                            }
                        }
                        
                        previewPages = await Promise.all(pagePromises);
                    }
                    
                    return {
                        title: fileName,
                        displayTitle: displayTitle,
                        directUrl: directUrl,
                        thumbnailUrl: thumbnailUrl,
                        description: description,
                        uuid: GalleryUtils.createFileUUID(fileName),
                        isDocument: isDocument,
                        subfolderName: subfolderName,
                        previewPages: previewPages,
                        documentAllFiles: documentAllFiles
                    };
                });
                
                // Ждем завершения всех промисов
                const results = await Promise.all(processingPromises);
                imagesInfo.push(...results);
                
                return imagesInfo;
            }
            
            // Основная функция загрузки данных с оптимизацией
            async function loadFromGitHubPages() {
                try {
                    console.log('🔄 Загрузка данных через GitHub Pages...');
                    
                    // Загружаем map.json
                    const mapData = await loadMapJSON();
                    
                    // Получаем фотографии из основной папки
                    const filesFromMainFolder = getFilesFromMainFolder(mapData, folder);
                    
                    // Получаем документы из подпапок
                    const documentsFromSubfolders = getAllDocumentsFromSubfolders(mapData, folder);
                    
                    console.log(`🖼️ Найдено ${filesFromMainFolder.length} фотографий в основной папке`);
                    console.log(`📄 Найдено ${documentsFromSubfolders.length} документов в подпапках`);
                    
                    // Загружаем фотографии и документы параллельно
                    const [photosInfo, documentsInfo] = await Promise.all([
                        // Фотографии
                        filesFromMainFolder.length > 0 ? 
                            createImagesInfo(filesFromMainFolder, false) : 
                            Promise.resolve([]),
                        
                        // Документы
                        (async () => {
                            if (documentsFromSubfolders.length === 0) return [];
                            
                            const docPromises = documentsFromSubfolders.map(async (document) => {
                                const coverInfo = await createImagesInfo(
                                    [document.coverFile], 
                                    true, 
                                    document.subfolder,
                                    document.allFiles
                                );
                                
                                if (coverInfo.length > 0) {
                                    return {
                                        ...coverInfo[0],
                                        documentSubfolder: document.subfolder,
                                        documentTotalPages: document.totalPages,
                                        documentAllFiles: document.allFiles
                                    };
                                }
                                return null;
                            });
                            
                            const results = await Promise.all(docPromises);
                            return results.filter(doc => doc !== null);
                        })()
                    ]);
                    
                    return {
                        photos: photosInfo,
                        documents: documentsInfo
                    };
                    
                } catch (error) {
                    console.error('❌ Ошибка при загрузке данных через GitHub Pages:', error);
                    return {
                        photos: [],
                        documents: []
                    };
                }
            }
            
            // Функция для создания HTML галереи фотографий
            function createPhotosGalleryHTML(photos) {
                if (photos.length === 0) return '';
                
                let html = `<div class="gallery-section photos-section">`;
                html += `<div class="media-gallery-captions photos-gallery">`;
                
                photos.forEach((entry) => {
                    const displayTitle = entry.displayTitle;
                    const description = entry.description || '';
                    const dataTitleAttr = displayTitle ? `data-caption="${GalleryUtils.escapeHtmlAttribute(description)}"` : '';
                    
                    html += `
                        <a href="${entry.directUrl}" 
                           class="media-item photo-item"
                           data-fancybox="gallery-${GALLERY_ID}-photos"
                           ${dataTitleAttr}>
                          
                          <div class="media-image-container">
                            <img src="${entry.thumbnailUrl}" 
                                 alt="${GalleryUtils.escapeHtml(displayTitle)}" 
                                 class="media-image photo-image"
                                 loading="lazy"
                                 decoding="async">
                          </div>
                       
                          <div class="media-caption">
                            <div class="media-title">${description}</div>
                          </div>
                        </a>
                    `;
                });
                
                html += `</div></div>`;
                return html;
            }
            
            // Функция для создания HTML галереи документов
            function createDocumentsGalleryHTML(documents) {
                if (documents.length === 0) return '';
                
                let html = `<div class="gallery-section documents-section">`;
                html += `<div class="media-gallery-captions documents-gallery">`;
                
                documents.forEach((entry) => {
                    const displayTitle = entry.displayTitle;
                    const description = entry.description || '';
                    const documentSubfolder = entry.documentSubfolder || '';
                    const totalPages = entry.documentTotalPages || 0;
                    const previewPages = entry.previewPages || [];
                    
                    const cardTitle = documentSubfolder || displayTitle;
                    const documentGalleryId = `${GALLERY_ID}-doc-${documentSubfolder.replace(/\s+/g, '-').toLowerCase()}`;
                    
                    html += `
                        <a href="${entry.directUrl}" 
                           class="media-item document-item"
                           data-fancybox="${documentGalleryId}"
                           data-caption="${GalleryUtils.escapeHtmlAttribute(cardTitle)}">
                          
                          <div class="media-image-container document-stack-container">
                            <div class="document-stack">
                    `;
                    
                    previewPages.forEach((page, index) => {
                        const rotation = (index - 1) * 3;
                        const zIndex = previewPages.length - index;
                        const opacity = 1 - (index * 0.1);
                        
                        html += `
                            <div class="document-stack-page" 
                                 style="transform: rotate(${rotation}deg); 
                                        z-index: ${zIndex}; 
                                        opacity: ${opacity};">
                                <img src="${page.thumbnailUrl}" 
                                     alt="${GalleryUtils.escapeHtml(page.title)}" 
                                     class="document-stack-image"
                                     loading="lazy"
                                     decoding="async">
                            </div>
                        `;
                    });
                    
                    html += `
                            </div>
                            <div class="document-icon">📄</div>
                          </div>
                       
                          <div class="media-caption">
                            <div class="media-title">${GalleryUtils.escapeHtml(cardTitle)}</div>
                            ${totalPages > 1 ? `<div class="document-pages-count">${totalPages} стр.</div>` : ''}
                          </div>
                        </a>
                    `;
                });
                
                html += `</div></div>`;
                return html;
            }
            
            // Функция для отложенной загрузки скрытых элементов
            function addHiddenEntriesForDocuments(container, documents) {
                // Добавляем скрытые элементы после основной загрузки
                setTimeout(() => {
                    documents.forEach((document) => {
                        const documentSubfolder = document.documentSubfolder;
                        const documentGalleryId = `${GALLERY_ID}-doc-${documentSubfolder.replace(/\s+/g, '-').toLowerCase()}`;
                        
                        if (document.documentAllFiles && document.documentAllFiles.length > 1) {
                            document.documentAllFiles.slice(1).forEach((fileData) => {
                                const fileName = fileData.filename;
                                const description = fileData.description || '';
                                const displayTitle = GalleryUtils.formatDisplayTitle(fileName);
                                const directUrl = getImageUrl(fileName);
                                
                                const dataTitleAttr = displayTitle ? 
                                    `data-caption="${GalleryUtils.escapeHtmlAttribute(displayTitle) + " |\n" + GalleryUtils.escapeHtmlAttribute(description)}"` : '';
                                
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
                }, 100); // Небольшая задержка для приоритизации основной загрузки
            }
            
            // Функция для создания полного HTML галереи
            function createGalleryHTML(data) {
                const container = document.getElementById(GALLERY_ID);
                
                if (!container) {
                    console.error(`❌ Контейнер с id="${GALLERY_ID}" не найден`);
                    return;
                }
                
                let galleryHtml = "";
                
                if (folder && folder !== "null") {
                    galleryHtml += `<div class="gallery-title"><h1>${GalleryUtils.escapeHtml(folder)}</h1></div>`;
                } else {
                    galleryHtml += `<div class="gallery-title"><h1> </h1></div>`;
                }
                
                if (data.photos.length > 0) {
                    galleryHtml += createPhotosGalleryHTML(data.photos);
                }
                
                if (data.documents.length > 0) {
                    galleryHtml += createDocumentsGalleryHTML(data.documents);
                }
                
                if (data.photos.length === 0 && data.documents.length === 0) {
                    galleryHtml += `<div class="no-media"><p>В этой папке нет фотографий или документов</p></div>`;
                }
                
                container.innerHTML = galleryHtml;
                
                // Отложенная загрузка скрытых элементов
                addHiddenEntriesForDocuments(container, data.documents);
            }
            
            // Инициализация Fancybox
            function initFancyboxGallery() {
                GalleryUtils.initFancybox('.photo-item');
                
                const documentItems = document.querySelectorAll('.document-item');
                documentItems.forEach((item) => {
                    const galleryId = item.getAttribute('data-fancybox');
                    if (galleryId) {
                        GalleryUtils.initFancybox(`[data-fancybox="${galleryId}"]`);
                    }
                });
            }
            
            // Основная функция инициализации
            async function initGallery() {
                try {
                    showLoading();
                    
                    const data = await loadFromGitHubPages();
                    createGalleryHTML(data);
                    initFancyboxGallery();
                    
                    hideLoading();
                } catch (error) {
                    const container = document.getElementById(GALLERY_ID);
                    if (container) {
                        container.innerHTML = `
                            <div class="gallery-title"><h1>${GalleryUtils.escapeHtml(folder)}</h1></div>
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
            console.error('❌ Ошибка при парсинге GitHub Pages URL:', error);
        }
    }
    
    // ЭКСПОРТ функции для использования извне
    window.createGallery = createGallery;
    
})();