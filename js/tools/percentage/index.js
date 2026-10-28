(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const entry = ByeStat.registry.find((tool) => tool.id === "percentage");
  const { calculate, formatExpression } = ByeStat.tools.percentage.calc;
  const { columnName } = ByeStat.storeState;

  function mount(root, store, workspace) {
    const table = workspace?.table;
    const language = workspace?.language;
    if (!table?.registerCellDisplay || !language) {
      throw new Error(
        language?.t("percentage.errors.workspace") ||
          "Relative Frequency requires the base table display extension.",
      );
    }

    let unregisterDisplay = null;
    let active = true;

    function createDisplayItem(text, label) {
      return { label, text };
    }

    function createCellItem(expression, labelFactory) {
      const text = formatExpression(expression);
      return createDisplayItem(text, labelFactory(text));
    }

    function createDisplayValues(state) {
      const scope = table.getAnalysisScope();
      const result = calculate(state, scope);
      const scopeLabel = language.t(`table.scope.${scope}`);
      const cells = result.cells.map((row, rowIndex) =>
        row.map((expression, colIndex) =>
          createCellItem(
            expression,
            (text) => language.t("percentage.cellAria", {
              column: columnName(colIndex),
              expression: text,
              mode: scopeLabel,
              row: rowIndex + 1,
            }),
          ),
        ),
      );
      if (!result.summary) return { cells, summary: null };
      return {
        cells,
        summary: {
          columnTotals: result.summary.columnTotals.map((expression, col) =>
            createCellItem(
              expression,
              (text) => language.t("percentage.columnTotalAria", {
                column: columnName(col),
                expression: text,
              }),
            ),
          ),
          grandTotal: createCellItem(
            result.summary.grandTotal,
            (text) =>
              language.t("percentage.grandTotalAria", { expression: text }),
          ),
          rowTotals: result.summary.rowTotals.map((expression, row) =>
            createCellItem(
              expression,
              (text) =>
                language.t("percentage.rowTotalAria", {
                  expression: text,
                  row: row + 1,
                }),
            ),
          ),
        },
      };
    }

    function registerDisplay() {
      if (!active) return;
      const previous = unregisterDisplay;
      unregisterDisplay = table.registerCellDisplay({
        id: "percentage",
        className: "tool-percentage",
        values: createDisplayValues,
      });
      previous?.();
    }

    function applyLanguage() {
      registerDisplay();
    }

    applyLanguage();
    const unsubscribeScope = table.subscribeAnalysisScope(registerDisplay);
    const unsubscribeLanguage = language.subscribe(applyLanguage);

    return function unmount() {
      if (!active) return;
      active = false;
      unsubscribeScope();
      unsubscribeLanguage();
      unregisterDisplay?.();
      unregisterDisplay = null;
      root.replaceChildren();
    };
  }

  ByeStat.toolModules = ByeStat.toolModules || {};
  ByeStat.toolModules.percentage = {
    id: "percentage",
    name: entry.name,
    description: entry.description,
    icon: entry.icon,
    styleHref: "css/tools/percentage.css",
    mount,
  };
})(window);
