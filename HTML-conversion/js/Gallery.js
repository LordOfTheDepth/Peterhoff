(function() {
    'use strict';
    
    // ФУНКЦИЯ для создания галереи с параметрами
    function createGallery(GALLERY_ID, githubFolderUrl) {
        try {
            // Извлекаем параметры из URL
            const urlParts = githubFolderUrl.split('/');
            
            // Проверяем, что это валидный GitHub URL
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
            
            // Функция для извлечения description из метаданных EXIF
            async function extractImageDescription(imageUrl) {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    
                    // Устанавливаем таймаут для предотвращения зависания
                    const timeout = setTimeout(() => {
                        resolve('');
                    }, 5000); // 5 секунд таймаут
                    
                    img.onload = function() {
                        clearTimeout(timeout);
                        try {
                            // Пытаемся извлечь EXIF данные если библиотека доступна
                            if (window.EXIF) {
                                EXIF.getData(img, function() {
                                    const description = EXIF.getTag(this, "ImageDescription") || '';
                                    resolve(description);
                                });
                            } else {
                                resolve('');
                            }
                        } catch (error) {
                            resolve('');
                        }
                    };
                    
                    img.onerror = function() {
                        clearTimeout(timeout);
                        resolve('');
                    };
                    
                    // Добавляем временную метку для предотвращения кэширования
                    img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
                });
            }
            
            // Основная функция загрузки данных с GitHub
            async function loadFromGitHub() {
                try {
                    console.log('🔄 Загрузка списка файлов с GitHub...');
                    
                    // Кодируем папку обратно для URL
                    const encodedFolder = encodeURIComponent(GITHUB_FOLDER);
                    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodedFolder}?ref=${GITHUB_BRANCH}`;
                    
                    const response = await fetch(apiUrl);
                    
                    if (!response.ok) {
                        throw new Error(`GitHub API ответил с кодом: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    // Фильтруем только PNG и JPG файлы
                    const imageFiles = data.filter(item => {
                        if (item.type !== 'file') return false;
                        const fileName = item.name.toLowerCase();
                        return fileName.endsWith('.jpg') || 
                               fileName.endsWith('.jpeg') || 
                               fileName.endsWith('.png');
                    });
                    
                    console.log(`🖼️ Найдено ${imageFiles.length} изображений.`);
                    
                    // Создаем массив для хранения информации об изображениях
                    const imagesInfo = [];
                    
                    // Обрабатываем каждое изображение
                    for (const item of imageFiles) {
                        const displayTitle = item.name.replace(/\.[^.]+$/, "");
                        
                        // Извлекаем description из метаданных изображения
                        const description = await extractImageDescription(item.download_url);
                        
                        imagesInfo.push({
                            title: item.name,
                            displayTitle: displayTitle,
                            directUrl: item.download_url,
                            thumbnailUrl: item.download_url,
                            description: description,
                            uuid: item.sha
                        });
                    }
                    
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
                
                if (!entries || entries.length === 0) {
                    container.innerHTML = `
                        <div class="no-media">
                          <p>В указанной папке на GitHub не найдено файлов-изображений.</p>
                        </div>
                    `;
                    return;
                }
                
                const galleryHtml = `
                    <div class="media-gallery-captions">
                        ${entries.map((entry) => {
                            const displayTitle = entry.displayTitle;
                            const description = entry.description || '';
                            
                            return `
                                <a href="${entry.directUrl}" 
                                   class="media-item"
                                   data-fancybox="${GALLERY_ID}"
                                   data-caption="<div style='text-align:center;'>
                                                   <h4 style='margin:0 0 8px 0; color:white;'>${escapeHtml(displayTitle)}</h4>
                                                   ${description ? `<p style='margin:0; color:#ccc; font-size:14px; max-width:600px;'>${escapeHtml(description)}</p>` : ''}
                                                 </div>"
                                   data-thumb="${entry.thumbnailUrl}">
                                  
                                  <div class="media-image-container">
                                    <img src="${entry.thumbnailUrl}" 
                                         alt="${escapeHtml(displayTitle)}" 
                                         class="media-image"
                                         loading="lazy">
                                  </div>
                                  
                                  <div class="media-caption">
                                    <div class="media-title">${escapeHtml(displayTitle)}</div>
                                    ${description ? `<div class="media-description">${escapeHtml(description)}</div>` : ''}
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
            
            // Инициализация Fancybox
            function initFancyboxGallery() {
                if (typeof Fancybox === 'undefined') {
                    console.warn('Fancybox не загружен');
                    return;
                }
                
                const galleryItems = document.querySelectorAll(`[data-fancybox="${GALLERY_ID}"]`);
                
                if (galleryItems.length > 0) {
                    Fancybox.bind(galleryItems, {
                        Thumbs: { autoStart: false }
                    });
                }
            }
            
            // Загружаем библиотеку EXIF только если есть изображения
            async function loadEXIFLibraryIfNeeded() {
                // Проверяем, нужна ли вообще библиотека EXIF
                // Загружаем её асинхронно
                if (!window.EXIF) {
                    return new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/exif-js';
                        script.async = true;
                        script.onload = resolve;
                        script.onerror = resolve; // Если не загрузится, продолжаем без неё
                        document.head.appendChild(script);
                    });
                }
            }
            
            // Основная функция инициализации
            async function initGallery() {
                try {
                    // Загружаем EXIF библиотеку параллельно с другими операциями
                    const exifPromise = loadEXIFLibraryIfNeeded();
                    
                    // Загружаем данные с GitHub
                    const dataPromise = loadFromGitHub();
                    
                    // Ждем оба промиса
                    const [entries] = await Promise.all([dataPromise, exifPromise]);
                    
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