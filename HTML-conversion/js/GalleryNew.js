(function() {
    'use strict';
    
    // ФУНКЦИЯ для создания галереи с параметрами
    function createGallery(GALLERY_ID, title, subtitle, folder, subfolder, githubFolderUrl) {
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
            
            // Функция для получения списка файлов из карты
            function getFilesFromMap(mapData, folderName, subfolderName) {
                try {
                    if (!mapData.folders || !mapData.folders[folderName]) {
                        console.log(`Папка "${folderName}" не найдена в map.json`);
                        return [];
                    }
                    
                    const folderData = mapData.folders[folderName];
                    
                    let files = [];
                    
                    if (subfolderName && folderData.subfolders && folderData.subfolders[subfolderName]) {
                        // Получаем файлы из подпапки
                        files = folderData.subfolders[subfolderName].files || [];
                        console.log(`Найдено ${files.length} файлов в подпапке "${subfolderName}"`);
                    } else if (!subfolderName) {
                        // Получаем файлы из основной папки
                        files = folderData.files || [];
                        console.log(`Найдено ${files.length} файлов в папке "${folderName}"`);
                    } else {
                        console.log(`Подпапка "${subfolderName}" не найдена в папке "${folderName}"`);
                        return [];
                    }
                    
                    return files;
                } catch (error) {
                    console.log('Ошибка при получении файлов из карты:', error.message);
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
            
            // Основная функция загрузки данных с GitHub
            async function loadFromGitHub() {
                try {
                    console.log('🔄 Загрузка map.json с GitHub...');
                    
                    // Загружаем map.json
                    const mapData = await loadMapJSON();
                    
                    // Получаем список файлов из карты
                    const filesFromMap = getFilesFromMap(mapData, folder, subfolder);
                    
                    if (filesFromMap.length === 0) {
                        console.log('❌ Файлы не найдены в map.json');
                        return [];
                    }
                    
                    // Проверяем наличие папки thumbnails
                    const hasThumbnailsFolder = await checkThumbnailsFolder();
                    
                    console.log(`Заголовок: ${title}.`);
                    console.log(`Подзаголовок: ${subtitle}.`);
                    console.log(`🖼️ Найдено ${filesFromMap.length} изображений в карте.`);
                    console.log(`📁 Папка thumbnails: ${hasThumbnailsFolder ? 'найдена' : 'не найдена'}`);
                    
                    // Создаем массив для хранения информации об изображениях
                    const imagesInfo = [];
                    
                    // Обрабатываем каждый файл из карты
                    for (const fileData of filesFromMap) {
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
                                console.log(`✅ Использую миниатюру для: ${fileName}`);
                            } else {
                                console.log(`⚠️ Миниатюра не найдена, использую оригинал для: ${fileName}`);
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
                            uuid: uuid
                        });
                    }
                    
                    // СОРТИРОВКА ПО АЛФАВИТУ по полю displayTitle
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
                    
                    return imagesInfo;
                    
                } catch (error) {
                    console.error('❌ Ошибка при загрузке данных с GitHub:', error);
                    return [];
                }
            }
            
            // Функция для создания HTML галереи
            function createGalleryHTML(entries) {
                const container = document.getElementById(GALLERY_ID);
                
                if (!container) {
                    console.error(`❌ Контейнер с id="${GALLERY_ID}" не найден`);
                    return;
                }
                
                let galleryHtml = "";
                if(title && title !== "null") {
                    galleryHtml += `<div class="gallery-title"><h1>${escapeHtml(title)}</h1></div>`;
                }
                if(subtitle && subtitle !== "null") {
                    galleryHtml += `<div class="gallery-subtitle"><h2>${escapeHtml(subtitle)}</h2></div>`;
                }
                if((!title || title == "null") && (!subtitle || subtitle == "null")) {
                    galleryHtml += `<div class="gallery-title"><h1> </h1></div>`;
                }

                galleryHtml += `
                    <div class="media-gallery-captions">
                        ${entries.map((entry) => {
                            const displayTitle = entry.displayTitle;
                            const description = entry.description || '';
                            
                            // Создаем data-атрибуты для описания
                            const dataTitleAttr = displayTitle ? `data-caption="${escapeHtmlAttribute(displayTitle) + " |\n" + escapeHtmlAttribute(description)}"` : '';
                            
                            return `
                                <a href="${entry.directUrl}" 
                                   class="media-item"
                                   data-fancybox="${GALLERY_ID}"
                                   ${dataTitleAttr}>
                                  
                                  <div class="media-image-container">
                                    <img src="${entry.thumbnailUrl}" 
                                         alt="${escapeHtml(displayTitle)}" 
                                         class="media-image"
                                         loading="lazy">
                                  </div>
                               
                                  <div class="media-caption">
                                    <div class="media-title">${escapeHtml(displayTitle)}</div>
                                    ${description ? `<div class="media-description" title="${escapeHtml(description)}">${escapeHtml(description)}</div>` : ''}
                                  </div>
                                </a>
                            `;
                        }).join('')}
                    </div>
                `;
                
                container.innerHTML = galleryHtml;
                initFancyboxGallery();
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
                
                const galleryItems = document.querySelectorAll(`[data-fancybox="${GALLERY_ID}"]`);
                
                if (galleryItems.length > 0) {
                    Fancybox.bind(galleryItems, {
                        Thumbs: { autoStart: false },
                        // Кастомизируем отображение
                        on: {
                            'Carousel.ready': (fancybox, carousel) => {
                                // Создаем контейнер для описания
                                const descriptionContainer = document.createElement('div');
                                descriptionContainer.className = 'fancybox-description';
                                descriptionContainer.style.cssText = `
                                    position: absolute;
                                    bottom: 0;
                                    left: 0;
                                    right: 0;
                                    background: rgba(0, 0, 0, 0.7);
                                    color: white;
                                    padding: 15px;
                                    font-size: 14px;
                                    line-height: 1.5;
                                    z-index: 99999;
                                    transition: opacity 0.3s;
                                `;
                                
                                // Добавляем контейнер в DOM
                                document.querySelector('.fancybox__container').appendChild(descriptionContainer);
                                
                                // Функция для обновления описания
                                const updateDescription = () => {
                                    const slide = carousel.slides[carousel.page];
                                    const triggerEl = slide.triggerEl;
                                    
                                    if (triggerEl) {
                                        const description = triggerEl.getAttribute('data-description');
                                        const caption = triggerEl.getAttribute('data-caption') || '';
                                        
                                        if (description) {
                                            descriptionContainer.innerHTML = `
                                                ${caption ? `<div style="font-weight: bold; margin-bottom: 5px;">${caption}</div>` : ''}
                                                <div>${description}</div>
                                            `;
                                            descriptionContainer.style.display = 'block';
                                        } else {
                                            descriptionContainer.style.display = 'none';
                                        }
                                    }
                                };
                                
                                // Обновляем описание при смене слайда
                                carousel.on('change.carousel', updateDescription);
                                
                                // Инициализируем описание для первого слайда
                                updateDescription();
                                
                                // Сохраняем ссылку на контейнер для очистки
                                fancybox.descriptionContainer = descriptionContainer;
                            },
                            'close': (fancybox) => {
                                // Удаляем контейнер описания при закрытии
                                if (fancybox.descriptionContainer) {
                                    fancybox.descriptionContainer.remove();
                                }
                            }
                        }
                    });
                }
            }
            
            // Основная функция инициализации
            async function initGallery() {
                try {
                    const entries = await loadFromGitHub();
                    createGalleryHTML(entries);
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