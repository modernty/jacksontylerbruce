(function () {
  document.querySelectorAll("[data-read]").forEach(function (el) {
    el.textContent = getComputedStyle(document.documentElement).getPropertyValue(el.getAttribute("data-read")).trim();
  });

  var play = document.getElementById("motion-play");
  if (!play) return;
  play.addEventListener("click", function () {
    document.querySelectorAll(".motion-bar").forEach(function (bar) {
      bar.classList.toggle("is-on");
    });
  });
})();
