# UtilityBench

深色研究展示站点，以七页整屏翻页呈现。沿用论文 logo 的紫蓝色，正文以 20px、首屏介绍以 22px 排版，表格、图表标签与操作文字不低于 18px。PC 以固定比例的 16:9 画布排版，宽度上限 1536px，并受可用视口高度约束；超宽屏保留两侧留白。手机使用独立的纵向布局。

## 本地运行

Node.js 22+，无需安装依赖。

```bash
npm run dev
```

默认监听 `0.0.0.0:4000`，本机打开 http://127.0.0.1:4000 ，其他设备可通过本机 IP 和端口 4000 访问。

```bash
npm test
npm run build
npm run preview
```

构建产物在 `dist/`。预览与开发服务器默认均监听 `0.0.0.0:4000`，启动另一个前先停止已有进程；也可通过 `PORT=4001 npm run preview` 更换端口。

## GitHub 自动部署

1. 将此目录作为 GitHub 仓库的根目录上传，默认分支命名为 `main`。
2. 在仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
3. Push 到 `main`，或手动运行 **Build and deploy UtilityBench** 工作流。

工作流会验证数据、编译静态站点并部署到 GitHub Pages。PR 仅运行验证与构建。无需后端、数据库或额外 secrets。站内资源全部采用相对路径，支持 `username.github.io/repository-name/` 子目录及自定义域名。

工作流依据 [GitHub 官方自定义 Pages 工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) 配置。首次启用 Pages 及仓库环境保护规则由仓库所有者控制。本次仅创建本地代码，未发布。

## 配置正式链接

正式 arXiv、GitHub、Hugging Face 链接与 Hub ID 已写入 `src/config.js`，可在此统一更新。

Usage 仅展示 Hugging Face `load_dataset` 导入示例，支持复制；左侧 Evaluation Demo 跳转到 GitHub 代码仓库。官网不包含数据集或评测运行时。

## 页面和交互

- 一次滚轮手势只切换一页，惯性滚动不会连跳。支持侧边页面导航、上下方向键、Page Up / Page Down、Home / End、浏览器返回和页内直达链接。移动端长内容、排行榜、代码区及弹窗可独立滚动；到边界后使用新手势翻页，避免截断内容或滚动穿透。
- 翻页只动画处理 opacity 和 transform；标题、正文、图表及主视觉按不同距离和时序进场。离场页面不可聚焦，CSS 动画暂停，自动播放时钟只在当前可见页面运行。尊重 reduced-motion 设置。
- `index.html`：首屏品牌 → Leaderboard + 三维图 → 数据集特性与成本分布 → 方法重点 → 发现 → Usage → Citations。案例、数据集来源、效用公式与评测设置通过弹窗展开。
- 仅保留 `index.html`。Thinking、Prompting 和 GPT / Gemini 领域分析均在 Findings 呈现；Thinking 直接展示全部运行，Prompting 的弹窗展示两个实际 prompt；Thinking 与 GPT / Gemini 不提供结果弹窗。独立结果页已删除。
- 排行榜显示完整指标、品牌 logo 与 T/NT 标记，支持搜索、多选家族/思考模式 Badge、排序、CSV。C_R 滑块使用论文的 0、0.25、0.5、1、2、3、4、8、16、32、64；默认 2。切换时更新真实 UtilityAUC、排名与三维坐标，准确率和作答率保持原始观测值。默认全选模型家族及 T / NT，显示全部 33 条结果（24 条 NT、9 条 T）。T 包括论文中的 6 条思考实验及新增的 Gemini 4 Argon，GPT 的三种推理强度分别保留。三维图使用对数坐标与竖直投影线，选中 T 结果时在主对比中加入该条实验。
- Method 的三个步骤按 01–03 自动播放：等成本与样本成本对比、纵向三种效用值、论文原曲线与 Coverage 滑块。点击样本可查看原问题。Method 02 的详细说明依次介绍即时效用、共享后续处理预算、固定 shadow price 和评测超参；公式使用 MathML。
- Findings 按 01–04 自动播放：三模型的 accuracy / UtilityAUC 上下成对对比、Thinking 的六组设置、三种 Prompt、GPT vs Gemini 的 11 个领域分解。每个 Thinking run 紧密堆叠四项指标，标出对应 NT 基线、T 原始值及论文报告的增减；列表纵向滚动，不切换指标。四图不显示底部坐标轴和刻度，只保留必要图例与数值。
- 轮播只在内容可见时计时；手动选择标签、操作图表或打开细节后保持暂停，点击 Play 恢复，支持键盘导航。弹窗打开或页面隐藏时也停止计时。文本与图表分别使用轻量入场动画。
- 轨道缓慢运动、选中点轻微呼吸、悬停/点击反馈、滚动视差和弹窗过渡保持克制；数据与正文不持续漂移。
- 动画遵循系统 `prefers-reduced-motion`，移动端保留原生滚动，图表提供数值表格、可访问的数值标签或模型选择。三维图的手机旋转使用左右按钮。

## 数据来源和更新

`data/dataset.json` 保存全部 15,000 条样本的成本直方图、17 个可回答来源的样本数（加 AbstentionBench 共 18 个来源），以及 10 个分析分组的成本中位数/四分位数。成本轴使用对数刻度；领域摘要仅覆盖 7,500 条可回答样本。

`data/refusal-costs.json` 是固定响应与二元分数在 11 个 C_R 值上的真实重算结果，覆盖 24 条 NT 与 9 条 T 运行；每个成本重新计算共享的最佳/最差面积，默认值与论文精度一致。用 `python3 scripts/import-refusal-costs.py --evaluation-root /path/to/RSC-AUC` 更新。

`data/results.json` 是论文当前版本的静态快照。模型名称和数值按所提供论文保留，不代表模型的外部实时可用状态。页面不会查询任何模型 API。

- Figure 1、Table 1：20 个模型，非思考模式、Refusal Hint、binary action scores、C_R=2。
- Table 2：10 条 Thinking 实验记录。
- Table 4：12 条 Prompting 实验记录，用于首页 Prompting 对比；详情弹窗仅展示两个 prompt。
- Figure 4：从两个模型各 15,000 条最终增强判定和风险 manifest 聚合而来，不包含逐条问题或模型回复。复用论文配套 dashboard 的领域分类函数；导出时核对 answerable accuracy、refusal accuracy 和 answer rate 与论文一致。

Figure 4 默认按每个领域内两个模型正/负堆叠的最大绝对长度归一化为 100%，保留原图的领域内对比。悬停各条 Bar 可查看原始平均效用，避免跨领域误读归一化长度。领域顺序按论文保留。

重新导出数据：

```bash
python3 scripts/import-paper.py \
  --paper-root /path/to/iclr2027_preprint \
  --evaluation-root /path/to/RSC-AUC
python3 scripts/import-dataset.py \
  --evaluation-root /path/to/RSC-AUC
npm test
npm run build
```

仅当论文表格、模型列表或原始实验更新时需要重新导出。常规网站构建只需要已提交的快照，无需访问上述外部目录。

## 文件布局

`src/style.css`：首页与通用样式；`src/story.css`：Method / Findings 样式；`src/pager.js` 与 `src/pager.css`：整屏导航与转场；`src/page-input.js`：滚轮惯性及手势判定；`src/main.js`：首页初始化与 Usage；`src/benchmark.js`：唯一排行榜与三维图；`src/plot.js`：对数坐标和相机投影；`src/models.js`：品牌及思考模式；`src/story.js`：方法和研究发现的交互图解；`src/carousel.js`：轮播时钟；`src/story-data.js`：论文案例与插值；`src/dataset.js`：成本分布与领域图；`src/results.js`：排序及归一化；`scripts/build.mjs`：构建和静态路径校验；`.github/workflows/pages.yml`：自动部署。

构建不再复制未使用的原图备份 `figure1-original.jpg` 和 `figure4-original.jpg`，源目录保留原文件。三维图拖拽合并到每帧一次重绘，重复的拒答成本输入不重复重建排行榜。

## 字体与图标

仅图内坐标轴、刻度及 SVG 标注使用 Times New Roman / Times；标题、类别名、图例和面板说明沿用 Arial / Helvetica。数学内容使用本地 STIX Two Math（`assets/fonts/OFL.txt`，SIL Open Font License）。arXiv 标志来自 Simple Icons（CC0），Hugging Face 使用仓库 README 的 🤗 图标。

`data/utility-curve.json` 保留论文 `utility_curve_coverage_schematic.pdf` 中的原始曲线形状，转换为相对坐标供响应式渲染。它是论文的曲线构造示例，不作为实测效用值显示；覆盖率以百分比表示。

Citations 位于 Usage 之后，说明文本与 BibTeX 均与 UtilityBench 仓库 README 一致，并支持复制。导航集中保留 Leaderboard、Dataset、Method、Usage；弹窗仍用于必要的研究细节。

Method 与 Findings 共用一个有边界的 16:9 叙事画布，左右对齐。手动切换标签、调整图表或打开细节后暂停自动播放，只有点击 Play 才恢复。Findings 文本与两个 prompt 集中在 `src/findings-data.js`，专用样式位于 `src/findings.css`。GPT / Gemini 说明使用论文正文完整分析段落，去除图号及附录引用；较小桌面窗口中的长说明可独立滚动，保持字号。

Dataset 的领域行及 Findings 01、03 在 PC 按剩余高度等分行距，标签与 Bar 组在分割线之间垂直居中。领域面板不显示 Low / High；手机保留自然纵向布局。

Leaderboard 的 All 是一次性的全选操作，不保留选中状态；家族与模式分别以各自 Badge 显示真实选择，全部取消时显示空结果。搜索框不显示紫色焦点外框。GPT / Gemini 领域图沿用原图的紫色与玫红色系，三类效用在各自色系内通过深浅区分；图例顺序与每个领域上下两条 Bar 一致。

两处 Copy 共用 `src/clipboard.js`，在点击手势内发起 Clipboard API 与选区复制，成功后按钮短暂显示 Copied；浏览器阻止两种方式时隐藏不可用按钮，不再提示手动复制。

2026-10-29 增加 Gemini 4 Argon（T）、MiMo V2.6 Flash / Pro（NT）。追加评测位于 `data/results.json` 的 `additionalRuns`，参与排行榜、筛选、CSV 和三维图，论文原始对照实验保持独立。UtilityAUC 显示四位小数，百分比显示两位。`scripts/import-output.py --dataset /path/to/test.parquet` 从 `output/*/result.json` 验证完整记录并重算全部 11 档拒答成本；只导出聚合指标。Gemini 4 Argon 超出原 UtilityAUC 轴上限时，三维图自动扩展该轴。

新增统计文件通过 `python3 scripts/import-metrics.py` 导入，只读取 metrics.json，直接使用其中 11 档 C_R 的 UtilityAUC。新增 GLM-5.3 Flash（T）、GPT-6 Astra（T）、GPT-6.1 Terra（NT）、Qwen3.8 Flash（NT）。
