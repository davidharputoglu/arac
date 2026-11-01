/*
 * Araç — intégration dans une page web.
 *
 * À coller dans votre page, à l'endroit voulu :
 *
 *   <div id="arac"></div>
 *   <script src="https://votre-site.fr/arac/embed.js" data-target="#arac" defer></script>
 *
 * Options (attributs du <script>) :
 *   data-target   sélecteur de l'élément qui accueille Araç (sinon : juste après le script)
 *   data-lang     langue imposée : fr, en, es, pt, it, tr, az, uz, kk, tk, ky, tt, ug
 *   data-theme    thème : turquoise, noir, sombre, clair
 *   data-height   hauteur minimale en pixels (par défaut 640)
 *
 * Licence : GNU GPL v3 ou ultérieure — © 2026 David HARPUTOGLU
 */
(function () {
    var script = document.currentScript
    if (!script) return
    var base = script.src.replace(/embed\.js(\?.*)?$/, '')
    var params = []
    if (script.dataset.lang) params.push('lang=' + encodeURIComponent(script.dataset.lang))
    if (script.dataset.theme) params.push('theme=' + encodeURIComponent(script.dataset.theme))
    var minHeight = parseInt(script.dataset.height || '640', 10)

    var frame = document.createElement('iframe')
    frame.src = base + 'index.html' + (params.length ? '?' + params.join('&') : '')
    frame.title = 'Araç'
    frame.loading = 'lazy'
    frame.setAttribute('allow', 'clipboard-write')
    frame.style.cssText = 'display:block;width:100%;border:0;border-radius:16px;min-height:' + minHeight + 'px;height:' + minHeight + 'px;'

    var target = script.dataset.target ? document.querySelector(script.dataset.target) : null
    if (target) target.appendChild(frame)
    else script.parentNode.insertBefore(frame, script.nextSibling)

    // La page Araç envoie sa hauteur : le cadre s'adapte, sans barre de défilement.
    var origin = new URL(base, location.href).origin
    window.addEventListener('message', function (e) {
        if (e.origin !== origin || e.source !== frame.contentWindow) return
        var d = e.data
        if (d && d.arac === 'height' && typeof d.value === 'number') {
            frame.style.height = Math.max(minHeight, Math.ceil(d.value)) + 'px'
        }
    })
})()
