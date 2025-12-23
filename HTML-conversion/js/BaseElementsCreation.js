
function createBaseElements(headerTitle, headerImageUrl)
{
    
  createElement("background","https://lordofthedepth.github.io/Peterhoff/HTML-conversion/html/Background.html")
  
  createElement("header","https://lordofthedepth.github.io/Peterhoff/HTML-conversion/html/PeterhofHeader.html").then(() => {insertHtml("page-title",headerTitle)}).then(() => 
{
    insertHtml("page-title-img", "<img src = headerImageUrl> </img>"

    )
});
  createElement("buttons","https://lordofthedepth.github.io/Peterhoff/HTML-conversion/html/PeterhofButtons.html?refresh=1")

  createElement("footer-container","https://lordofthedepth.github.io/Peterhoff/HTML-conversion/html/Footer.html?refresh=1")

}