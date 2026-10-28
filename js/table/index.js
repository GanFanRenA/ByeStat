(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const { adapt, render, view } = ByeStat.table;
  const { load, normalize, save } = ByeStat.table.selection;
  const { createControls } = ByeStat.table.controls;
  const {
    createDisplayRegistrar,
    createSummaryRegistrar,
  } = ByeStat.table.extensions;

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
      viewState.display,
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
        viewState.display,
      );
      save(viewState.selection);
      return;
    }
    drawTable(refs, store, viewState, focus);
  }

  function mount(root, store, language) {
    const refs = view.createView(root, language);
    const viewState = {
      analysisScope: "total",
      selection: load(),
      display: null,
      summary: null,
    };
    const scopeListeners = new Set();
    let destroyed = false;
    const refresh = () => drawTable(refs, store, viewState);
    const registerSummary = createSummaryRegistrar(viewState, refresh);
    const registerCellDisplay = createDisplayRegistrar(viewState, refresh);
    const controls = createControls({
      refs,
      store,
      viewState,
      onScopeChange(scope) {
        scopeListeners.forEach((listener) => {
          try {
            listener(scope);
          } catch (error) {
            console.error("统计范围订阅回调失败。", error);
          }
        });
      },
    });

    drawTable(refs, store, viewState);
    view.setScope(refs, viewState.analysisScope);
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
      getAnalysisScope: () => viewState.analysisScope,
      subscribeAnalysisScope(listener) {
        if (destroyed || typeof listener !== "function") return () => {};
        scopeListeners.add(listener);
        return () => scopeListeners.delete(listener);
      },
      registerSummary(nextSummary) {
        if (destroyed) return () => {};
        const unregister = registerSummary(nextSummary);
        return () => {
          if (!destroyed) unregister();
        };
      },
      registerCellDisplay(nextDisplay) {
        if (destroyed) return () => {};
        const unregister = registerCellDisplay(nextDisplay);
        return () => {
          if (!destroyed) unregister();
        };
      },
      dispose() {
        if (destroyed) return;
        destroyed = true;
        viewState.display = null;
        viewState.summary = null;
        scopeListeners.clear();
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
