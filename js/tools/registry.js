(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  ByeStat.registry = [
    {
      id: "margin",
      name: "Margin",
      description: "为统计表追加行列总计",
      i18n: {
        name: "tools.margin.name",
        description: "tools.margin.description",
      },
      icon: ["M4 5h16v14H4z", "M4 9h12", "M16 5v14", "M7 15h5"],
      scripts: [
        "js/tools/margin/calc.js",
        "js/tools/margin/index.js",
      ],
    },
  ];
})(window);
