// Gallery.js - Универсальная галерея
(function() {
    'use strict';
    
    function createGallery(GALLERY_ID, folder, baseUrl) {
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
                    const mapJsonUrl = `${baseUrl}/map.json`;
                    console.log(`📡 Загрузка map.json из: ${mapJsonUrl}`);
                    
                    const response = await fetch(mapJsonUrl);
                    
                    if (response.ok) {
                        const jsonData = await response.json();
                        console.log('✅ map.json успешно загружен');
                        
                        // Диагностика структуры
                        if (jsonData.folders) {
                            const availableFolders = Object.keys(jsonData.folders);
                            console.log(`📁 Доступные папки: ${availableFolders.join(', ')}`);
                            
                            if (jsonData.folders[folder]) {
                                const folderData = jsonData.folders[folder];
                                const filesCount = folderData.files ? folderData.files.length : 0;
                                const subfoldersCount = folderData.subfolders ? Object.keys(folderData.subfolders).length : 0;
                                console.log(`📂 Папка "${folder}": ${filesCount} фото, ${subfoldersCount} подпапок`);
                            }
                        }
                        
                        mapDataCache = jsonData;
                        return jsonData;
                    }

                    throw new Error(`map.json не найден (статус: ${response.status})`);
                } catch (error) {
                    console.error('❌ Ошибка при загрузке map.json:', error.message);
                    throw error;
                }
            }
            
            // Функция для получения файлов из основной папки
            function getFilesFromMainFolder(mapData, folderName) {
                try {
                    if (!mapData.folders || !mapData.folders[folderName]) {
                        console.warn(`⚠️ Папка "${folderName}" не найдена в map.json`);
                        return [];
                    }
                    
                    const folderData = mapData.folders[folderName];
                    const files = folderData.files || [];
                    
                    console.log(`📁 Найдено ${files.length} файлов в основной папке "${folderName}"`);
                    return files;
                } catch (error) {
                    console.error('❌ Ошибка при получении файлов из основной папки:', error.message);
                    return [];
                }
            }
            
            // Функция для получения всех документов из подпапок
            function getAllDocumentsFromSubfolders(mapData, folderName) {
                try {
                    if (!mapData.folders || !mapData.folders[folderName]) {
                        console.warn(`⚠️ Папка "${folderName}" не найдена в map.json`);
                        return [];
                    }
                    
                    const folderData = mapData.folders[folderName];
                    const subfolders = folderData.subfolders || {};
                    const allDocuments = [];
                    
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
                            console.log(`📄 Документ "${subfolderName}": ${files.length} стр.`);
                        }
                    }
                    
                    console.log(`📚 Найдено ${allDocuments.length} документов`);
                    return allDocuments;
                } catch (error) {
                    console.error('❌ Ошибка при получении документов:', error.message);
                    return [];
                }
            }
            
            // Функция для получения URL изображения
            function getImageUrl(fileName) {
                return `${baseUrl}/${encodeURIComponent(fileName)}`;
            }
            
            // Функция для поиска миниатюры для файла с кэшированием
            async function findThumbnailForFile(imageName) {
                const cacheKey = `thumbnail:${imageName}`;
                
                if (thumbnailCache.has(cacheKey)) {
                    return thumbnailCache.get(cacheKey);
                }
                
                try {
                    const thumbnailUrl = `${baseUrl}/${encodeURIComponent("t_"+imageName)}`;
                    const response = await fetchWithCache(thumbnailUrl, { method: 'HEAD' }, cacheKey);
                    const result = response ? thumbnailUrl : null;
                    thumbnailCache.set(cacheKey, result);
                    return result;
                } catch (error) {
                    thumbnailCache.set(cacheKey, null);
                    return null;
                }
            }
            
            // БЕЗОПАСНАЯ обработка одного файла - обернуто в try-catch
            async function processSingleFile(fileData, isDocument, subfolderName, documentAllFiles) {
                try {
                    const fileName = fileData.filename;
                    if (!fileName) {
                        console.warn('⚠️ Файл без имени пропущен');
                        return null;
                    }
                    
                    const description = fileData.description || '';
                    let displayTitle = '';
                    let uuid = '';
                    
                    try {
                        displayTitle = GalleryUtils.formatDisplayTitle(fileName);
                        uuid = GalleryUtils.createFileUUID(fileName);
                    } catch (utilError) {
                        console.warn(`⚠️ Ошибка в утилитах для ${fileName}:`, utilError.message);
                        displayTitle = fileName;
                        uuid = 'fallback-' + Date.now() + '-' + Math.random();
                    }
                    
                    const directUrl = getImageUrl(fileName);
                    
                    let thumbnailUrl = directUrl;
                    try {
                        const foundThumbnailUrl = await findThumbnailForFile(fileName);
                        if (foundThumbnailUrl) {
                            thumbnailUrl = foundThumbnailUrl;
                        }
                    } catch (thumbError) {
                        console.warn(`⚠️ Ошибка поиска миниатюры для ${fileName}:`, thumbError.message);
                    }
                    
                    let previewPages = [];
                    if (isDocument && documentAllFiles && documentAllFiles.length > 1) {
                        try {
                            const pagesToShow = Math.min(3, documentAllFiles.length);
                            for (let i = 0; i < pagesToShow; i++) {
                                const pageFile = documentAllFiles[i];
                                if (pageFile && pageFile.filename) {
                                    try {
                                        const pageFileName = pageFile.filename;
                                        const pageDirectUrl = getImageUrl(pageFileName);
                                        let pageThumbnailUrl = pageDirectUrl;
                                        
                                        const foundPageThumbnailUrl = await findThumbnailForFile(pageFileName);
                                        if (foundPageThumbnailUrl) {
                                            pageThumbnailUrl = foundPageThumbnailUrl;
                                        }
                                        
                                        previewPages.push({
                                            title: GalleryUtils.formatDisplayTitle(pageFileName),
                                            thumbnailUrl: pageThumbnailUrl,
                                            directUrl: pageDirectUrl,
                                            description: pageFile.description || ''
                                        });
                                    } catch (pageError) {
                                        console.warn(`⚠️ Ошибка обработки страницы:`, pageError.message);
                                    }
                                }
                            }
                        } catch (previewError) {
                            console.warn(`⚠️ Ошибка создания превью:`, previewError.message);
                        }
                    }
                    
                    return {
                        title: fileName,
                        displayTitle: displayTitle,
                        directUrl: directUrl,
                        thumbnailUrl: thumbnailUrl,
                        description: description,
                        uuid: uuid,
                        isDocument: isDocument,
                        subfolderName: subfolderName,
                        previewPages: previewPages,
                        documentAllFiles: documentAllFiles || []
                    };
                } catch (error) {
                    console.error(`❌ КРИТИЧЕСКАЯ ошибка обработки файла:`, error.message, error.stack);
                    return null;
                }
            }
            
            // ПОСЛЕДОВАТЕЛЬНАЯ обработка с логированием каждого файла
            async function createImagesInfo(files, isDocument = false, subfolderName = "", documentAllFiles = []) {
                if (!files || files.length === 0) return [];
                
                const validResults = [];
                let processedCount = 0;
                
                console.log(`🔄 Начинаю обработку ${files.length} файлов (последовательно)...`);
                
                for (let i = 0; i < files.length; i++) {
                    const fileData = files[i];
                    const fileName = fileData ? fileData.filename : 'unknown';
                    
                    try {
                        console.log(`   Обработка ${i+1}/${files.length}: ${fileName}`);
                        const result = await processSingleFile(fileData, isDocument, subfolderName, documentAllFiles);
                        
                        if (result) {
                            validResults.push(result);
                            processedCount++;
                        } else {
                            console.warn(`   ⚠️ Файл ${fileName} вернул null`);
                        }
                    } catch (error) {
                        console.error(`   ❌ Файл ${fileName} вызвал ошибку:`, error.message);
                    }
                }
                
                console.log(`✅ Обработано ${processedCount} из ${files.length} файлов`);
                return validResults;
            }
            
            // Основная функция загрузки данных
            async function loadData() {
                try {
                    console.log('🔄 Начало загрузки данных...');
                    
                    const mapData = await loadMapJSON();
                    
                    const filesFromMainFolder = getFilesFromMainFolder(mapData, folder);
                    const documentsFromSubfolders = getAllDocumentsFromSubfolders(mapData, folder);
                    
                    console.log(`🖼️ Фото: ${filesFromMainFolder.length}, 📄 Документов: ${documentsFromSubfolders.length}`);
                    
                    // Загружаем фотографии ПОСЛЕДОВАТЕЛЬНО
                    let photosInfo = [];
                    if (filesFromMainFolder.length > 0) {
                        console.log(`📸 Начинаю загрузку ${filesFromMainFolder.length} фотографий...`);
                        photosInfo = await createImagesInfo(filesFromMainFolder, false);
                        console.log(`✅ Загружено фото: ${photosInfo.length}`);
                    }
                    
                    // Загружаем документы ПОСЛЕДОВАТЕЛЬНО
                    let documentsInfo = [];
                    if (documentsFromSubfolders.length > 0) {
                        console.log(`📚 Начинаю загрузку ${documentsFromSubfolders.length} документов...`);
                        
                        for (let i = 0; i < documentsFromSubfolders.length; i++) {
                            const document = documentsFromSubfolders[i];
                            console.log(`   Документ ${i+1}/${documentsFromSubfolders.length}: ${document.subfolder}`);
                            
                            try {
                                const coverInfo = await createImagesInfo(
                                    [document.coverFile], 
                                    true, 
                                    document.subfolder,
                                    document.allFiles
                                );
                                
                                if (coverInfo.length > 0) {
                                    documentsInfo.push({
                                        ...coverInfo[0],
                                        documentSubfolder: document.subfolder,
                                        documentTotalPages: document.totalPages,
                                        documentAllFiles: document.allFiles
                                    });
                                }
                            } catch (docError) {
                                console.warn(`⚠️ Ошибка загрузки документа ${document.subfolder}:`, docError.message);
                            }
                        }
                        
                        console.log(`✅ Загружено документов: ${documentsInfo.length}`);
                    }
                    
                    console.log(`🏁 ЗАГРУЗКА ЗАВЕРШЕНА. Фото: ${photosInfo.length}, Документов: ${documentsInfo.length}`);
                    
                    return {
                        photos: photosInfo,
                        documents: documentsInfo
                    };
                    
                } catch (error) {
                    console.error('❌ Ошибка при загрузке данных:', error);
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
                                 decoding="async"
                                 onerror="this.onerror=null; this.src='${entry.directUrl}'">
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
                                     decoding="async"
                                     onerror="this.onerror=null; this.src='${page.directUrl}'">
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
                }, 100);
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
                } else {
                    console.log(`📷 Фото не найдены в "${folder}"`);
                }
                
                if (data.documents.length > 0) {
                    galleryHtml += createDocumentsGalleryHTML(data.documents);
                } else {
                    console.log(`📄 Документы не найдены в "${folder}"`);
                }
                
                if (data.photos.length === 0 && data.documents.length === 0) {
                    galleryHtml += `<div class="no-media"><p>В этой папке нет фотографий или документов</p></div>`;
                }
                
                container.innerHTML = galleryHtml;
                addHiddenEntriesForDocuments(container, data.documents);
            }
            
            // Инициализация Fancybox
            function initFancyboxGallery() {
                try {
                    GalleryUtils.initFancybox('.photo-item');
                    
                    const documentItems = document.querySelectorAll('.document-item');
                    documentItems.forEach((item) => {
                        const galleryId = item.getAttribute('data-fancybox');
                        if (galleryId) {
                            GalleryUtils.initFancybox(`[data-fancybox="${galleryId}"]`);
                        }
                    });
                } catch (error) {
                    console.warn('⚠️ Ошибка инициализации Fancybox:', error.message);
                }
            }
            
            // Основная функция инициализации
            async function initGallery() {
                try {
                    console.log(`🚀 Инициализация галереи "${folder}"`);
                    showLoading();
                    
                    const data = await loadData();
                    createGalleryHTML(data);
                    initFancyboxGallery();
                    
                    hideLoading();
                    console.log(`✅ Галерея "${folder}" успешно загружена`);
                } catch (error) {
                    console.error(`❌ Критическая ошибка:`, error);
                    const container = document.getElementById(GALLERY_ID);
                    if (container) {
                        container.innerHTML = `
                            <div class="gallery-title"><h1>${GalleryUtils.escapeHtml(folder)}</h1></div>
                            <div class="no-media">
                              <p>Ошибка загрузки галереи: ${error.message}</p>
                            </div>
                        `;
                    }
                    hideLoading();
                }
            }
            
            // Запуск
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initGallery);
            } else {
                initGallery();
            }
            
        } catch (error) {
            console.error('❌ Ошибка при создании галереи:', error);
        }
    }
    
    window.createGallery = createGallery;
    
})();