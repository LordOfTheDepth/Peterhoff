
function createElement(id, link)
{
    // Возвращаем Promise для поддержки цепочки .then()
    return new Promise((resolve, reject) => {
        fetch(link)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                insertHtml(id, html);
                // Разрешаем Promise с DOM элементом после вставки
                const element = document.getElementById(id);
                if (element) {
                    resolve(element);
                } else {
                    reject(new Error(`Элемент с id "${id}" не найден после вставки`));
                }
                const scripts = element.querySelectorAll('script');
                scripts.forEach(script => {
                const newScript = document.createElement('script');
                newScript.textContent = script.textContent;
                
                // Копируем атрибуты
                Array.from(script.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                
                script.parentNode.replaceChild(newScript, script);
        });
            })
            .catch(error => {
                console.error(`Ошибка загрузки элемента ${id}:`, error);
                
                // Создаем заглушку в случае ошибки
                const errorHtml = `
                    <div style="padding: 20px; text-align: center; background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;">
                        <p>Элемент "${id}" временно недоступен</p>
                    </div>
                `;
                
                insertHtml(id, errorHtml);
                
                // Разрешаем Promise с элементом даже при ошибке загрузки
                const element = document.getElementById(id);
                if (element) {
                    resolve(element);
                } else {
                    reject(error);
                }
            });
    });
}

function insertHtml(id, html)
{
    const element = document.getElementById(id);
    if (element) {
        element.innerHTML = html;
        
        // Выполняем скрипты, если они есть в загруженном HTML
        const scripts = element.querySelectorAll('script');
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            
            // Копируем атрибуты
            Array.from(script.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            
            script.parentNode.replaceChild(newScript, script);
        });
    } else {
        console.log(`Элемент с id ${id} не найден`);
    }
}

// Дополнительная функция для создания элемента с колбэком
function createElementWithCallback(id, link, callback) {
    createElement(id, link)
        .then(element => {
            if (callback && typeof callback === 'function') {
                callback(element);
            }
        })
        .catch(error => {
            console.error(`Ошибка при создании элемента ${id}:`, error);
        });
}
