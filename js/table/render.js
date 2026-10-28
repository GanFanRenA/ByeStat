(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const { h, setText } = ByeStat.dom;
  const { columnName } = ByeStat.storeState;
  const tableModule = (ByeStat.table = ByeStat.table || {});
  const tableScroll = ByeStat.table.scroll;
  const summaryRender = ByeStat.table.summary;

  function createInput(value, label, kind, coordinates = {}) {
    const input = h("input", {
      class: "cell-input",
      type: "text",
      value,
      autocomplete: "off",
      spellcheck: false,
      dataset: { cellKind: kind, ...coordinates },
      attrs: { "aria-label": label },
    });
    if (kind === "number") input.inputMode = "decimal";
    return input;
  }

  function cellShell(input, axis, corner = false) {
    return h(
      "div",
      { class: `cell-shell${corner ? " corner-shell" : ""}` },
      axis && h("span", { class: "axis-tag", text: axis }),
      input,
    );
  }

  function createHeadRow(refs, state, summary, summaryData) {
    const t = refs.language.t;
    const headRow = h(
      "tr",
      {},
      h(
        "th",
        { scope: "col" },
        cellShell(
          createInput(state.cornerLabel, t("table.cell.cornerAria"), "corner"),
          "",
          true,
        ),
      ),
    );
    state.columns.forEach((label, col) => {
      headRow.append(
        h(
          "th",
          { scope: "col", dataset: { col } },
          cellShell(
            createInput(
              label,
              t("table.cell.columnAria", { column: columnName(col) }),
              "column",
              { col },
            ),
            columnName(col),
          ),
        ),
      );
    });
    if (summaryData) {
      headRow.append(
        summaryRender.createSummaryHeading(
          summaryRender.resolveSummaryLabel(
            summary.rowLabel,
            refs.language,
            "margin.rowTotal",
          ),
          "column",
        ),
      );
    }
    return headRow;
  }

  function createBodyRow(
    refs,
    row,
    rowIndex,
    summary,
    summaryData,
    display,
    displayData,
  ) {
    const t = refs.language.t;
    const tr = h(
      "tr",
      {},
      h(
        "th",
        { scope: "row", dataset: { row: rowIndex } },
        cellShell(
          createInput(
            row.label,
            t("table.cell.rowAria", { row: rowIndex + 1 }),
            "row",
            { row: rowIndex },
          ),
          String(rowIndex + 1),
        ),
      ),
    );
    row.values.forEach((value, col) => {
      const derived =
        displayData &&
        summaryRender.createCellDisplay(
          display,
          displayData.cells[rowIndex]?.[col],
          rowIndex,
          col,
        );
      tr.append(
        h(
          "td",
          { dataset: { row: rowIndex, col } },
          createInput(
            value,
            t("table.cell.numberAria", {
              column: columnName(col),
              row: rowIndex + 1,
            }),
            "number",
            { row: rowIndex, col },
          ),
          derived,
        ),
      );
    });
    if (summaryData) {
      tr.append(
        summaryRender.createSummaryCell(
          "row-total",
          summaryRender.formatSummaryValue(
            summary,
            summaryData.rowTotals[rowIndex],
          ),
          t("table.cell.rowTotalAria", { row: rowIndex + 1 }),
          { row: rowIndex },
          display,
          displayData?.summary?.rowTotals[rowIndex],
        ),
      );
    }
    return tr;
  }

  function setSummaryClass(refs, summary, enabled) {
    if (refs.activeSummaryClass) {
      refs.table.classList.remove(refs.activeSummaryClass);
    }
    refs.activeSummaryClass = enabled ? summary.className || "" : "";
    if (refs.activeSummaryClass) {
      refs.table.classList.add(refs.activeSummaryClass);
    }
  }

  function setDisplayClass(refs, display, enabled) {
    if (refs.activeDisplayClass) {
      refs.table.classList.remove(refs.activeDisplayClass);
    }
    refs.activeDisplayClass = enabled ? display.className || "" : "";
    if (refs.activeDisplayClass) {
      refs.table.classList.add(refs.activeDisplayClass);
    }
  }

  function renderTable(
    refs,
    state,
    selection,
    focusTarget = null,
    canUndo = false,
    summary = null,
    display = null,
  ) {
    const summaryData = summaryRender.getSummaryData(summary, state);
    const displayData = summaryRender.getCellDisplayData(display, state);
    setSummaryClass(refs, summary, Boolean(summaryData));
    setDisplayClass(refs, display, Boolean(displayData));
    refs.tableHead.replaceChildren();
    refs.tableBody.replaceChildren();
    refs.tableFoot.replaceChildren();
    refs.tableHead.append(createHeadRow(refs, state, summary, summaryData));

    state.rows.forEach((row, rowIndex) => {
      refs.tableBody.append(
        createBodyRow(
          refs,
          row,
          rowIndex,
          summary,
          summaryData,
          display,
          displayData,
        ),
      );
    });
    summaryRender.renderSummaryRow(
      refs,
      state,
      summary,
      summaryData,
      display,
      displayData?.summary,
    );

    syncView(refs, state, selection, canUndo, summary, display, displayData);
    requestAnimationFrame(() => {
      if (focusTarget) focusCell(refs, focusTarget.row, focusTarget.col);
      else tableScroll.revealSelection(refs, selection);
    });
  }

  function syncView(
    refs,
    state,
    selection,
    canUndo = false,
    summary = null,
    display = null,
    displayData = summaryRender.getCellDisplayData(display, state),
  ) {
    setText(refs.footerRowCount, state.rows.length);
    setText(refs.footerColumnCount, state.columns.length);
    setText(
      refs.selectionText,
      refs.language.t("table.selection.position", {
        column: columnName(selection.col),
        row: selection.row + 1,
      }),
    );
    refs.undoButton.disabled = !canUndo;
    refs.deleteRowButton.disabled = state.rows.length <= 1;
    refs.deleteColumnButton.disabled = state.columns.length <= 1;

    refs.table.querySelectorAll(".is-row-selected, .is-column-selected").forEach((cell) => {
      cell.classList.remove("is-row-selected", "is-column-selected");
    });
    refs.tableBody
      .querySelectorAll(`td[data-row="${selection.row}"]:not([data-margin])`)
      .forEach((cell) => cell.classList.add("is-row-selected"));
    refs.tableHead
      .querySelectorAll(`th[data-col="${selection.col}"]`)
      .forEach((cell) => cell.classList.add("is-column-selected"));
    summaryRender.syncSummary(
      refs,
      state,
      summary,
      display,
      displayData?.summary,
    );
    summaryRender.syncCellDisplay(refs, state, display, displayData);
  }

  function focusCell(refs, row, col) {
    let input = null;
    if (row === 0 && col === 0) {
      input = refs.table.querySelector('[data-cell-kind="corner"]');
    } else if (row === 0) {
      input = refs.table.querySelector(
        `[data-cell-kind="column"][data-col="${col - 1}"]`,
      );
    } else if (col === 0) {
      input = refs.table.querySelector(
        `[data-cell-kind="row"][data-row="${row - 1}"]`,
      );
    } else {
      input = refs.table.querySelector(
        `[data-cell-kind="number"][data-row="${row - 1}"][data-col="${col - 1}"]`,
      );
    }
    if (!input) return;
    input.focus({ preventScroll: true });
    input.select();
    tableScroll.revealCell(refs, input);
  }

  function showToast(refs, message) {
    global.clearTimeout(refs.toastTimer);
    setText(refs.toast, message);
    refs.toast.classList.add("is-visible");
    refs.toastTimer = global.setTimeout(() => {
      refs.toast.classList.remove("is-visible");
    }, 1800);
  }

  tableModule.render = { focusCell, renderTable, showToast, syncView };
})(window);
