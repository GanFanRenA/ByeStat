(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const { h, icon, setText } = ByeStat.dom;
  const tableModule = (ByeStat.table = ByeStat.table || {});

  function toolButton(glyph, action, danger = false) {
    const className = `tool-button${danger ? " tool-button-danger" : ""}`;
    return h(
      "button",
      { class: className, type: "button", dataset: { action } },
      h("span", { class: "tool-icon", attrs: { "aria-hidden": "true" } }, glyph),
      h("span", { class: "tool-label" }),
    );
  }

  function setButtonCopy(button, title, label) {
    button.title = title;
    button.setAttribute("aria-label", title);
    setText(button.querySelector(".button-label, .tool-label"), label);
  }

  function createHistoryActions() {
    const undoButton = h(
      "button",
      { class: "button button-ghost", type: "button", disabled: true },
      icon(
        [
          "M8 5 3.5 9.5 8 14",
          "M4 9.5h7.2a4.8 4.8 0 1 1 0 9.6H8",
        ],
        "0 0 20 20",
      ),
      h("span", { class: "button-label" }),
    );
    const resetButton = h(
      "button",
      { class: "button button-quiet", type: "button" },
      icon(
        ["M14.5 5.5v4h-4", "M14.3 9.3A5.4 5.4 0 1 0 15.2 12"],
        "0 0 20 20",
      ),
      h("span", { class: "button-label" }),
    );
    return {
      undoButton,
      resetButton,
      actions: h("div", { class: "history-actions" }, undoButton, resetButton),
    };
  }

  function createToolbar(historyActions) {
    const rowGroupLabel = h("span", { class: "tool-group-label" });
    const columnGroupLabel = h("span", { class: "tool-group-label" });
    const selectionKicker = h("span", { class: "selection-kicker" });
    const selectionText = h("strong");
    const toolButtons = {
      "insert-row-above": toolButton("↑", "insert-row-above"),
      "insert-row-below": toolButton("↓", "insert-row-below"),
      "delete-row": toolButton("×", "delete-row", true),
      "insert-column-left": toolButton("←", "insert-column-left"),
      "insert-column-right": toolButton("→", "insert-column-right"),
      "delete-column": toolButton("×", "delete-column", true),
    };
    const rowGroup = h(
      "div",
      { class: "tool-group", role: "group" },
      rowGroupLabel,
      toolButtons["insert-row-above"],
      toolButtons["insert-row-below"],
      toolButtons["delete-row"],
    );
    const columnGroup = h(
      "div",
      { class: "tool-group", role: "group" },
      columnGroupLabel,
      toolButtons["insert-column-left"],
      toolButtons["insert-column-right"],
      toolButtons["delete-column"],
    );
    return {
      columnGroup,
      columnGroupLabel,
      deleteColumnButton: toolButtons["delete-column"],
      deleteRowButton: toolButtons["delete-row"],
      rowGroup,
      rowGroupLabel,
      selectionKicker,
      selectionText,
      toolbar: h(
        "div",
        { class: "editor-toolbar" },
        h("div", { class: "selection-summary" }, selectionKicker, selectionText),
        h(
          "div",
          { class: "toolbar-controls" },
          h("div", { class: "tool-groups" }, rowGroup, columnGroup),
          historyActions.actions,
        ),
      ),
      toolButtons,
    };
  }

  function createDialog() {
    const title = h("h2");
    const body = h("p");
    const cancelButton = h("button", {
      class: "button button-quiet",
      value: "cancel",
    });
    const confirmButton = h("button", {
      class: "button button-danger",
      id: "confirmReset",
      value: "confirm",
    });
    const dialog = h(
      "dialog",
      { class: "confirm-dialog" },
      h(
        "form",
        { method: "dialog" },
        h(
          "span",
          { class: "dialog-icon", attrs: { "aria-hidden": "true" } },
          icon([
            "M5 7.5h14",
            "M9 7.5V5h6v2.5",
            "M7.5 7.5l.8 12h7.4l.8-12",
          ]),
        ),
        title,
        body,
        h("div", { class: "dialog-actions" }, cancelButton, confirmButton),
      ),
    );
    return {
      body,
      cancelButton,
      confirmButton,
      confirmReset: confirmButton,
      dialog,
      title,
    };
  }

  function createSheet(refs) {
    refs.caption = h("caption");
    refs.table = h(
      "table",
      { id: "statsTable" },
      refs.caption,
      refs.tableHead,
      refs.tableBody,
      refs.tableFoot,
    );
    refs.sheetScroll = h(
      "div",
      { class: "sheet-scroll", tabindex: 0 },
      refs.table,
    );
  }

  function createEditorFooter(refs) {
    refs.footerDataLabel = h("p");
    refs.footerCountPrefix = h("span");
    refs.footerCountMiddle = h("span");
    refs.footerCountSuffix = h("span");
    refs.scopeControl = ByeStat.table.scope.createControl(refs.language);
    return h(
      "footer",
      { class: "editor-footer" },
      h(
        "div",
        { class: "footer-summary" },
        refs.footerDataLabel,
        h(
          "p",
          {},
          refs.footerCountPrefix,
          refs.footerRowCount,
          refs.footerCountMiddle,
          refs.footerColumnCount,
          refs.footerCountSuffix,
        ),
      ),
      refs.scopeControl.element,
    );
  }

  function createWorkspace(toolbar, refs, dialog) {
    refs.workspace = h(
      "section",
      { class: "workspace base-table" },
      h(
        "div",
        { class: "editor-card" },
        toolbar,
        h("div", { class: "sheet-frame" }, refs.sheetScroll),
        createEditorFooter(refs),
      ),
      dialog,
      refs.toast,
    );
    return refs.workspace;
  }

  function applyLanguage(refs) {
    const t = refs.language.t;
    refs.root.setAttribute("aria-label", t("table.workspaceAria"));
    refs.workspace.setAttribute("aria-label", t("table.workspaceAria"));
    refs.sheetScroll.setAttribute("aria-label", t("table.sheetAria"));
    setText(refs.caption, t("table.caption"));
    setText(refs.selectionKicker, t("table.selection.current"));
    setText(refs.footerDataLabel, t("table.footer.data"));
    setText(refs.footerCountPrefix, t("table.footer.prefix"));
    setText(refs.footerCountMiddle, t("table.footer.middle"));
    setText(refs.footerCountSuffix, t("table.footer.suffix"));
    refs.scopeControl.applyLanguage();
    refs.rowGroup.setAttribute("aria-label", t("table.toolbar.rowGroupAria"));
    refs.columnGroup.setAttribute(
      "aria-label",
      t("table.toolbar.columnGroupAria"),
    );
    setText(refs.rowGroupLabel, t("table.toolbar.row"));
    setText(refs.columnGroupLabel, t("table.toolbar.column"));
    refs.actions.setAttribute("aria-label", t("table.history.aria"));
    setButtonCopy(
      refs.undoButton,
      t("table.history.undoTitle"),
      t("table.history.undo"),
    );
    setButtonCopy(
      refs.resetButton,
      t("table.history.resetTitle"),
      t("table.history.reset"),
    );
    refs.resetButton.setAttribute("aria-label", t("table.history.resetAria"));
    const buttonCopy = {
      "insert-row-above": ["table.toolbar.insertAboveTitle", "table.toolbar.insertAboveLabel"],
      "insert-row-below": ["table.toolbar.insertBelowTitle", "table.toolbar.insertBelowLabel"],
      "delete-row": ["table.toolbar.deleteRowTitle", "table.toolbar.deleteLabel"],
      "insert-column-left": ["table.toolbar.insertLeftTitle", "table.toolbar.insertLeftLabel"],
      "insert-column-right": ["table.toolbar.insertRightTitle", "table.toolbar.insertRightLabel"],
      "delete-column": ["table.toolbar.deleteColumnTitle", "table.toolbar.deleteLabel"],
    };
    Object.entries(buttonCopy).forEach(([action, [titleKey, labelKey]]) => {
      setButtonCopy(refs.toolButtons[action], t(titleKey), t(labelKey));
    });
    setText(refs.title, t("table.dialog.title"));
    setText(refs.body, t("table.dialog.body"));
    setText(refs.cancelButton, t("table.dialog.cancel"));
    setText(refs.confirmButton, t("table.dialog.confirm"));
  }

  function createView(root, language) {
    root.classList.add("base-table-root");
    const refs = {
      language,
      root,
      tableHead: h("thead"),
      tableFoot: h("tfoot"),
      tableBody: h("tbody"),
      footerRowCount: h("strong", { text: "4" }),
      footerColumnCount: h("strong", { text: "4" }),
      toast: h("div", {
        class: "toast",
        role: "status",
        attrs: { "aria-live": "polite" },
      }),
    };
    createSheet(refs);
    const historyParts = createHistoryActions();
    const toolbarParts = createToolbar(historyParts);
    const dialogParts = createDialog();
    Object.assign(refs, historyParts, toolbarParts, dialogParts);
    refs.actions = historyParts.actions;
    root.replaceChildren(createWorkspace(toolbarParts.toolbar, refs, dialogParts.dialog));
    applyLanguage(refs);
    return refs;
  }

  function setScope(refs, scope) {
    refs.scopeControl.setValue(scope);
  }

  tableModule.view = { applyLanguage, createView, setScope };
})(window);
