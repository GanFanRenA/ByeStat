(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const { adapt, render, view } = ByeStat.table;
  const { load, normalize, save } = ByeStat.table.selection;
  const ACTION_KEYS = {
    "insert-row-above": "table.action.insertedRow",
    "insert-row-below": "table.action.insertedRow",
    "delete-row": "table.action.deletedRow",
    "insert-column-left": "table.action.insertedColumn",
    "insert-column-right": "table.action.insertedColumn",
    "delete-column": "table.action.deletedColumn",
  };

  function drawTable(refs, store, viewState, focus = false) {
    const state = store.getState();
    normalize(viewState.selection, state);
    render.renderTable(
      refs,
      state,
      viewState.selection,
      focus
        ? {
            row: viewState.selection.row + 1,
            col: viewState.selection.col + 1,
          }
        : null,
      store.canUndo(),
      viewState.summary,
    );
    save(viewState.selection);
  }

  function refreshTable(refs, store, viewState, change, focus = false) {
    const state = store.getState();
    normalize(viewState.selection, state);
    if (change.type === "cell") {
      render.syncView(
        refs,
        state,
        viewState.selection,
        store.canUndo(),
        viewState.summary,
      );
      save(viewState.selection);
      return;
    }
    drawTable(refs, store, viewState, focus);
  }

  function createControls({ refs, store, viewState }) {
    function setSelection(next) {
      viewState.selection = next;
      save(next);
      render.syncView(
        refs,
        store.getState(),
        next,
        store.canUndo(),
        viewState.summary,
      );
    }

    function runAction(action) {
      const selection = viewState.selection;
      let changed = false;
      if (action === "insert-row-above") {
        changed = store.insertRow(selection.row);
      } else if (action === "insert-row-below") {
        selection.row += 1;
        changed = store.insertRow(selection.row);
      } else if (action === "delete-row") {
        changed = store.deleteRow(selection.row);
      } else if (action === "insert-column-left") {
        changed = store.insertColumn(selection.col);
      } else if (action === "insert-column-right") {
        selection.col += 1;
        changed = store.insertColumn(selection.col);
      } else if (action === "delete-column") {
        changed = store.deleteColumn(selection.col);
      }
      if (changed) render.showToast(refs, refs.language.t(ACTION_KEYS[action]));
    }

    function undo() {
      if (store.undo()) {
        render.showToast(refs, refs.language.t("table.action.undo"));
      }
    }

    function reset() {
      viewState.selection = { row: 0, col: 0 };
      store.reset();
      render.showToast(refs, refs.language.t("table.action.reset"));
    }

    return {
      getSelection: () => viewState.selection,
      reset,
      runAction,
      setSelection,
      undo,
    };
  }

  function createSummaryRegistrar(refs, store, viewState) {
    return function registerSummary(nextSummary) {
      if (!nextSummary || typeof nextSummary.values !== "function") {
        return () => {};
      }
      viewState.summary = nextSummary;
      drawTable(refs, store, viewState);
      let active = true;

      return function unregisterSummary() {
        if (!active) return;
        active = false;
        if (viewState.summary !== nextSummary) return;
        viewState.summary = null;
        drawTable(refs, store, viewState);
      };
    };
  }

  function mount(root, store, language) {
    const refs = view.createView(root, language);
    const viewState = {
      selection: load(),
      summary: null,
    };
    let destroyed = false;
    const registerSummary = createSummaryRegistrar(refs, store, viewState);
    const controls = createControls({ refs, store, viewState });

    drawTable(refs, store, viewState);
    const cleanup = adapt.bind({ refs, store, controls });
    const unsubscribeLanguage = language.subscribe(() => {
      if (destroyed) return;
      view.applyLanguage(refs);
      drawTable(refs, store, viewState);
    });
    const unsubscribe = store.subscribe(({ state, change }) => {
      if (!destroyed) {
        refreshTable(refs, store, viewState, change, change.type !== "cell");
      }
    });

    return {
      registerSummary(nextSummary) {
        if (destroyed) return () => {};
        const unregister = registerSummary(nextSummary);
        return () => {
          if (!destroyed) unregister();
        };
      },
      dispose() {
        if (destroyed) return;
        destroyed = true;
        viewState.summary = null;
        cleanup();
        unsubscribe();
        unsubscribeLanguage();
        global.clearTimeout(refs.toastTimer);
        root.replaceChildren();
      },
    };
  }

  ByeStat.baseTable = { mount };
})(window);
