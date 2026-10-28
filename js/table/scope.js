(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  const tableModule = (ByeStat.table = ByeStat.table || {});
  const { h, setText } = ByeStat.dom;
  const { SCOPES, normalizeScope } = ByeStat.frequency;

  function createControl(language) {
    const label = h("span", { class: "scope-label" });
    const select = h("select", {
      class: "scope-select",
      id: "table-analysis-scope",
    });
    const element = h(
      "label",
      { class: "scope-control", attrs: { for: select.id } },
      label,
      h("span", { class: "scope-select-wrap" }, select),
    );

    function applyLanguage() {
      const current = normalizeScope(select.value);
      setText(label, language.t("table.scope.label"));
      select.replaceChildren(
        ...SCOPES.map((scope) =>
          h("option", {
            value: scope,
            text: language.t(`table.scope.${scope}`),
          }),
        ),
      );
      select.value = current;
      select.setAttribute("aria-label", language.t("table.scope.aria"));
    }

    function setValue(scope) {
      select.value = normalizeScope(scope);
    }

    applyLanguage();
    return { applyLanguage, element, select, setValue };
  }

  tableModule.scope = { createControl, normalizeScope };
})(window);
