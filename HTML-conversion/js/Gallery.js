// GalleryNew.js для GitHub Pages
(function() {
    'use strict';
    
    // ФУНКЦИЯ для создания галереи с параметрами
    function createGallery(GALLERY_ID, folder, githubPagesUrl) {
        try {
            // Извлекаем параметры из GitHub Pages URL
            const urlParts = githubPagesUrl.split('/');
            
            if (urlParts[2] !== 'lordofthedepth.github.io') {
                throw new Error('Неверный GitHub Pages URL. Ожидается: lordofthedepth.github.io');
            }
            
            // Для GitHub Pages путь после домена - это путь в репозитории
            // Пример: https://lordofthedepth.github.io/Peterhoff/SortedMap/Peterhof/разрушения
            // Пропускаем домен, берем все что после
            const REPO_NAME = urlParts[3]; // Peterhoff
            const PATH_AFTER_REPO = urlParts.slice(4).join('/'); // SortedMap/Peterhof/разрушения
            
            // GitHub Pages работает на ветке 'main' по умолчанию
            const GITHUB_BRANCH = 'main';
            // Имя репозитория для API запросов
            const GITHUB_REPO = `LordOfTheDepth/${REPO_NAME}`;
            // Папка в репозитории
            const GITHUB_FOLDER = PATH_AFTER_REPO;
            
            console.log('GitHub Pages параметры:', {
                repo: GITHUB_REPO,
                branch: GITHUB_BRANCH,
                folder: GITHUB_FOLDER,
                url: githubPagesUrl
            });
            
            // Функция для выполнения запросов к GitHub API
            async function fetchGitHubAPI(url) {
                try {
                    const response = await fetch(url);
                    
                    // Проверяем статус ответа
                    if (!response.ok) {
                        throw new Error(`GitHub API: ${response.status} ${response.statusText}`);
                    }
                    
                    return response;
                } catch (error) {
                    console.error('Ошибка при запросе к GitHub API:', error);
                    throw error;
                }
            }
            
            // Функция для загрузки map.json через GitHub Pages (прямой доступ)
            async function loadMapJSON() {
                try {
                    // Вариант 1: Через GitHub Pages (простой доступ к файлу)
                    const mapJsonUrl = `${githubPagesUrl}/map.json`;
                    
                    console.log(`Пытаюсь загрузить map.json через GitHub Pages: ${mapJsonUrl}`);
                    
                    const response = await fetch(mapJsonUrl);
                    
                    if (response.ok) {
                        const jsonData = await response.json();
                        console.log('✅ map.json файл загружен через GitHub Pages');
                        return jsonData;
                    }
                    
                    // Если не сработало, пробуем через GitHub API
                    console.log('Пробую загрузить через GitHub API...');
                    const encodedFolder = encodeURIComponent(GITHUB_FOLDER);
                    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodedFolder}/map.json?ref=${GITHUB_BRANCH}`;
                    
                    const apiResponse = await fetchGitHubAPI(apiUrl);
                    
                    if (apiResponse.ok) {
                        const fileData = await apiResponse.json();
                        if (fileData.content) {
                            // Правильно декодируем base64 с UTF-8
                            const content = GalleryUtils.decodeBase64UTF8(fileData.content);
                            const jsonData = JSON.parse(content);
                            console.log('✅ map.json файл загружен через GitHub API');
                            return jsonData;
                        }
                    }
                    
                    throw new Error('map.json не найден ни через GitHub Pages, ни через API');
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
                    // Проверяем через GitHub Pages
                    const thumbnailsUrl = `${githubPagesUrl}/thumbnails/`;
                    
                    console.log(`Проверяю наличие папки thumbnails: ${thumbnailsUrl}`);
                    
                    // Пробуем загрузить индекс папки (если есть)
                    try {
                        const response = await fetch(thumbnailsUrl);
                        if (response.ok) {
                            console.log('✅ Папка thumbnails найдена через GitHub Pages');
                            return true;
                        }
                    } catch (e) {
                        // Игнорируем ошибку, пробуем другой способ
                    }
                    
                    
                    console.log('Папка thumbnails не найдена');
                    return false;
                } catch (error) {
                    console.log('Папка thumbnails не найдена или ошибка:', error.message);
                    return false;
                }
            }
            
            // Функция для получения URL изображения
            function getImageUrl(fileName) {
                // Для GitHub Pages используем относительный путь
                const encodedFileName = encodeURIComponent(fileName);
                return `${githubPagesUrl}/${encodedFileName}`;
            }
            
            // Функция для поиска миниатюры для файла
            async function findThumbnailForFile(imageName, hasThumbnailsFolder) {
                // Если нет папки thumbnails, возвращаем оригинальный URL
                if (!hasThumbnailsFolder) {
                    return null;
                }
                
                try {
                    // Пробуем через GitHub Pages
                    const thumbnailUrl = `${githubPagesUrl}/thumbnails/${encodeURIComponent(imageName)}`;
                    
                    // Проверяем существование файла
                    const response = await fetch(thumbnailUrl, { method: 'HEAD' });
                    if (response.ok) {
                        console.log(`✅ Найдена миниатюра через GitHub Pages для: ${imageName}`);
                        return thumbnailUrl;
                    }

                    console.log(`❌ Миниатюра не найдена для: ${imageName}`);
                    return null;
                } catch (error) {
                    console.log(`Ошибка при поиске миниатюры для ${imageName}:`, error.message);
                    return null;
                }
            }
            
            // Функция для создания информации об изображениях из файлов
            async function createImagesInfo(files, isDocument = false, subfolderName = "", documentAllFiles = []) {
                const imagesInfo = [];
                
                // Проверяем наличие папки thumbnails (делаем один раз)
                const hasThumbnailsFolder = true;//await checkThumbnailsFolder();
                
                for (const fileData of files) {
                    const fileName = fileData.filename;
                    const description = fileData.description || '';
                    const displayTitle = GalleryUtils.formatDisplayTitle(fileName);
                    
                    // Формируем URL для оригинального файла
                    const directUrl = getImageUrl(fileName);
                    
                    // Ищем миниатюру для этого файла
                    let thumbnailUrl = directUrl; // По умолчанию используем оригинал
                    if (hasThumbnailsFolder) {
                        const foundThumbnailUrl = await findThumbnailForFile(fileName, hasThumbnailsFolder);
                        if (foundThumbnailUrl) {
                            thumbnailUrl = foundThumbnailUrl;
                        }
                    }
                    
                    // Для документов собираем первые 3 страницы
                    let previewPages = [];
                    if (isDocument && documentAllFiles.length > 1) {
                        // Берем первые 3 страницы или все, если меньше 3
                        const pagesToShow = Math.min(3, documentAllFiles.length);
                        for (let i = 0; i < pagesToShow; i++) {
                            const pageFile = documentAllFiles[i];
                            if (pageFile) {
                                const pageFileName = pageFile.filename;
                                const pageDirectUrl = getImageUrl(pageFileName);
                                let pageThumbnailUrl = pageDirectUrl;
                                
                                if (hasThumbnailsFolder) {
                                    const foundPageThumbnailUrl = await findThumbnailForFile(pageFileName, hasThumbnailsFolder);
                                    if (foundPageThumbnailUrl) {
                                        pageThumbnailUrl = foundPageThumbnailUrl;
                                    }
                                }
                                
                                previewPages.push({
                                    title: GalleryUtils.formatDisplayTitle(pageFileName),
                                    thumbnailUrl: pageThumbnailUrl,
                                    directUrl: pageDirectUrl,
                                    description: pageFile.description || ''
                                });
                            }
                        }
                    }
                    
                    imagesInfo.push({
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
                    });
                }
                
                // СОРТИРОВКА ПО АЛФАВИТУ по полю displayTitle (только для фотографий)
                // if (!isDocument) {
                //     imagesInfo.sort((a, b) => {
                //         return GalleryUtils.naturalCompare(a.displayTitle, b.displayTitle);
                //     });
                // }
                
                return imagesInfo;
            }
            
            // Основная функция загрузки данных
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
                    
                    // Создаем информацию для фотографий
                    const photosInfo = await createImagesInfo(filesFromMainFolder, false);
                    
                    // Создаем информацию для документов
                    const documentsInfo = [];
                    for (const document of documentsFromSubfolders) {
                        // Создаем информацию для обложки документа со всеми страницами
                        const coverInfo = await createImagesInfo(
                            [document.coverFile], 
                            true, 
                            document.subfolder,
                            document.allFiles
                        );
                        
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
                    const description = GalleryUtils.formatTextWithLineBreaks(entry.description) || '';
                    const dataTitleAttr = displayTitle ? `data-caption="${GalleryUtils.escapeHtmlAttribute(displayTitle) + " |\n" + GalleryUtils.escapeHtmlAttribute(description)}"` : '';
                    
                    html += `
                        <a href="${entry.directUrl}" 
                           class="media-item photo-item"
                           data-fancybox="gallery-${GALLERY_ID}-photos"
                           ${dataTitleAttr}>
                          
                          <div class="media-image-container">
                            <img src="${entry.thumbnailUrl}" 
                                 alt="${GalleryUtils.escapeHtml(displayTitle)}" 
                                 class="media-image photo-image"
                                 loading="lazy">
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
                    
                    // Для документов используем название подпапки как заголовок
                    const cardTitle = documentSubfolder || displayTitle;
                    
                    // Создаем уникальный ID для галереи документа
                    const documentGalleryId = `${GALLERY_ID}-doc-${documentSubfolder.replace(/\s+/g, '-').toLowerCase()}`;
                    
                    html += `
                        <a href="${entry.directUrl}" 
                           class="media-item document-item"
                           data-fancybox="${documentGalleryId}"
                           data-caption="${GalleryUtils.escapeHtmlAttribute(cardTitle)}">
                          
                          <div class="media-image-container document-stack-container">
                            <!-- Создаем стопку из первых 3 страниц -->
                            <div class="document-stack">
                    `;
                    
                    // Добавляем страницы в стопку
                    previewPages.forEach((page, index) => {
                        const rotation = (index - 1) * 3; // -3°, 0°, +3° для эффекта стопки
                        const zIndex = previewPages.length - index; // Последняя страница сверху
                        const opacity = 1 - (index * 0.1); // Легкое затенение нижних страниц
                        
                        html += `
                            <div class="document-stack-page" 
                                 style="transform: rotate(${rotation}deg); 
                                        z-index: ${zIndex}; 
                                        opacity: ${opacity};">
                                <img src="${page.thumbnailUrl}" 
                                     alt="${GalleryUtils.escapeHtml(page.title)}" 
                                     class="document-stack-image"
                                     loading="lazy">
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
            
            // Функция для создания полного HTML галереи
            function createGalleryHTML(data) {
                const container = document.getElementById(GALLERY_ID);
                
                if (!container) {
                    console.error(`❌ Контейнер с id="${GALLERY_ID}" не найден`);
                    return;
                }
                
                let galleryHtml = "";
                
                // Добавляем заголовок папки
                if (folder && folder !== "null") {
                    galleryHtml += `<div class="gallery-title"><h1>${GalleryUtils.escapeHtml(folder)}</h1></div>`;
                } else {
                    galleryHtml += `<div class="gallery-title"><h1> </h1></div>`;
                }
                
                // Добавляем галерею фотографий (если есть)
                if (data.photos.length > 0) {
                    galleryHtml += createPhotosGalleryHTML(data.photos);
                }
                
                // Добавляем галерею документов (если есть)
                if (data.documents.length > 0) {
                    galleryHtml += createDocumentsGalleryHTML(data.documents);
                }
                
                // Если ничего не найдено
                if (data.photos.length === 0 && data.documents.length === 0) {
                    galleryHtml += `<div class="no-media"><p>В этой папке нет фотографий или документов</p></div>`;
                }
                
                container.innerHTML = galleryHtml;
                
                // Добавляем скрытые элементы для документов
                addHiddenEntriesForDocuments(container, data.documents);
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
                            const displayTitle = GalleryUtils.formatDisplayTitle(fileName);
                            const directUrl = getImageUrl(fileName);
                            
                            const dataTitleAttr = displayTitle ? `data-caption="${GalleryUtils.escapeHtmlAttribute(displayTitle) + " |\n" + GalleryUtils.escapeHtmlAttribute(description)}"` : '';
                            
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
            
            // Инициализация Fancybox
            function initFancyboxGallery() {
                // Инициализируем Fancybox для фотографий
                GalleryUtils.initFancybox('.photo-item');
                
                // Инициализируем Fancybox для документов
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
                    const data = await loadFromGitHubPages();
                    createGalleryHTML(data);
                    initFancyboxGallery();
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
            console.error('❌ Ошибка при парсинге GitHub Pages URL:', error);
        }
    }
    
    // ЭКСПОРТ функции для использования извне
    window.createGallery = createGallery;
    
})();