
function createBaseElements(headerTitle, headerImageUrl, button1, button2, button3)
{
    
  createElement("background","https://lordofthedepth.github.io/Peterhoff/HTML-conversion/html/Background.html")
  
  createElement("header","https://lordofthedepth.github.io/Peterhoff/HTML-conversion/html/PeterhofHeader.html").then(() => {insertHtml("page-title",headerTitle)}).then(() => 
{
  insertHtml("page-title-img", `<img src = ${headerImageUrl}> </img>`) 
  logoUrl = ""
  if(headerTitle.includes("Петергоф"))
  {
      logoUrl ="https://github.com/LordOfTheDepth/Peterhoff/blob/main/Misc/Log_PetergofAsset%201@4x.png?raw=true"
  }
  if(headerTitle.includes("Пушкин"))
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


}