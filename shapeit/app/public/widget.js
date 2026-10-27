/* ShapeIt embed widget (CAP-008)
   <script src=".../widget.js" data-app="..." data-key="pk_live_..." data-changelog="1" async></script>
*/
(function () {
  if (window.__shapeitWidgetLoaded) return;
  window.__shapeitWidgetLoaded = true;

  var script = document.currentScript;
  var appBase =
    (script && script.getAttribute("data-app")) ||
    "https://shigotoku-shapeit-app.web.app";
  var showCl = script && script.getAttribute("data-changelog") === "1";
  var projectKey = (script && script.getAttribute("data-key")) || "";

  var wrap = document.createElement("div");
  wrap.style.cssText =
    "position:fixed;right:16px;bottom:16px;z-index:2147483646;display:flex;flex-direction:column;gap:8px;align-items:flex-end;";

  function makeBtn(label, bg, onClick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.style.cssText =
      "min-height:48px;padding:12px 18px;border:0;border-radius:999px;background:" +
      bg +
      ";color:#fff;font:600 14px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(15,42,36,.25);";
    btn.addEventListener("click", onClick);
    return btn;
  }

  wrap.appendChild(
    makeBtn("気づき", "#1F6F5B", function () {
      var url =
        appBase.replace(/\/$/, "") +
        "/capture?pageUrl=" +
        encodeURIComponent(location.href) +
        "&pageTitle=" +
        encodeURIComponent(document.title || "");
      if (projectKey) url += "&projectKey=" + encodeURIComponent(projectKey);
      window.open(url, "shapeit-capture", "noopener,noreferrer,width=480,height=720");
    }),
  );

  if (showCl) {
    wrap.appendChild(
      makeBtn("Changelog", "#0F2A24", function () {
        window.open(appBase.replace(/\/$/, "") + "/public/changelog", "_blank", "noopener,noreferrer");
      }),
    );
  }

  function mount() {
    document.body.appendChild(wrap);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
