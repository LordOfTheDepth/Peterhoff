

function createElement(id, link)
{
    fetch(link)
        .then(response => response.text())
        .then(html => {
            document.getElementById(id).innerHTML = html;
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

