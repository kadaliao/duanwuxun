# 端午汛

《大明王朝1566》同人游戏。嘉靖四十年五月，你是户部观政进士程知白，到浙江淳安核田。三天之后是端午，那一夜，新安江的大堤会决。

手绘场景的 2.5D 叙事冒险：九处绘景（淳安县城、县衙、堤下稻田、冯家村、新安江堤、闸口、渡口、后山小路、龙王庙），彩绘人物，昼夜与雨，端午夜实时上涨的洪水。

![冯家村](tools/shots/readme/village.jpg)

| | |
|---|---|
| ![县衙](tools/shots/readme/yamen.jpg) | ![渡口](tools/shots/readme/pier.jpg) |
| ![闸口](tools/shots/readme/sluice.jpg) | ![新安江堤](tools/shots/readme/dike.jpg) |
| ![龙王庙](tools/shots/readme/temple.jpg) | ![后山小路](tools/shots/readme/hillpath.jpg) |

## 怎么玩

```
npm install
npm run build        # 打包到 build/game.js
npm run dev          # http://127.0.0.1:8567
```

浏览器打开 `http://127.0.0.1:8567/`（需要 http 服务，直接双击 index.html 不行）。

- WASD / 方向键 走，Shift 跑，C 潜行，空格 / 鼠标点人 互动，滚轮 远近。
- 走到画面边上标着地名的出口，就到下一处。J 账簿，M 舆图，Esc 卷宗（存读档、设置）。
- 对话里字下带红点的词可以点开"听音"，听话里的话，记进账簿。
- `` ` `` 开调试层（可走区域、出口、热点）。

## 结构

- **三天白天**：在县城、县衙、大堤、闸口、冯家村、渡口、后山龙王庙之间走动。和人说话、听堤、查河工账、帮村民——攒下村民的信任、线索与人情。夜里戌时以后，闸口会有号衣兵来撬闸底的石头，可以潜行过去听。
- **第三夜推算**：把线索摆开，写下一个日子。线索够、写对了，就能在端午前夜挨家挨户敲门。
- **端午夜**（实时）：子时决堤。在那之前，要锣、要民壮、借船、看清闸口的人、把村里的人带上山。决堤之后水漫上来，田、路、村子依次淹没；没走的人困在屋顶上，要撑船去救；阿秧回去拿田契，在冯家的屋脊上；决口边有一块按察使司的腰牌。丑时胡宗宪上堤分洪。
- **结账**：活民、阿秧、吴老倌、证据、呈文、分洪时说了什么……八种结局标题。

大势改不了：堤一定会决，严党一定会倒。你能改的，是多少人活下来，和你自己最后成了什么样的人。

## 美术管线

所有场景、人物图集、绣像、CG 都是 AI 生成（codex 内置 image_gen），提示词在 `art/v2/`：

| 文件 | 作用 |
|---|---|
| `art/v2/style.txt` | 场景总纲（画风、相机、禁止项） |
| `art/v2/sheet_style.txt` | 人物图集版式（3 行 × 6 列：正面 / 背面 / 侧面，站 + 5 帧走） |
| `art/v2/portrait_style.txt` | 对话绣像版式 |
| `art/v2/manifest*.json` | 批次清单，`node tools/gen-v2-batch.mjs <manifest>` 生成到 `art/raw/v2/`（不入库） |
| `tools/process-v2.sh` | 场景 2x 放大转 webp；图集自动切帧（`tools/slice-sheet.mjs`）；绣像、CG、舆图转 webp |

场景数据（可走多边形、阻挡、遮挡层、出口、命名位置、灯光、洪水高程）手写在 `src/game/scenes/index.js`，坐标用原图像素。

## 开发

| 命令 | 作用 |
|---|---|
| `npm run watch` | esbuild 监听 |
| `node tools/playtest.mjs full` | 自动试玩全流程并截图到 `tools/shots/play/`（`PREFER=best/random/first` 选分支；`night` 只跑端午夜） |
| `node tools/shot.mjs out.png "js"` | 跑一段脚本后截图 |
| `node tools/subset-font.mjs` | 改了文本后重新裁剪楷体字库 |

代码：`src/engine/`（渲染与后期、场景视图、寻路、人物精灵、天气、音频），`src/game/`（场景数据、导演、界面、状态），`src/game/script/`（剧本：序章、三天、端午夜、结局、线索、小游戏、潜行）。

v1（程序化 3D 等距版）在 tag `v1-prototype`。

## 署名

- 原作：电视剧《大明王朝1566》，编剧刘和平，导演张黎。本作为非商业同人作品。
- 主角程知白及冯老四、阿秧、吴老倌、钱管家等为本作原创；蒋千户见于原剧第26集供词。
- 美术：AI 生成。字体：霞鹜文楷（SIL OFL 1.1）。引擎：three.js（MIT）。
