(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const tableModule = (ByeStat.table = ByeStat.table || {});
  const SELECTION_KEY = "byestat-table-selection-v1";

  function load() {
    try {
      const saved = global.localStorage.getItem(SELECTION_KEY);
      return saved ? JSON.parse(saved) : { row: 0, col: 0 };
    } catch {
      return { row: 0, col: 0 };
    }
  }

  function save(selection) {
    try {
      global.localStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
    } catch {
      // Selection is UI state; persistence is optional.
    }
  }

  function normalize(selection, state) {
    selection.row = Math.min(
      Math.max(Number(selection.row) || 0, 0),
      state.rows.length - 1,
    );
    selection.col = Math.min(
      Math.max(Number(selection.col) || 0, 0),
      state.columns.length - 1,
    );
  }

  tableModule.selection = { load, normalize, save };
})(window);
