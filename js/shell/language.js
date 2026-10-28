(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const { h, icon, setText } = ByeStat.dom;
  const { languageTag, normalizeLocale, translate } = ByeStat.i18n;
  const STORAGE_KEY = "byestat-language-v1";

  function applyDocument(locale) {
    document.documentElement.lang = languageTag(locale);
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute("content", translate(locale, "meta.description"));
    }
  }

  function createLanguage() {
    const persistence = ByeStat.persistence.createPersistence({
      key: STORAGE_KEY,
      delay: 300,
    });
    let currentLocale = normalizeLocale(persistence.load());
    const listeners = new Set();

    function notify() {
      listeners.forEach((listener) => {
        try {
          listener(currentLocale);
        } catch (error) {
          console.error("Language subscriber failed.", error);
        }
      });
    }

    function setLocale(locale) {
      const nextLocale = normalizeLocale(locale);
      if (nextLocale === currentLocale) return;
      currentLocale = nextLocale;
      applyDocument(currentLocale);
      persistence.scheduleSave(() => currentLocale);
      notify();
    }

    function subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    function createToggle() {
      const label = h("span");
      const button = h(
        "button",
        { class: "language-toggle", type: "button" },
        icon([
          "M4 12h16",
          "M12 4a12 12 0 0 1 0 16",
          "M12 4a12 12 0 0 0 0 16",
          "M5.2 8h13.6",
          "M5.2 16h13.6",
        ]),
        label,
      );
      button.addEventListener("click", () => {
        setLocale(currentLocale === "zh" ? "en" : "zh");
      });
      const render = () => {
        setText(label, translate(currentLocale, "shell.language.target"));
        const action = translate(currentLocale, "shell.language.switch");
        button.title = action;
        button.setAttribute("aria-label", action);
      };
      subscribe(render);
      render();
      return button;
    }

    applyDocument(currentLocale);
    return {
      createToggle,
      get locale() {
        return currentLocale;
      },
      setLocale,
      subscribe,
      t: (key, parameters) => translate(currentLocale, key, parameters),
      toggle: () => setLocale(currentLocale === "zh" ? "en" : "zh"),
    };
  }

  ByeStat.shellLanguage = { createLanguage };
})(window);
