(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const {
    STORAGE_KEY,
    clone,
    getDefaultState,
    nextColumnLabel,
    nextRowLabel,
    normalizeState,
  } = ByeStat.storeState;
  const HISTORY_LIMIT = 60;

  function createStore() {
    const persistence = ByeStat.persistence.createPersistence({
      key: STORAGE_KEY,
      delay: 300,
      onStatus: handleStatus,
    });
    let state = normalizeState(persistence.load() || getDefaultState());
    let history = [];
    let historyKey = null;
    let currentStatus = "saved";
    let disposed = false;
    const listeners = new Set();
    const statusListeners = new Set();

    function handleStatus(status) {
      currentStatus = status;
      statusListeners.forEach((listener) => {
        try {
          listener(status);
        } catch (error) {
          console.error("保存状态订阅回调失败。", error);
        }
      });
    }

    function broadcast(change) {
      listeners.forEach((listener) => {
        try {
          listener({ state: clone(state), change });
        } catch (error) {
          console.error(`工具订阅回调失败：${change.type}`, error);
        }
      });
    }

    function remember(recordHistory, mergeKey) {
      if (!recordHistory) return;
      if (mergeKey !== null && mergeKey === historyKey) return;

      history.push(clone(state));
      if (history.length > HISTORY_LIMIT) history.shift();
      historyKey = mergeKey;
    }

    function commit(nextState, change, options = {}) {
      if (disposed) return false;
      const { recordHistory = true, mergeKey = null } = options;
      remember(recordHistory, mergeKey);
      state = nextState;
      broadcast(change);
      persistence.scheduleSave(() => state);
      return true;
    }

    function updateCell(cell, options = {}) {
      const { kind, row, col } = cell;
      const value = String(cell.value ?? "");
      const nextState = clone(state);

      if (kind === "corner") {
        nextState.cornerLabel = value;
      } else if (kind === "column" && nextState.columns[col] !== undefined) {
        nextState.columns[col] = value;
      } else if (kind === "row" && nextState.rows[row]) {
        nextState.rows[row].label = value;
      } else if (
        kind === "number" &&
        nextState.rows[row]?.values[col] !== undefined
      ) {
        nextState.rows[row].values[col] = value;
      } else {
        return false;
      }

      const currentValue =
        kind === "corner"
          ? state.cornerLabel
          : kind === "column"
            ? state.columns[col]
            : kind === "row"
              ? state.rows[row].label
              : state.rows[row].values[col];
      if (currentValue === value) return false;

      return commit(nextState, { type: "cell", kind, row, col }, options);
    }

    function insertRow(index) {
      const nextState = clone(state);
      const target = Math.min(Math.max(index, 0), nextState.rows.length);
      nextState.rows.splice(target, 0, {
        label: nextRowLabel(nextState),
        values: nextState.columns.map(() => "0"),
      });
      historyKey = null;
      return commit(nextState, { type: "structure", action: "insert-row", index: target });
    }

    function deleteRow(index) {
      if (state.rows.length <= 1) return false;
      const nextState = clone(state);
      const target = Math.min(Math.max(index, 0), nextState.rows.length - 1);
      nextState.rows.splice(target, 1);
      historyKey = null;
      return commit(nextState, { type: "structure", action: "delete-row", index: target });
    }

    function insertColumn(index) {
      const nextState = clone(state);
      const target = Math.min(Math.max(index, 0), nextState.columns.length);
      nextState.columns.splice(target, 0, nextColumnLabel(nextState));
      nextState.rows.forEach((row) => row.values.splice(target, 0, "0"));
      historyKey = null;
      return commit(nextState, { type: "structure", action: "insert-column", index: target });
    }

    function deleteColumn(index) {
      if (state.columns.length <= 1) return false;
      const nextState = clone(state);
      const target = Math.min(Math.max(index, 0), nextState.columns.length - 1);
      nextState.columns.splice(target, 1);
      nextState.rows.forEach((row) => row.values.splice(target, 1));
      historyKey = null;
      return commit(nextState, { type: "structure", action: "delete-column", index: target });
    }

    function reset() {
      historyKey = null;
      return commit(getDefaultState(), { type: "reset" }, { mergeKey: null });
    }

    function undo() {
      if (!history.length) return false;
      state = history.pop();
      historyKey = null;
      broadcast({ type: "undo" });
      persistence.scheduleSave(() => state);
      return true;
    }

    function getState() {
      return clone(state);
    }

    function subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    function subscribeStatus(listener) {
      statusListeners.add(listener);
      listener(currentStatus);
      return () => statusListeners.delete(listener);
    }

    function endEdit() {
      historyKey = null;
    }

    function canUndo() {
      return history.length > 0;
    }

    function dispose() {
      disposed = true;
      persistence.dispose();
      listeners.clear();
      statusListeners.clear();
    }

    return {
      canUndo,
      deleteColumn,
      deleteRow,
      dispose,
      endEdit,
      getState,
      insertColumn,
      insertRow,
      reset,
      subscribe,
      subscribeStatus,
      undo,
      updateCell,
    };
  }

  ByeStat.store = { createStore };
})(window);
