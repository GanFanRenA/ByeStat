# AGENTS.md

ByeStat 是一个可通过 `file://` 直接打开的静态单页数据工具。基础统计表是共享
数据源，工具通过 registry 按需加载，并可通过 `workspace` 接入表格、语言和工具状态。

## 核心原则

- 零构建、零框架、零 CDN、零远程字体，只使用浏览器原生 API 和项目文件。
- 表格数据只能来自 `store.getState()`；派生统计不得写回 store、持久化或进入撤销历史。
- 单元格选区、输入草稿、滚动位置、Selection、提示消息属于 UI 状态，不是表格数据。
- DOM 只做视图；用户内容必须通过 `textContent`、`value` 或等价安全 API 写入。
- 工具之间不得直接调用；需要共享的逻辑只能放入不持有 store/DOM 状态的纯函数模块。
- 优先复用现有接口，不为假想需求增加空实现、依赖或无调用方的抽象。

## 数据与 Store

表格数据唯一来源是 `js/store.js` 创建的 store。公开动作：

```js
store.getState()
store.subscribe(({ state, change }) => {})
store.subscribeStatus((status) => {})
store.updateCell(cell, options)
store.insertRow(index)
store.deleteRow(index)
store.insertColumn(index)
store.deleteColumn(index)
store.reset()
store.undo()
store.endEdit()
store.canUndo()
```

`getState()` 返回副本。所有写入必须通过 store 动作。单元格连续输入共用一次
编辑历史；失焦、切换单元格或结构操作后结束本次编辑。

渲染约束：

- 单元格输入只更新 store 和当前输入控件，不重建整张表。
- 结构变化可以重建表格，但必须保留有效选区、焦点和文本全选状态。
- 不打断中文输入法，不用轮询，不把表格数据保存在 DOM 或模块级副本中。

## Selection 与 Relative Frequency

Selection 是基础表页脚提供的全局统计范围，内部名为 `analysisScope`，值为：

- `total`：By total
- `row`：By row
- `column`：By column

工具通过以下接口读取和订阅：

```js
workspace.table.getAnalysisScope()
workspace.table.subscribeAnalysisScope((scope) => {})
```

Selection 只改变统计口径或图形布局，不改变表格数据。Relative Frequency 开启时的
分母规则固定为：

| Selection | 单元格相对频率 |
|---|---|
| By total | 单元格 / 全表总计 |
| By row | 单元格 / 所在行总计 |
| By column | 单元格 / 所在列总计 |

分母为 `0` 时结果无效（`null`），不得伪造为有效的 `0`。

Relative Frequency 是独立工具，没有自己的范围选择控件。它读取 Selection，在表格
数值单元格中显示只读计算式和结果。开启 Relative Frequency 时：

- By total 还会为 Margin 的行总计、列总计和全表总计提供相对值。
- By row 和 By column 只派生普通单元格；Margin 仍可显示，但汇总单元格只显示原始总计。
- Margin 与 Relative Frequency 可以同时开启，不存在互斥关系。

图形工具必须区分两个维度：

1. Selection 始终决定统计范围和数据布局。
2. Relative Frequency 是否开启只决定显示原始数字还是百分数，不决定布局。

因此，新增 graph 时必须同时订阅 Selection，不能根据 Relative Frequency 的启停状态
猜测布局。需要百分比时使用 `ByeStat.frequency.calculate(state, scope)` 的共享计算，
并通过 `workspace.tools.isActive("percentage")` /
`subscribe(listener)` 取得 Relative Frequency 启停状态。

## 工具契约

- `js/tools/registry.js` 是唯一注册点。新工具只需新增 `js/tools/<id>/` 并在 registry
  增加 `id`、`section`、名称、描述、图标和安全 SVG path、脚本及样式。
- `mount(root, store, workspace)` 构建视图、绑定事件并返回幂等清理函数。
- 工具必须清理自己的订阅、事件、计时器、弹窗和提示消息。
- 工具样式限制在 `.tool-<id>` 中；界面文案通过 `workspace.language` 获取。
- `workspace.table.registerSummary()` 用于派生行列。
- `workspace.table.registerCellDisplay()` 用于数值单元格的只读派生显示，可选
  `summary` 扩展现有汇总；工具卸载时必须注销。
- `workspace.tools.isActive(id)` 和 `workspace.tools.subscribe(listener)` 只用于读取
  其他工具的启停状态，不得借此调用工具。

## 当前工具

### Margin

在表格右侧和底部追加原始行总计、列总计和全表总计。与 Relative Frequency 同时开启
且 Selection 为 By total 时，汇总单元格额外显示相对值。

### Relative Frequency

作为表格派生显示层工作，没有独立面板。它按 Selection 计算每个数值单元格；仅
By total 时扩展 Margin 汇总。工具卸载后应移除全部派生显示。

### Bar chart

柱状图布局只由 Selection 决定：

- By total 与 By row：行是 Target，列是属性；布局完全相同。
- By column：列是 Target，行是属性；布局相对前两者转置。

开启 Relative Frequency 时柱值为百分数，关闭时为原始数字。By total 与 By row 的
区别只在开启 Relative Frequency 时体现为不同分母。每个柱都必须显示自身数值标签。
排序控件只改变 Target 顺序，不改变 Target/属性定义。

## 新增 Graph 检查清单

- 使用 `store.getState()` 计算，不保存第二份表格数据。
- 订阅 store、Selection 和语言；依赖 Relative Frequency 显示格式时再订阅工具状态。
- 明确写出 `total`、`row`、`column` 三种 Selection 下的 Target/属性映射。
- Selection 改变布局；Relative Frequency 只改变数字或百分数表现。
- 数值标签、坐标轴、图例和统计摘要使用同一单位。
- 在自己的 `unmount` 中注销全部订阅和扩展，卸载后不得继续响应数据变化。
- 检查单元格编辑、行列增删、重置、撤销、工具启停、中英文切换和移动端。
