(function() {
    'use strict';
    
    
    // ФУНКЦИЯ для создания галереи с параметрами
    function createGallery(GALLERY_ID, title, subtitle, pagesFolderUrl) {
        try {
            // Парсим URL GitHub Pages
            const url = new URL(pagesFolderUrl);
            
            // Проверяем, что это GitHub Pages URL
            if (!url.hostname.includes('github.io')) {
                throw new Error('Неверный GitHub Pages URL. Ожидается URL вида https://username.github.io/repo/');
            }
            
            // Извлекаем путь из URL
            const pathParts = url.pathname.split('/').filter(part => part.length > 0);
            
            // Базовый URL и путь к папке
            const PAGES_BASE_URL = `https://${url.hostname}`;
            let PAGES_FOLDER = '';
            
            if (pathParts.length > 0) {
                // Проверяем, является ли последняя часть файлом (имеет расширение)
                const lastPart = pathParts[pathParts.length - 1];
                const hasExtension = lastPart.includes('.') && !lastPart.endsWith('/');
                
                if (hasExtension) {
                    // Это файл, папка - все кроме последней части
                    PAGES_FOLDER = pathParts.slice(0, -1).join('/');
                } else {
                    // Это папка
                    PAGES_FOLDER = pathParts.join('/');
                }
            }
            
            function escapeHtmlAttribute(url) {
                if (!url) return '';
                return String(url)
                    .replace(/&/g, '&amp;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            }
            
            // Функция для усечения текста с добавлением "..."
            function truncateText(text, maxLength) {
                if (!text || text.length <= maxLength) {
                    return text;
                }
                // Обрезаем до maxLength символов и добавляем многоточие
                return text.substring(0, maxLength) + ' ...';
            }
            
            // Функция для загрузки содержимого папки GitHub Pages
            async function fetchPagesContent(url) {
                try {
                    const response = await fetch(url);
                    
                    if (!response.ok) {
                        throw new Error(`GitHub Pages: ${response.status} ${response.statusText}`);
                    }
                    
                    return await response.text();
                } catch (error) {
                    console.error('Ошибка при запросе к GitHub Pages:', error);
                    throw error;
                }
            }
            
            // Функция для парсинга HTML листинга директории
            function parseDirectoryListing(htmlContent, baseUrl) {
                const contents = [];
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, 'text/html');
                
                // GitHub Pages генерирует простой список файлов
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
                    
                    // Создаем полный URL для файла
                    const fileUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
                    
                    contents.push({
                        name: name,
                        type: isDirectory ? 'dir' : 'file',
                        url: fileUrl
                    });
                });
                
                return contents;
            }
            
            // Функция для загрузки JSON файла с описаниями
            async function loadDescriptionsJSON() {
                try {
                    // Пробуем разные имена файлов
                    const possibleNames = [
                        'descriptions.json',
                        'description.json',
                        'metadata.json',
                        'info.json'
                    ];
                    
                    for (const fileName of possibleNames) {
                        try {
                            const jsonUrl = `${PAGES_BASE_URL}/${PAGES_FOLDER ? PAGES_FOLDER + '/' : ''}${fileName}`;
                            
                            console.log(`Пытаюсь загрузить: ${jsonUrl}`);
                            
                            const response = await fetch(jsonUrl);
                            
                            if (response.ok) {
                                const jsonData = await response.json();
                                console.log('✅ JSON файл загружен:', jsonData);
                                return jsonData;
                            }
                        } catch (e) {
                            console.log(`Файл ${fileName} не найден или ошибка:`, e.message);
                            continue;
                        }
                    }
                    
                    console.log('Не найден ни один JSON файл с описаниями');
                    return {}; // Возвращаем пустой объект
                } catch (error) {
                    console.log('Ошибка при загрузке JSON файла:', error.message);
                    return {};
                }
            }
            
            // Основная функция загрузки данных с GitHub Pages
            async function loadFromGitHubPages() {
                try {
                    console.log('🔄 Загрузка списка файлов с GitHub Pages...');
                    
                    // Создаем URL для загрузки содержимого папки
                    const folderUrl = `${PAGES_BASE_URL}/${PAGES_FOLDER ? PAGES_FOLDER + '/' : ''}`;
                    
                    // Загружаем описания И список файлов параллельно
                    const [descriptionsData, htmlContent] = await Promise.all([
                        loadDescriptionsJSON(),
                        fetchPagesContent(folderUrl)
                    ]);
                    
                    const filesData = parseDirectoryListing(htmlContent, folderUrl);
                    
                    // Фильтруем только PNG и JPG файлы
                    const imageFiles = filesData.filter(item => {
                        if (item.type !== 'file') return false;
                        const fileName = item.name.toLowerCase();
                        return fileName.endsWith('.jpg') || 
                               fileName.endsWith('.jpeg') || 
                               fileName.endsWith('.png');
                    });

                    if(title == "") {
                        title = descriptionsData[Object.keys(descriptionsData).find(key => 
                            key === "__title__"
                        )];
                    }

                    if(subtitle == "") {
                        subtitle = descriptionsData[Object.keys(descriptionsData).find(key => 
                            key === "__subtitle__"
                        )];
                    }

                    console.log(`Заголовок: ${title}.`);
                    console.log(`Подзаголовок: ${subtitle}.`);
                    console.log(`🖼️ Найдено ${imageFiles.length} изображений.`);
                    console.log('Загруженные описания:', descriptionsData);
                    
                    // Создаем массив для хранения информации об изображениях
                    const imagesInfo = imageFiles.map(item => {
                        const displayTitle = item.name.replace(/\.[^.]+$/, "");
                        
                        // Пробуем найти описание разными способами
                        let description = '';
                        
                        // 1. По полному имени файла (с расширением)
                        const fileNameKey = Object.keys(descriptionsData).find(key => 
                            key === item.name || 
                            decodeURIComponent(key) === item.name
                        );
                        
                        if (fileNameKey) {
                            description = descriptionsData[fileNameKey];
                        }
                        // 2. По имени без расширения
                        else {
                            const titleKey = Object.keys(descriptionsData).find(key => 
                                key === displayTitle || 
                                decodeURIComponent(key) === displayTitle ||
                                key.replace(/\.[^.]+$/, "") === displayTitle
                            );
                            
                            if (titleKey) {
                                description = descriptionsData[titleKey];
                            }
                        }
                        
                        // Создаем усеченную версию для миниатюры
                        const truncatedDescription = truncateText(description, 100);
                        
                        return {
                            title: item.name,
                            displayTitle: displayTitle,
                            directUrl: item.url,
                            thumbnailUrl: item.url,
                            description: description,
                            truncatedDescription: truncatedDescription,
                            uuid: item.name // Используем имя файла как идентификатор
                        };
                    });
                    
                    return imagesInfo;
                    
                } catch (error) {
                    console.error('❌ Ошибка при загрузке данных с GitHub Pages:', error);
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
                          <p>Ошибка соединения. Изображения не найдены.</p>
                        </div>
                    `;
                    return;
                }
                
                let galleryHtml = "";
                if(title && title !== "null") {
                    galleryHtml += `<div class="gallery-title"><h1>${escapeHtml(title)}</h1></div>`;
                }
                if(subtitle && subtitle !== "null") {
                    galleryHtml += `<div class="gallery-subtitle"><h2>${escapeHtml(subtitle)}</h2></div>`;
                }

                galleryHtml += `
                    <div class="media-gallery-captions">
                        ${entries.map((entry) => {
                            const displayTitle = entry.displayTitle;
                            const description = entry.description || '';
                            const truncatedDescription = entry.truncatedDescription || '';
                            
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
                                    ${truncatedDescription ? `<div class="media-description" title="${escapeHtml(description)}">${escapeHtml(truncatedDescription)}</div>` : ''}
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
                    const entries = await loadFromGitHubPages();
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
            console.error('❌ Ошибка при парсинге GitHub Pages URL:', error);
        }
    }
    
    // ЭКСПОРТ функции для использования извне
    window.createGallery = createGallery;
    
})();