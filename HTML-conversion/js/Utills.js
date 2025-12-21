

function createElement(id, link)
{
    fetch(link)
        .then(response => response.text())
        .then(html => {
            insertHtml(id,html);
        })
        .catch(error => {
            console.error('Ошибка загрузки футера:', error);
            document.getElementById(id).innerHTML = `
                <footer style="padding: 20px; text-align: center; background: #333; color: white;">
                    <p>'элемент' временно недоступен</p>
                </footer>
            `;
        });
}

function insertHtml(id, html)
{
    var element = document.getElementById(id)
    if(element)
        element.innerHTML = html
    else
        console.log(`Элемент с id ${id} не найден`);
        
}
