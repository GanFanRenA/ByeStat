(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const tableModule = (ByeStat.table = ByeStat.table || {});

  function createRegistrar(viewState, key, refresh) {
    return function register(next) {
      if (!next || typeof next.values !== "function") return () => {};
      viewState[key] = next;
      refresh();
      let active = true;

      return function unregister() {
        if (!active) return;
        active = false;
        if (viewState[key] !== next) return;
        viewState[key] = null;
        refresh();
      };
    };
  }

  tableModule.extensions = {
    createDisplayRegistrar: (viewState, refresh) =>
      createRegistrar(viewState, "display", refresh),
    createSummaryRegistrar: (viewState, refresh) =>
      createRegistrar(viewState, "summary", refresh),
  };
})(window);
