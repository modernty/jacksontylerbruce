(function () {
  try {
    var ctx = document.createElement("canvas").getContext("2d");
    var probe = "mmmmmmmmmmlliWWMMwwii0Oo";
    var width = function (family) {
      ctx.font = "16px " + family;
      return ctx.measureText(probe).width;
    };
    var installed = ["serif", "sans-serif", "monospace"].some(function (generic) {
      return width('"New York", ' + generic) !== width(generic);
    });
    if (installed) return;
  } catch (e) { /* load the fallback */ }
  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;1,8..60,400&display=swap";
  document.head.appendChild(css);
})();
