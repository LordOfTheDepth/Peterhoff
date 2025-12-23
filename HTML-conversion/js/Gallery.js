(function() {
    'use strict';
    
    // ФУНКЦИЯ для создания галереи с параметрами
    // Добавлен параметр githubToken (необязательный)
    function createGallery(GALLERY_ID, title, subtitle, githubFolderUrl) {
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
            
            // Функция для усечения текста с добавлением "..."
            function truncateText(text, maxLength) {
                if (!text || text.length <= maxLength) {
                    return text;
                }
                // Обрезаем до maxLength символов и добавляем многоточие
                return text.substring(0, maxLength) + ' ...';
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
            
            // Функция для загрузки JSON файла с описаниями
            async function loadDescriptionsJSON() {
                try {
                    const encodedFolder = encodeURIComponent(GITHUB_FOLDER);
                    
                    // Пробуем разные имена файлов
                    const possibleNames = [
                        'descriptions.json',
                        'description.json',
                        'metadata.json',
                        'info.json'
                    ];
                    
                    for (const fileName of possibleNames) {
                        try {
                            const jsonUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodedFolder}/${fileName}?ref=${GITHUB_BRANCH}`;
                            
                            console.log(`Пытаюсь загрузить: ${jsonUrl}`);
                            
                            const response = await fetchGitHubAPI(jsonUrl);
                            
                            if (response.ok) {
                                const fileData = await response.json();
                                if (fileData.content) {
                                    // Правильно декодируем base64 с UTF-8
                                    const content = decodeBase64UTF8(fileData.content);
                                    const jsonData = JSON.parse(content);
                                    console.log('✅ JSON файл загружен:', jsonData);
                                    return jsonData;
                                }
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
            
            // Основная функция загрузки данных с GitHub
            async function loadFromGitHub() {
                try {
                    console.log('🔄 Загрузка списка файлов с GitHub...');
                    
                    const encodedFolder = encodeURIComponent(GITHUB_FOLDER);
                    
                    // Загружаем описания И список файлов параллельно
                    const [descriptionsData, filesResponse] = await Promise.all([
                        loadDescriptionsJSON(),
                        fetchGitHubAPI(`https://api.github.com/repos/${GITHUB_REPO}/contents/${encodedFolder}?ref=${GITHUB_BRANCH}`)
                    ]);
                    
                    const filesData = await filesResponse.json();
                    
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
                            directUrl: item.download_url,
                            thumbnailUrl: item.download_url,
                            description: description,
                            truncatedDescription: truncatedDescription,
                            uuid: item.sha
                        };
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