(function() {
    'use strict';
    
    // ФУНКЦИЯ для создания галереи с параметрами
    function createGallery(GALLERY_ID, title, subtitle, githubFolderUrl) {
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
                            
                            const response = await fetch(jsonUrl);
                            
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
                    
                    // Загружаем описания И список файлов параллельно
                    const [descriptionsData, filesData] = await Promise.all([
                        loadDescriptionsJSON(),
                        fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(GITHUB_FOLDER)}?ref=${GITHUB_BRANCH}`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`GitHub API: ${response.status}`);
                                }
                                return response.json();
                            })
                    ]);
                    
                    // Фильтруем только PNG и JPG файлы
                    const imageFiles = filesData.filter(item => {
                        if (item.type !== 'file') return false;
                        const fileName = item.name.toLowerCase();
                        return fileName.endsWith('.jpg') || 
                               fileName.endsWith('.jpeg') || 
                               fileName.endsWith('.png');
                    });

                    if(title == "")
                    {
                        title = descriptionsData[Object.keys(descriptionsData).find(key => 
                            key === "title"
                        )];
                    }

                    if(subtitle == "")
                    {
                        subtitle = descriptionsData[Object.keys(descriptionsData).find(key => 
                            key === "subtitle"
                        )];
                    }

                    console.log(`Заголовок: ${title}.`);
                    console.log(`Заголовок: ${title}.`);
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
                        
                        return {
                            title: item.name,
                            displayTitle: displayTitle,
                            directUrl: item.download_url,
                            thumbnailUrl: item.download_url,
                            description: description,
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
                          <p>В указанной папке на GitHub не найдено файлов-изображений.</p>
                        </div>
                    `;
                    return;
                }
                let galleryHtml = "";
                if(title != "null")
                    galleryHtml += `<div class="gallery-title"><h1>${title}</h1></div>`
                if(subtitle != "null")
                    galleryHtml += `<div class="gallery-subtitle"><h1>${subtitle}</h1></div>`

                 galleryHtml += `
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