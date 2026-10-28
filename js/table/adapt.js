(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const { columnName, normalizeNumber } = ByeStat.storeState;
  const tableScroll = ByeStat.table.scroll;
  const tableModule = (ByeStat.table = ByeStat.table || {});

  function sanitizeNumericDraft(rawValue) {
    const converted = rawValue
      .replace(/[，。]/g, ".")
      .replace(/[−–—]/g, "-")
      .replace(/,/g, "");
    const sign = converted.startsWith("-") ? "-" : "";
    const unsigned = converted.startsWith("-") ? converted.slice(1) : converted;
    const numericOnly = unsigned.replace(/[^\d.]/g, "");
    const dotIndex = numericOnly.indexOf(".");
    if (dotIndex === -1) return sign + numericOnly;
    return (
      sign +
      numericOnly.slice(0, dotIndex + 1) +
      numericOnly.slice(dotIndex + 1).replaceAll(".", "")
    );
  }

  function getInputKey(input) {
    return [
      input.dataset.cellKind,
      input.dataset.row ?? "",
      input.dataset.col ?? "",
    ].join(":");
  }

  function getGridPosition(input) {
    const kind = input.dataset.cellKind;
    if (kind === "corner") return { row: 0, col: 0 };
    if (kind === "column") {
      return { row: 0, col: Number(input.dataset.col) + 1 };
    }
    if (kind === "row") {
      return { row: Number(input.dataset.row) + 1, col: 0 };
    }
    return {
      row: Number(input.dataset.row) + 1,
      col: Number(input.dataset.col) + 1,
    };
  }

  function getCellSelection(input, fallback) {
    const kind = input.dataset.cellKind;
    if (kind === "number") {
      return {
        row: Number(input.dataset.row),
        col: Number(input.dataset.col),
      };
    }
    if (kind === "column") {
      return { row: fallback.row, col: Number(input.dataset.col) };
    }
    if (kind === "row") {
      return { row: Number(input.dataset.row), col: fallback.col };
    }
    return fallback;
  }

  function bind({ refs, store, controls }) {
    let editSession = null;
    const cleanups = [];
    const listen = (target, type, handler, options) => {
      target.addEventListener(type, handler, options);
      cleanups.push(() => target.removeEventListener(type, handler, options));
    };

    function updateSelection(input) {
      const next = getCellSelection(input, controls.getSelection());
      controls.setSelection(next);
    }

    function handleFocusIn(event) {
      const input = event.target.closest(".cell-input");
      if (!input) return;
      updateSelection(input);
      editSession = {
        key: getInputKey(input),
        original: input.value,
        kind: input.dataset.cellKind,
        row: Number(input.dataset.row),
        col: Number(input.dataset.col),
      };
      input.select();
      tableScroll.revealCell(refs, input);
    }

    function handleClick(event) {
      const input = event.target.closest(".cell-input");
      if (!input) return;
      if (document.activeElement !== input) {
        input.focus({ preventScroll: true });
      }
      input.select();
      tableScroll.revealCell(refs, input);
    }

    function writeInput(input) {
      const sessionKey = getInputKey(input);
      if (!editSession || editSession.key !== sessionKey) {
        editSession = {
          key: sessionKey,
          original: input.value,
          kind: input.dataset.cellKind,
          row: Number(input.dataset.row),
          col: Number(input.dataset.col),
        };
      }
      return store.updateCell(
        {
          kind: editSession.kind,
          row: editSession.row,
          col: editSession.col,
          value: input.value,
        },
        { mergeKey: sessionKey },
      );
    }

    function handleInput(event) {
      const input = event.target.closest(".cell-input");
      if (!input) return;
      if (input.dataset.cellKind === "number") {
        const sanitized = sanitizeNumericDraft(input.value);
        if (sanitized !== input.value) {
          const caret = Math.min(
            input.selectionStart ?? sanitized.length,
            sanitized.length,
          );
          input.value = sanitized;
          input.setSelectionRange(caret, caret);
        }
      }
      writeInput(input);
    }

    function normalizeInput(input) {
      const kind = input.dataset.cellKind;
      const t = refs.language.t;
      if (kind === "number") return normalizeNumber(input.value);
      if (kind === "corner") {
        return input.value.trim() || t("table.default.corner");
      }
      if (kind === "column") {
        return (
          input.value.trim() ||
          t("table.default.column", {
            column: columnName(Number(input.dataset.col)),
          })
        );
      }
      return (
        input.value.trim() ||
        t("table.default.row", { row: Number(input.dataset.row) + 1 })
      );
    }

    function handleBlur(event) {
      const input = event.target.closest(".cell-input");
      if (!input) return;
      const normalized = normalizeInput(input);
      if (normalized !== input.value) {
        input.value = normalized;
        writeInput(input);
      }
      store.endEdit();
      editSession = null;
    }

    function navigateAfterEnter(input) {
      const state = store.getState();
      const position = getGridPosition(input);
      let next;
      if (position.col < state.columns.length) {
        next = { row: position.row, col: position.col + 1 };
      } else if (position.row < state.rows.length) {
        next = { row: position.row + 1, col: 1 };
      } else {
        next = { row: 1, col: 1 };
      }
      tableModule.render.focusCell(refs, next.row, next.col);
    }

    function moveWithArrow(input, delta) {
      const state = store.getState();
      const position = getGridPosition(input);
      const row = Math.min(
        Math.max(position.row + delta.row, 0),
        state.rows.length,
      );
      const col = Math.min(
        Math.max(position.col + delta.col, 0),
        state.columns.length,
      );
      tableModule.render.focusCell(refs, row, col);
    }

    function cancelEdit(input) {
      if (!editSession) return;
      input.value = editSession.original;
      store.updateCell(
        {
          kind: editSession.kind,
          row: editSession.row,
          col: editSession.col,
          value: editSession.original,
        },
        { recordHistory: false },
      );
      store.endEdit();
      editSession = null;
      input.blur();
    }

    function handleKeydown(event) {
      const input = event.target.closest(".cell-input");
      if (!input || event.isComposing || event.keyCode === 229) return;

      if (event.key === "Enter") {
        event.preventDefault();
        navigateAfterEnter(input);
        return;
      }

      const direction = {
        ArrowUp: { row: -1, col: 0 },
        ArrowDown: { row: 1, col: 0 },
        ArrowLeft: { row: 0, col: -1 },
        ArrowRight: { row: 0, col: 1 },
      }[event.key];
      if (direction) {
        event.preventDefault();
        moveWithArrow(input, direction);
        return;
      }

      if (event.key === "Escape") {
        cancelEdit(input);
      }
    }

    function handleActionClick(event) {
      const button = event.target.closest("[data-action]");
      if (button) controls.runAction(button.dataset.action);
    }

    function handleUndo() {
      controls.undo();
    }

    function handleResetRequest() {
      refs.dialog.showModal();
    }

    function handleResetConfirm(event) {
      event.preventDefault();
      refs.dialog.close("confirm");
      controls.reset();
    }

    function handleDialogClick(event) {
      if (event.target === refs.dialog) refs.dialog.close("cancel");
    }

    listen(refs.table, "focusin", handleFocusIn);
    listen(refs.table, "click", handleClick);
    listen(refs.table, "input", handleInput);
    listen(refs.table, "blur", handleBlur, true);
    listen(refs.table, "keydown", handleKeydown);
    listen(refs.root, "click", handleActionClick);
    listen(refs.undoButton, "click", handleUndo);
    listen(refs.confirmReset, "click", handleResetConfirm);
    listen(refs.resetButton, "click", handleResetRequest);
    listen(refs.dialog, "click", handleDialogClick);

    return () => cleanups.forEach((cleanup) => cleanup());
  }

  tableModule.adapt = { bind };
})(window);
