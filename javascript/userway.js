// javascript/userway.js

(function(d){
    var s = d.createElement("script");
    
    // ============================================================
    // IMPORTANTE: Você precisa criar uma conta no UserWay.org
    // e pegar o seu "Widget ID".
    // Substitua o texto 'SEU_ID_DO_USERWAY_AQUI' abaixo pelo seu ID real.
    // ============================================================
    s.setAttribute("data-account", "SEU_ID_DO_USERWAY_AQUI");
    
    s.setAttribute("src", "https://cdn.userway.org/widget.js");
    (d.body || d.head).appendChild(s);
 })(document);