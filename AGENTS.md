# AGENTS.md

ByeStat 是一个可直接打开使用的静态单页数据工具站。数据统计表是所有工具共享
的基础工作区；当前第一个工具为 Margin，为表格追加行、列与全表总计。
shell 与工具注册机制为后续 Venn、概率统计等工具预留，不为了“可能新增工具”
引入空实现或依赖。

## 运行与依赖

- 零构建、零框架、零 CDN、零远程字体。Index 文件可直接通过 `file://` 打开。
- 使用按固定顺序加载的经典浏览器脚本，不依赖 ES Module 或服务器。
- 所有模块挂在 `window.ByeStat` 命名空间下，禁止隐式全局变量。
- 只有浏览器原生 API、项目内文件及用户已明确批准的依赖可以使用。

## 页面骨架

- `index.html` 只保留文档元信息、根容器和核心脚本加载顺序。
- 数据统计表的标题、表格和工具栏由基础表在 `mount()` 中创建，并由 shell
  在页面生命周期内持续挂载。
- 新增工具不得要求修改 `index.html`；工具由 registry 按需加载。

## 数据与 Store

- 表格数据唯一真相在 `js/store.js` 创建的 store 中。
- 读取统一调用 `store.getState()`；返回值必须是副本，调用方不得原地修改。
- 所有数据写入必须经过 store 动作：
  `updateCell`、`insertRow`、`deleteRow`、`insertColumn`、`deleteColumn`、
  `reset`、`undo`。
- 选区、输入草稿、滚动位置和提示消息属于 UI 状态，由当前工具管理，
  不得冒充表格数据或持久化第二份表格。
- store 发出 `cell`、`structure`、`reset`、`undo` 类型的变更通知。
  单个订阅者报错不得中断其他订阅者。
- `localStorage` 持久化集中处理，key 带版本号并使用 300ms 防抖。
  保存状态通过 store 的状态订阅通知 shell。
- 单元格连续输入属于一次编辑历史；失焦、切换单元格或结构操作后结束本次编辑，
  避免撤销只回退一个字符。
- Margin 等派生统计结果必须从 `store.getState()` 计算，不得写回表格数据，
  不得作为第二份数据持久化或进入撤销历史。

## DOM 与渲染

- DOM 是视图，不是业务数据源。事件适配层只读取输入并派发语义操作。
- 单元格内容变化只更新 store 和当前输入控件，不重建整张表。
- 行列增删、重置、撤销等结构变化可以重建表格，但必须恢复有效选区、
  焦点和全选状态。
- 选中或移动单元格后必须让其完整避开顶部标题、左侧行标题、右侧 Margin
  和底部列总计；
  需要滚动时只调整表格自身，并按最小必要距离移动。
- 不得在输入过程中打断中文输入法，不得因重绘丢失光标或键盘导航状态。
- 用户可编辑内容只能通过 `textContent`、`value` 或等价安全 API 写入；
  禁止用用户内容拼接 HTML。
- 禁止用大段模板字符串生成组件；使用 `js/shared/dom.js` 或小型 `<template>`。

## Store 契约

```js
store.getState()
store.subscribe(({ state, change }) => {})
store.subscribeStatus((status) => {}) // "saving" | "saved" | "error"
store.updateCell({ kind, row, col, value }, options)
store.insertRow(index)
store.deleteRow(index)
store.insertColumn(index)
store.deleteColumn(index)
store.reset()
store.undo()
store.endEdit()
store.canUndo()
store.dispose()
```

`updateCell` 的 `kind` 为 `corner`、`column`、`row` 或 `number`。
`options.mergeKey` 用于合并一次连续输入，`options.recordHistory` 允许
Esc 取消草稿时不产生无意义的历史记录。

## 工具与插件契约

- `js/tools/registry.js` 是唯一工具注册点。
- 新增工具只需新增 `js/tools/<id>/` 目录，并在 registry 增加一个条目；
  条目包含 `id`、边栏展示所需的 `name`、`description`、`icon`，
  以及按顺序加载的脚本列表。
- 工具最终注册：
  `window.ByeStat.toolModules[id] = { id, name, description, icon, styleHref, mount }`。
- `icon` 使用安全的 SVG path 数据，不得直接注入 HTML。
- `mount(root, store, workspace)` 负责构建视图、绑定事件并返回幂等清理函数。
- 基础表通过 `workspace.table.registerSummary()` 登记右侧派生列、底部派生行
  及其纯计算函数；工具卸载时必须注销扩展。
- `workspace.language` 提供 `locale`、`t(key, params)` 和 `subscribe(listener)`；
  工具界面文案必须通过它读取，语言偏好由 shell 持久化。
- shell 负责按需加载工具脚本和样式；切换或卸载工具时调用清理函数并移除样式。
- 工具必须处理自身的事件、订阅、计时器、弹窗和提示消息。
- 工具之间禁止互相调用。共享模块只能是纯函数，不得持有 store 或 DOM 状态。
- 工具样式挂在 `.tool-<id>` 命名空间下，避免污染其他工具。

## 文件组织

```text
index.html
css/base.css                 # token、reset、通用可访问性
css/layout.css               # 仅 shell 布局
css/shared/controls.css      # 可复用的无业务控件
css/table.css                # 基础统计表样式
css/tools/margin.css         # Margin 扩展样式
js/shared/dom.js             # DOM 创建与安全工具
js/shared/i18n.js            # 中英文案与纯翻译函数
js/store/state.js            # 默认状态、规范化、标签生成
js/store/persistence.js      # localStorage 与防抖保存
js/store.js                  # store 创建与公开动作
js/shell.js                  # 应用壳、工具加载和生命周期
js/shell/language.js         # 语言状态、本地偏好和切换按钮
js/shell/sidebar.js          # 边栏结构、导航与保存状态
js/tools/registry.js         # 工具注册表
js/table/index.js            # 基础表生命周期与状态编排
js/table/view.js             # 页面结构和静态控件
js/table/summary.js          # 派生行列的创建与局部更新
js/table/render.js           # 表格与扩展行列创建、更新
js/table/adapt.js            # 输入、键盘、点击事件适配
js/table/selection.js        # 基础表选区状态与可选持久化
js/table/scroll.js           # 选中单元格的粘性遮挡与滚动露出
js/tools/margin/calc.js      # Margin 纯计算
js/tools/margin/index.js     # Margin 生命周期与扩展注册
```

## 规模与职责

- 下列数值是默认上限；超过时应先说明为什么无法按职责继续拆分。
- `index.html` ≤ 60 行；`base.css` ≤ 160 行。
- `js/store.js` 与 `js/shell.js` 各 ≤ 220 行。
- 基础表与工具 `index.js` ≤ 180 行；`view.js`、`render.js`、`adapt.js` 各 ≤ 300 行。
- 单工具 JS + CSS 总量 ≤ 1600 行。
- 单个函数默认 ≤ 60 行；优先按职责拆分，不按空行或机械换行“达标”。
- 单文件只承担一种主要改动原因。

## 验证要求

- 修改后告诉我该做哪些测试，应该有什么效果。

## 禁止

- 把表格数据直接存在 DOM、其他工具或模块级副本中。
- 轮询状态，或为单元格每次按键都重建整张表格。
- 引入框架、打包器、CDN、远程字体或未经批准的外部服务。
- 在 `index.html`、`base.css` 或 `layout.css` 中写具体工具业务样式。
- 生成与项目无关的文档、接口或抽象；架构变化时同步更新 AGENTS.md 即可。
