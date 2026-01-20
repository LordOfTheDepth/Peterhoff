
function createBaseElements(headerTitle, headerImageUrl, button1, button2, button3, locationId, stageId)
{
    
createElement("background","https://lordofthedepth.github.io/Peterhoff/HTML-conversion/html/Background.html")

createElement("header","https://lordofthedepth.github.io/Peterhoff/HTML-conversion/html/PeterhofHeader.html").then(() => {insertHtml("page-title",headerTitle)}).then(() => 
{
insertHtml("page-title-img", `<img src = ${headerImageUrl}> </img>`) 
logoUrl = ""
if(locationId == 1)
{
    logoUrl ="https://github.com/LordOfTheDepth/Peterhoff/blob/main/Misc/Log_PetergofAsset%201@4x.png?raw=true"
}
if(locationId == 2)
{
    logoUrl = "https://github.com/LordOfTheDepth/Peterhoff/blob/main/Misc/%D0%A6%D0%B0%D1%80%D1%81%D0%BA%D0%BE%D0%B5%20%D1%81%D0%B5%D0%BB%D0%BE.png?raw=true"
}
if(logoUrl != "")
{
  insertHtml("location-logo", `<img src = ${logoUrl}> </img>`)
}
  
});
createElement("buttons","https://lordofthedepth.github.io/Peterhoff/HTML-conversion/html/PeterhofButtons.html?refresh=1")
.then(() => {insertHtml("button1",`<a href="https://spbarchives.ru/${button1}">До войны</a>`)})
.then(() => {insertHtml("button2",`<a href="https://spbarchives.ru/${button2}">Разрушение</a>`)})
.then(() => {insertHtml("button3",`<a href="https://spbarchives.ru/${button3}">Восстановление</a>`)})

createElement("footer-container","https://lordofthedepth.github.io/Peterhoff/HTML-conversion/html/Footer.html?refresh=1")


beforeCode = "%D0%B4%D0%BE%20%D0%B2%D0%BE%D0%B9%D0%BD%D1%8B"
destructionCode = "%D1%80%D0%B0%D0%B7%D1%80%D1%83%D1%88%D0%B5%D0%BD%D0%B8%D1%8F"
restorationCode = "%D0%B2%D0%BE%D1%81%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5"
stages = [beforeCode,destructionCode,restorationCode]
locations = ["Peterhof","Pushkin","Pavlovsk"]
textURL = ""


textURL = `https://lordofthedepth.github.io/Peterhoff/Sorted/${locations[locationId-1]}/${stages[stageId-1]}/text.html`

createElement("main-text-container", textURL)

}

