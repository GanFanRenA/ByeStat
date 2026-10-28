(function (global) {
  "use strict";

  const ByeStat = (global.ByeStat = global.ByeStat || {});
  ByeStat.toolSections = [
    {
      id: "analysis",
      i18n: { name: "shell.nav.statistics" },
    },
    {
      id: "graph",
      i18n: { name: "shell.nav.graph" },
      scrollOnOpen: true,
    },
  ];
  ByeStat.registry = [
    {
      id: "margin",
      section: "analysis",
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
    {
      id: "percentage",
      section: "analysis",
      name: "Relative Frequency",
      description: "View relative distribution by row, column, or overall",
      i18n: {
        name: "tools.percentage.name",
        description: "tools.percentage.description",
      },
      icon: ["M12 3a9 9 0 1 0 9 9", "M12 3v9h9", "M15 6.5a6 6 0 0 1 2.5 2.5"],
      scripts: [
        "js/tools/percentage/calc.js",
        "js/tools/percentage/index.js",
      ],
    },
    {
      id: "bar-chart",
      section: "graph",
      name: "Bar chart",
      description: "Compare values from a table metric",
      i18n: {
        name: "tools.barChart.name",
        description: "tools.barChart.description",
      },
      icon: [
        "M4 20V10",
        "M9.3 20V5",
        "M14.7 20V13",
        "M20 20V8",
        "M2.5 20.5h19",
      ],
      scripts: [
        "js/tools/bar-chart/calc.js",
        "js/tools/bar-chart/chart.js",
        "js/tools/bar-chart/view.js",
        "js/tools/bar-chart/index.js",
      ],
    },
    {
      id: "mosaic-plot",
      section: "graph",
      name: "Mosaic plot",
      description: "Show proportional structure across table targets",
      i18n: {
        name: "tools.mosaicPlot.name",
        description: "tools.mosaicPlot.description",
      },
      icon: [
        "M3.5 4.5h7v15h-7z",
        "M10.5 4.5h10v6h-10z",
        "M10.5 10.5h4.5v9h-4.5z",
        "M15 10.5h5.5v9H15z",
      ],
      scripts: [
        "js/tools/mosaic-plot/calc.js",
        "js/tools/mosaic-plot/chart.js",
        "js/tools/mosaic-plot/view.js",
        "js/tools/mosaic-plot/index.js",
      ],
    },
  ];
})(window);
