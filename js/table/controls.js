(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const tableModule = (ByeStat.table = ByeStat.table || {});
  const { render, view } = tableModule;
  const { save } = tableModule.selection;
  const ACTION_KEYS = {
    "insert-row-above": "table.action.insertedRow",
    "insert-row-below": "table.action.insertedRow",
    "delete-row": "table.action.deletedRow",
    "insert-column-left": "table.action.insertedColumn",
    "insert-column-right": "table.action.insertedColumn",
    "delete-column": "table.action.deletedColumn",
  };

  function createControls({ onScopeChange, refs, store, viewState }) {
    function setSelection(next) {
      viewState.selection = next;
      save(next);
      render.syncView(
        refs,
        store.getState(),
        next,
        store.canUndo(),
        viewState.summary,
        viewState.display,
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

    function setScope(nextScope) {
      const scope = tableModule.scope.normalizeScope(nextScope);
      if (viewState.analysisScope === scope) return;
      viewState.analysisScope = scope;
      view.setScope(refs, scope);
      onScopeChange(scope);
    }

    return {
      getSelection: () => viewState.selection,
      reset,
      runAction,
      setSelection,
      setScope,
      undo,
    };
  }

  tableModule.controls = { createControls };
})(window);
