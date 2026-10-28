(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});

  function createPersistence({ key, delay = 300, onStatus = () => {} }) {
    let timer = null;
    let disposed = false;

    function load() {
      try {
        const stored = global.localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
      } catch (error) {
        console.warn("无法读取已保存的数据，将使用初始数据。", error);
        return null;
      }
    }

    function scheduleSave(getState) {
      if (disposed) return;
      global.clearTimeout(timer);
      onStatus("saving");

      timer = global.setTimeout(() => {
        try {
          global.localStorage.setItem(key, JSON.stringify(getState()));
          onStatus("saved");
        } catch (error) {
          console.error("保存数据失败。", error);
          onStatus("error");
        }
      }, delay);
    }

    function dispose() {
      disposed = true;
      global.clearTimeout(timer);
      timer = null;
    }

    return { dispose, load, scheduleSave };
  }

  ByeStat.persistence = { createPersistence };
})(window);
