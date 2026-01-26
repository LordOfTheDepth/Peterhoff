
function createBaseElements(headerTitle, headerImageUrl, button1, button2, button3, locationId, stageId)
{
    
beforeCode = "%D0%B4%D0%BE%20%D0%B2%D0%BE%D0%B9%D0%BD%D1%8B"
destructionCode = "%D1%80%D0%B0%D0%B7%D1%80%D1%83%D1%88%D0%B5%D0%BD%D0%B8%D1%8F"
restorationCode = "%D0%B2%D0%BE%D1%81%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5"
stagesCodes = [beforeCode,destructionCode,restorationCode]
stages = ["До войны", "Разрушения", "Восстановление"]
locations = ["Петергоф","Пушкин","Павловск"]
headerImages = [[
"https://github.com/LordOfTheDepth/Peterhoff/blob/main/Misc/verh_Ptrg.jpg?raw=true",
"https://github.com/LordOfTheDepth/Peterhoff/blob/main/Misc/verh_Ptrg_war.jpg?raw=true",
"https://github.com/LordOfTheDepth/Peterhoff/blob/main/Misc/verh_Ptrg_vosst.jpg?raw=true",
],[
"https://github.com/LordOfTheDepth/Peterhoff/blob/main/Misc/verh_push_dovoin.jpg?raw=true",
"https://github.com/LordOfTheDepth/Peterhoff/blob/main/Misc/verh_push_razrush.jpg?raw=true",
"https://github.com/LordOfTheDepth/Peterhoff/blob/main/Misc/verh_push_vosst.jpg?raw=true",
],[
"https://github.com/LordOfTheDepth/Peterhoff/blob/main/Misc/verh_pavl_01.jpg?raw=true",
"https://github.com/LordOfTheDepth/Peterhoff/blob/main/Misc/verh_pavl_03.jpg?raw=true",
"https://github.com/LordOfTheDepth/Peterhoff/blob/main/Misc/verh_pavl_02.jpg?raw=true",
]]


headerTitle = `${locations[locationId-1]} : ${stages[stageId-1]}`

createElement("background","https://lordofthedepth.github.io/Peterhoff/HTML-conversion/html/Background.html")

createElement("header","https://lordofthedepth.github.io/Peterhoff/HTML-conversion/html/PeterhofHeader.html").then(() => {insertHtml("page-title",headerTitle)}).then(() => 
{
insertHtml("page-title-img", `<img src = ${headerImages[locationId-1][stageId-1]}> </img>`) 
  
});
createElement("buttons","https://lordofthedepth.github.io/Peterhoff/HTML-conversion/html/PeterhofButtons.html?refresh=1")
.then(() => {insertHtml("button1",`<a href="https://spbarchives.ru/${button1}">До войны</a>`)})
.then(() => {insertHtml("button2",`<a href="https://spbarchives.ru/${button2}">Разрушения</a>`)})
.then(() => {insertHtml("button3",`<a href="https://spbarchives.ru/${button3}">Восстановление</a>`)})





const initialUrl = `https://lordofthedepth.github.io/Peterhoff/SortedMap/${locations[locationId-1]}/${stagesCodes[stageId-1]}`;
textURL = initialUrl + "/text.html"

createElement("main-text-container", textURL)

initAllGalleries(initialUrl)


createElement("footer-container","https://lordofthedepth.github.io/Peterhoff/HTML-conversion/html/Footer.html?refresh=1")


const GALLERIES_CONTAINER_ID = 'gallery-1';
    

// Функция для загрузки map.json напрямую
async function loadMapJSON() {
    try {
        // Парсим URL
        const urlParts = initialUrl.split('/');
        const GITHUB_REPO = `${urlParts[3]}/${urlParts[4]}`;
        const GITHUB_BRANCH = urlParts[6];
        const GITHUB_FOLDER = urlParts.slice(7).join('/');
        
        const encodedFolder = encodeURIComponent(GITHUB_FOLDER);
        const mapJsonUrl = `${initialUrl}/map.json`;
        
        console.log(`Загружаем map.json: ${mapJsonUrl}`);
        
        const response = await fetch(mapJsonUrl);
        
        if (!response.ok) {
            throw new Error(`Ошибка загрузки map.json: ${response.status} ${response.statusText}`);
        }
        
        const jsonData = await response.json();
        console.log('✅ map.json загружен');
        return jsonData;
    } catch (error) {
        console.error('❌ Ошибка при загрузке map.json:', error);
        throw error;
    }
}

// Функция для создания контейнеров галерей
function createGalleryContainers(folderNames) {
    const container = document.getElementById(GALLERIES_CONTAINER_ID);
    
    if (!container) {
        console.error(`❌ Контейнер с id="${GALLERIES_CONTAINER_ID}" не найден`);
        return;
    }
    
    folderNames.forEach((folderName, index) => {
        // Создаем уникальный ID для галереи
        const galleryId = `gallery-${folderName.replace(/\s+/g, '-').toLowerCase()}-${index}`;
        
        // Создаем контейнер для галереи
        const galleryContainer = document.createElement('div');
        galleryContainer.id = galleryId;
        galleryContainer.className = 'gallery-container';
        
        container.appendChild(galleryContainer);
    });
}

// Функция для инициализации всех галерей
async function initAllGalleries(initialUrl) {
    try {
        console.log('🚀 Начинаю инициализацию всех галерей...');
        
        // Загружаем map.json
        const mapData = await loadMapJSON();
        
        if (!mapData || !mapData.folders) {
            console.warn('❌ В map.json нет папок или файл пустой');
            return;
        }
        
        // Получаем список названий папок
        const folderNames = Object.keys(mapData.folders);
        
        if (folderNames.length === 0) {
            console.warn('❌ В map.json не найдено папок');
            return;
        }
        
        console.log(`📁 Найдено ${folderNames.length} папок:`, folderNames);
        
        // Создаем контейнеры для галерей
        createGalleryContainers(folderNames);
        
        // Инициализируем галереи для каждой папки
        folderNames.forEach((folderName, index) => {
            const galleryId = `gallery-${index + 1}`;
            
            console.log(`🖼️ Создаю галерею для папки: "${folderName}" (ID: ${galleryId})`);
            
            // Создаем галерею с помощью createGallery
            window.createGallery(galleryId, folderName, initialUrl);
        });
        
        console.log('✅ Все галереи инициализированы');
        
    } catch (error) {
        console.error('❌ Ошибка при инициализации галерей:', error);
        
        const container = document.getElementById(GALLERIES_CONTAINER_ID);
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>Ошибка загрузки галерей</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
}
}