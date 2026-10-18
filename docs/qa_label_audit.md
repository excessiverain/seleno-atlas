# 月球地名坐标与中文译名审计

- 审计对象：`web/data/moon_atlas_data_pretty.json`（1,778 个要素，`featured=true` 共 243 条）
- 审计日期：2026-10-18
- 审计范围：任务指定 69 条（月海/洋 20、环形山 24、山脉/月谷 10、着陆点 15）＋ 南极-艾特肯盆地；另对 featured 全部 243 条做了全量坐标扫描
- 写入说明：本报告是本轮唯一写入工作区的文件；目标 JSON 未做任何修改，核对使用只读脚本抽取＋只读网页/数据源比对

## 0. 结论摘要

| 结论档 | 数量 | 说明 |
| --- | --- | --- |
| 必须修正 | **7 条** | 任务清单内 2 条（莫斯科海、界海）；featured 额外发现 5 条（南极-艾特肯盆地、科迪勒拉山脉、格罗特胡森·德尔塔山、泡沫海、怨恨湖） |
| 建议修正 | — | 坐标控制网版本差异 25 条；着陆点小偏差/边界 3 条＋施特夫勒 0.1° 1 条；直径 ≥20% 差异 5 条；中文译名 9 条（任务清单内）＋25 条（其他 featured 抽样） |
| 无误抽查 | **57 / 69** | 任务指定 69 条中 57 条完全无误（另有 5 条中文名未能在名词库检索到词条，按常用译名判为可接受、置信度中）；南极-艾特肯盆地为额外必须修正项，不计入该分母 |

**坐标体系的关键发现**：本数据集的经纬度并不是随机的“旧值”，而是与 IAU/USGS Gazetteer 中 **“UNKNOWN”历史控制网** 数值逐条吻合——featured 的 209 个 IAU 命名地貌中 202 条在 0.02° 内完全一致（96.7%），任务指定的 54 个 IAU 地貌中 52 条完全一致。因此“与当前 Gazetteer 默认的 LOLA 2011 坐标有差异”属于**坐标控制网版本差异**，不是录入错误，统一放在“建议修正（3.1）”处理；真正不匹配任何 IAU 控制网的录入疑点只有 7 条（其中 6 条为必须修正，施特夫勒 0.1° 仅为建议；另有非 IAU 命名的南极-艾特肯盆地 1 条必须修正）。

---

## 1. 核对表（70 条：任务指定 69 条 ＋ 南极-艾特肯盆地）

> 坐标格式为“纬度, 经度”（十进制度，东经为正、西经为负，南纬为负）；“/ 直径”单位 km。“UNKNOWN 网”指 IAU Gazetteer 页面中标注 UNKNOWN 的历史控制网记录；“LOLA 默认”指当前 Gazetteer 默认的 LOLA 2011 控制网值。建议值为“保持”的条目表示现值与 UNKNOWN 网一致、不属错误；如需与当前默认网络完全对齐，`LOLA 默认` 列给出新值（差异超容差的汇总在 3.1）。

| 类别 | 名称 | 当前（纬度, 经度 / 直径） | 建议值 | 依据 URL | 置信度 |
| --- | --- | --- | --- | --- | --- |
| 月海/洋 | 风暴洋 | 18.4, -57.4 / 2568 km | 保持（UNKNOWN 网）；LOLA 默认 20.67/-56.68，直径 2592.24 | https://planetarynames.wr.usgs.gov/Feature/4395 | 高 |
| 月海/洋 | 雨海 | 32.8, -15.6 / 1123 km | 保持（UNKNOWN 网）；LOLA 默认 34.72/-14.91，直径 1145.53 | https://planetarynames.wr.usgs.gov/Feature/3678 | 高 |
| 月海/洋 | 静海 | 8.5, 31.4 / 873 km | 保持（UNKNOWN 网）；LOLA 默认 8.35/30.83，直径 875.75 | https://planetarynames.wr.usgs.gov/Feature/3691 | 高 |
| 月海/洋 | 澄海 | 28, 17.5 / 707 km | 保持（UNKNOWN 网）；LOLA 默认 27.29/18.36，直径 674.28 | https://planetarynames.wr.usgs.gov/Feature/3686 | 高 |
| 月海/洋 | 危海 | 17, 59.1 / 418 km | 保持（UNKNOWN 网）；LOLA 默认 16.18/59.1，直径 555.92 | https://planetarynames.wr.usgs.gov/Feature/3671 | 高 |
| 月海/洋 | 丰富海 | -7.8, 51.3 / 909 km | 保持（UNKNOWN 网）；LOLA 默认 -7.83/53.67，直径 840.35 | https://planetarynames.wr.usgs.gov/Feature/3673 | 高 |
| 月海/洋 | 神酒海 | -15.2, 35.5 / 333 km | 保持（UNKNOWN 网）；LOLA 默认 -15.19/34.6，直径 339.39（中文名见 3.4） | https://planetarynames.wr.usgs.gov/Feature/3683 | 高 |
| 月海/洋 | 云海 | -21.3, -16.6 / 715 km | 保持（UNKNOWN 网）；LOLA 默认 -20.59/-17.29，直径 714.5 | https://planetarynames.wr.usgs.gov/Feature/3684 | 高 |
| 月海/洋 | 湿海 | -24.4, -38.6 / 389 km | 保持（UNKNOWN 网）；LOLA 默认 -24.48/-38.57，直径 419.67 | https://planetarynames.wr.usgs.gov/Feature/3677 | 高 |
| 月海/洋 | 汽海 | 13.3, 3.6 / 245 km | 保持（UNKNOWN 网）；LOLA 默认 13.2/4.09，直径 242.46 | https://planetarynames.wr.usgs.gov/Feature/3694 | 高 |
| 月海/洋 | 冷海 | 56, 1.4 / 1596 km | 保持（UNKNOWN 网）；LOLA 默认 57.59/-0.01，直径 1446.41 | https://planetarynames.wr.usgs.gov/Feature/3674 | 高 |
| 月海/洋 | 东方海 | -19.4, -92.8 / 327 km | 保持（UNKNOWN 网）；LOLA 默认 -19.87/-94.67，直径 294.16（中文名见 3.4） | https://planetarynames.wr.usgs.gov/Feature/3685 | 高 |
| 月海/洋 | 莫斯科海 | 27.3, 51.5 / 277 km | **改为 27.3, 147.9（UNKNOWN 网）；当前默认 LOLA 2011 为 27.28, 148.12** | https://planetarynames.wr.usgs.gov/Feature/3682 | 高 |
| 月海/洋 | 智海 | -33.7, 163.5 / 318 km | 保持（UNKNOWN 网）；LOLA 默认 -33.25/164.83，直径 282.2 | https://planetarynames.wr.usgs.gov/Feature/3679 | 高 |
| 月海/洋 | 洪堡海 | 56.8, 81.5 / 273 km | 保持（UNKNOWN 网）；LOLA 默认 56.92/81.54，直径 230.78 | https://planetarynames.wr.usgs.gov/Feature/3676 | 高 |
| 月海/洋 | 史密斯海 | 1.3, 87.5 / 373 km | 保持（UNKNOWN 网）；LOLA 默认 -1.71/87.05，直径 373.97 | https://planetarynames.wr.usgs.gov/Feature/3689 | 高 |
| 月海/洋 | 南海 | -38.9, 93 / 603 km | 保持（UNKNOWN 网）；LOLA 默认 -47.77/91.99，直径 996.84 | https://planetarynames.wr.usgs.gov/Feature/3665 | 高 |
| 月海/洋 | 界海 | 13.3, 147.9 / 420 km | **改为 13.3, 86.1（UNKNOWN 网）；当前默认 LOLA 2011 为 12.70, 86.52** | https://planetarynames.wr.usgs.gov/Feature/3681 | 高 |
| 月海/洋 | 岛海 | 7.5, -30.9 / 513 km | 保持（UNKNOWN 网）；LOLA 默认 7.79/-30.64，直径 511.93 | https://planetarynames.wr.usgs.gov/Feature/3680 | 高 |
| 月海/洋 | 虹湾 | 44.1, -31.5 / 236 km | 保持（UNKNOWN 网）；LOLA 默认 45.01/-31.67，直径 249.29 | https://planetarynames.wr.usgs.gov/Feature/5565 | 高 |
| 环形山 | 第谷 | -43.4, -11.1 / 85.29 km | 保持（UNKNOWN 网）；LOLA 默认 -43.3/-11.22，直径 85.29 | https://planetarynames.wr.usgs.gov/Feature/6163 | 高 |
| 环形山 | 哥白尼 | 9.7, -20.1 / 96.07 km | 保持（UNKNOWN 网）；LOLA 默认 9.62/-20.08，直径 96.07 | https://planetarynames.wr.usgs.gov/Feature/1296 | 高 |
| 环形山 | 开普勒 | 8.1, -38 / 29.49 km | 保持（UNKNOWN 网）；LOLA 默认 8.12/-38.01，直径 29.49 | https://planetarynames.wr.usgs.gov/Feature/2990 | 高 |
| 环形山 | 阿里斯塔克斯 | 23.7, -47.4 / 39.99 km | 保持（UNKNOWN 网）；LOLA 默认 23.73/-47.49，直径 39.99（中文名见 3.4） | https://planetarynames.wr.usgs.gov/Feature/380 | 高 |
| 环形山 | 柏拉图 | 51.6, -9.4 / 100.68 km | 保持（UNKNOWN 网）；LOLA 默认 51.62/-9.38，直径 100.68 | https://planetarynames.wr.usgs.gov/Feature/4757 | 高 |
| 环形山 | 克拉维乌斯 | -58.8, -14.1 / 230.77 km | 保持（UNKNOWN 网）；LOLA 默认 -58.62/-14.73，直径 230.77 | https://planetarynames.wr.usgs.gov/Feature/1236 | 高 |
| 环形山 | 托勒密 | -9.3, -1.9 / 153.67 km | 保持（UNKNOWN 网）；LOLA 默认 -9.16/-1.84，直径 153.67（中文名见 3.4） | https://planetarynames.wr.usgs.gov/Feature/4860 | 高 |
| 环形山 | 阿方索 | -13.7, -3.2 / 110.54 km | 保持（UNKNOWN 网）；LOLA 默认 -13.39/-2.85，直径 110.54 | https://planetarynames.wr.usgs.gov/Feature/206 | 高 |
| 环形山 | 伽桑狄 | -17.6, -40.1 / 111.39 km | 保持（UNKNOWN 网）；LOLA 默认 -17.55/-39.96，直径 111.39 | https://planetarynames.wr.usgs.gov/Feature/2111 | 高 |
| 环形山 | 格里马尔迪 | -5.5, -68.3 / 173.49 km | 保持（UNKNOWN 网）；LOLA 默认 -5.38/-68.36，直径 235 | https://planetarynames.wr.usgs.gov/Feature/2252 | 高 |
| 环形山 | 席卡德 | -44.3, -55.3 / 212.18 km | 保持（UNKNOWN 网）；LOLA 默认 -44.38/-55.11，直径 212.18 | https://planetarynames.wr.usgs.gov/Feature/5368 | 高 |
| 环形山 | 巴伊 | -66.5, -69.1 / 300.56 km | 保持（UNKNOWN 网）；LOLA 默认 -66.82/-68.9，直径 300.56 | https://planetarynames.wr.usgs.gov/Feature/561 | 高 |
| 环形山 | 狄奥菲勒斯 | -11.4, 26.4 / 98.59 km | 保持（UNKNOWN 网）；LOLA 默认 -11.45/26.28，直径 98.59（中文名见 3.4） | https://planetarynames.wr.usgs.gov/Feature/5965 | 高 |
| 环形山 | 朗格伦 | -8.9, 61.1 / 131.98 km | 保持（UNKNOWN 网）；LOLA 默认 -8.86/61.04，直径 131.98 | https://planetarynames.wr.usgs.gov/Feature/3273 | 高 |
| 环形山 | 佩塔维乌斯 | -25.1, 60.4 / 184.06 km | 保持（UNKNOWN 网）；LOLA 默认 -25.39/60.78，直径 184.06 | https://planetarynames.wr.usgs.gov/Feature/4668 | 高 |
| 环形山 | 齐奥尔科夫斯基 | -21.2, 128.9 / 184.39 km | 保持（UNKNOWN 网）；LOLA 默认 -20.38/128.97，直径 184.39 | https://planetarynames.wr.usgs.gov/Feature/6108 | 高 |
| 环形山 | 科罗廖夫 | -4, -157.4 / 423.41 km | 保持（UNKNOWN 网）；LOLA 默认 -4.19/-157.41，直径 423.41 | https://planetarynames.wr.usgs.gov/Feature/3090 | 高 |
| 环形山 | 阿波罗 | -36.1, -151.8 / 524.23 km | 保持（UNKNOWN 网）；LOLA 默认 -35.69/-151.48，直径 524.23 | https://planetarynames.wr.usgs.gov/Feature/326 | 高 |
| 环形山 | 赫茨普龙 | 2.6, -129.2 / 536.37 km | 保持（UNKNOWN 网）；LOLA 默认 1.37/-128.66，直径 536.37 | https://planetarynames.wr.usgs.gov/Feature/2482 | 高 |
| 环形山 | 门捷列夫 | 5.7, 140.9 / 325.13 km | 保持（UNKNOWN 网）；LOLA 默认 5.38/141.17，直径 325.13 | https://planetarynames.wr.usgs.gov/Feature/3837 | 高 |
| 环形山 | 沙克尔顿 | -89.9, 0 / 20.9 km | 保持（UNKNOWN 网）；极点附近经度无实际意义（LOLA 默认 -89.67/129.78 仅为形心算法结果） | https://planetarynames.wr.usgs.gov/Feature/5450 | 高 |
| 环形山 | 皮里 | 88.6, 33 / 78.75 km | 保持（UNKNOWN 网）；极点附近经度无实际意义（LOLA 默认 88.63/24.4） | https://planetarynames.wr.usgs.gov/Feature/4627 | 高 |
| 环形山 | 加加林 | -20.2, 149.2 / 261.83 km | 保持（UNKNOWN 网）；LOLA 默认 -19.66/149.35，直径 261.83 | https://planetarynames.wr.usgs.gov/Feature/2054 | 高 |
| 环形山 | 儒勒·凡尔纳 | -35, 147 / 145.54 km | 保持（UNKNOWN 网）；LOLA 默认 -34.85/147.28，直径 145.54 | https://planetarynames.wr.usgs.gov/Feature/2856 | 高 |
| 山脉/月谷 | 亚平宁山脉 | 18.9, -3.7 / 401 km | 保持（UNKNOWN 网）；LOLA 默认 19.87/0.03，直径 599.67 | https://planetarynames.wr.usgs.gov/Feature/4004 | 高 |
| 山脉/月谷 | 阿尔卑斯山脉 | 46.4, -0.8 / 281 km | 保持（UNKNOWN 网）；LOLA 默认 48.36/-0.58，直径 334.48 | https://planetarynames.wr.usgs.gov/Feature/4003 | 高 |
| 山脉/月谷 | 高加索山脉 | 38.4, 10 / 445 km | 保持（UNKNOWN 网）；LOLA 默认 37.52/9.93，直径 443.51 | https://planetarynames.wr.usgs.gov/Feature/4007 | 高 |
| 山脉/月谷 | 吕姆克山 | 40.8, -58.1 / 70 km | 保持（UNKNOWN 网）；LOLA 默认 40.76/-58.38，直径 73.25 | https://planetarynames.wr.usgs.gov/Feature/3994 | 高 |
| 山脉/月谷 | 哈德利山 | 26.5, 4.7 / 25 km | 保持（UNKNOWN 网）；LOLA 默认 26.69/4.12，直径 26.4 | https://planetarynames.wr.usgs.gov/Feature/3983 | 高 |
| 山脉/月谷 | 阿尔卑斯月谷 | 48.5, 3.2 / 166 km | 保持（UNKNOWN 网）；LOLA 默认 49.21/3.63，直径 155.42（中文名见 3.4） | https://planetarynames.wr.usgs.gov/Feature/6290 | 高 |
| 山脉/月谷 | 施勒特尔月谷 | 26.2, -50.8 / 168 km | 保持（UNKNOWN 网）；LOLA 默认 26.16/-51.58，直径 185.32（中文名见 3.4） | https://planetarynames.wr.usgs.gov/Feature/6300 | 高 |
| 山脉/月谷 | 哈德利月溪 | 25, 3 / 80 km | 保持（UNKNOWN 网）；LOLA 默认 25.72/3.15，直径 116.09（中文名见 3.4） | https://planetarynames.wr.usgs.gov/Feature/5064 | 高 |
| 山脉/月谷 | 直壁 | -22.1, -7.8 / 134 km | 保持（UNKNOWN 网）；LOLA 默认 -21.67/-7.7，直径 115.95 | https://planetarynames.wr.usgs.gov/Feature/5230 | 高 |
| 山脉/月谷 | 赖纳伽马 | 7.5, -59 / 70 km | 保持（UNKNOWN 网）；LOLA 默认 7.39/-58.96，直径 73.44 | https://planetarynames.wr.usgs.gov/Feature/4987 | 高 |
| 着陆点 | 阿波罗11号 | 0.674, 23.473 | 保持（IAU Statio Tranquillitatis 0.6741, 23.4732；ALSJ/Davies 1987 0.67409, 23.47298） | https://planetarynames.wr.usgs.gov/Feature/5684 ；https://apollojournals.org/alsj/alsjcoords.html | 高 |
| 着陆点 | 阿波罗12号 | -3.012, -23.422 | 保持（ALSJ/Davies 1987 LM：-3.01381, -23.41930；差 0.003°） | https://apollojournals.org/alsj/alsjcoords.html | 高 |
| 着陆点 | 阿波罗14号 | -3.645, -17.471 | 保持（ALSJ/Davies 1987 LM：-3.64544, -17.47139） | https://apollojournals.org/alsj/alsjcoords.html | 高 |
| 着陆点 | 阿波罗15号 | 26.132, 3.634 | 保持（ALSJ/Davies 1987 LM：26.13224, 3.63400） | https://apollojournals.org/alsj/alsjcoords.html | 高 |
| 着陆点 | 阿波罗16号 | -8.973, 15.501 | 保持（ALSJ/Davies 1987 LM：-8.97341, 15.49859；差 0.002°） | https://apollojournals.org/alsj/alsjcoords.html | 高 |
| 着陆点 | 阿波罗17号 | 20.191, 30.772 | 保持（ALSJ/Davies 1987 LM：20.18809, 30.77475；差 0.003°） | https://apollojournals.org/alsj/alsjcoords.html | 高 |
| 着陆点 | 嫦娥三号 | 44.12, -19.51 | 保持（IAU 广寒宫/Guang Han Gong 44.1184, -19.5123） | https://planetarynames.wr.usgs.gov/Feature/15415 | 高 |
| 着陆点 | 嫦娥四号 | -45.5, 177.6 | 保持或改为 -45.45（IAU Statio Tianhe -45.45, 177.6；现值差 0.05°，恰在容差边界） | https://planetarynames.wr.usgs.gov/Feature/15781 | 中高 |
| 着陆点 | 嫦娥五号 | 43.058, -51.916 | 保持（IAU Statio Tianchuan 43.06, 308.08°E＝-51.92°） | https://planetarynames.wr.usgs.gov/Feature/15994 | 高 |
| 着陆点 | 嫦娥六号 | -41.64, -153.99 | 保持（IAU Statio Tianjiang -41.63, 206.02°E＝153.98°W；差 0.01°） | https://planetarynames.wr.usgs.gov/Feature/16328 | 高 |
| 着陆点 | 月球9号 | 7.13, -64.37 | 建议改为 7.18, -64.15（IAU Planitia Descensus；现值为常见历史值，差约 0.2°，见 3.2） | https://planetarynames.wr.usgs.gov/Feature/4750 ；https://the-moon.us/wiki/Planitia_Descensus | 中 |
| 着陆点 | 月球17号 / 月球车1号 | 38.28, -35 | 保持（LROC 2013 实测着陆器 38.238, 35.00°W；月球车 38.316, 35.00°W；现值差 0.04° 在容差内） | https://lroc.im-ldi.com/posts/117 | 高 |
| 着陆点 | 测量员1号 | -2.45, -43.22 | 建议改为 -2.474, -43.339（LROC 2013；旧值 -2.45/-43.22 仍常见，经度差 0.12°，见 3.2） | https://lroc.im-ldi.com/posts/117 | 中 |
| 着陆点 | 月船3号 | -69.373, 32.319 | 保持（IAU Statio Shiv Shakti -69.3734, 32.3198） | https://planetarynames.wr.usgs.gov/Feature/16272 | 高 |
| 着陆点 | SLIM | -13.316, 25.251 | 保持（JAXA 计划着陆点 13.3°S, 25.2°E；与 IAU Shioli 坑中心 -13.3266, 25.2299 一致；见 5.3 关于 JAXA 站点不可达） | https://space.skyrocket.de/doc_sdat/slim.htm ；https://planetarynames.wr.usgs.gov/Feature/15851 | 中 |
| 盆地（额外） | 南极-艾特肯盆地 | -53, 169 / 2500 km | **改为 -53, -169（169°W；HandWiki/英文维基），或采用 56°S 180°E（the-moon 说法）；直径 2500 km 无误** | https://handwiki.org/wiki/Astronomy:South_Pole%E2%80%93Aitken_basin ；https://the-moon.us/wiki/South_Pole_-_Aitken_Basin | 中高 |

---

## 2. 必须修正清单（7 条）

判定标准：坐标不匹配任何 IAU 控制网记录、或与权威来源差异远超声明的容差；以及名称明显张冠李戴（本次未发现名称张冠李戴，见第 4 节）。

| 名称 | 类别 | 当前值 | 建议值 | 问题说明 | 依据 URL | 置信度 |
| --- | --- | --- | --- | --- | --- | --- |
| 莫斯科海（Mare Moscoviense） | 月海 | 27.3, 51.5 | 27.3, 147.9（UNKNOWN 网）；或当前默认 27.28, 148.12 | 经度错 96.6°。莫斯科海位于月球**背面**（147.9°E），51.5°E 处没有该月海；与 IAU 任一控制网均不匹配 | https://planetarynames.wr.usgs.gov/Feature/3682 | 高 |
| 界海（Mare Marginis） | 月海 | 13.3, 147.9 | 13.3, 86.1（UNKNOWN 网）；或当前默认 12.70, 86.52 | 经度错 61.4°；147.9°E 正是莫斯科海经度，疑似两要素经度串位。IAU UNKNOWN 网为 13.30/86.10 | https://planetarynames.wr.usgs.gov/Feature/3681 | 高 |
| 南极-艾特肯盆地（South Pole–Aitken Basin，非正式名） | 盆地 | -53, 169 | -53, -169（即 169°W）；或按 the-moon 取 56°S 180°E | 经度符号疑似写反：权威/常见值为 53°S 169°W，现值 169°E 在 180° 子午线另一侧（偏差约 22°，地表距离约 400 km）。该名称非 IAU 正式命名，建议同时标注“非正式名” | https://handwiki.org/wiki/Astronomy:South_Pole%E2%80%93Aitken_basin ；https://the-moon.us/wiki/South_Pole_-_Aitken_Basin | 中高 |
| 科迪勒拉山脉（Montes Cordillera） | 山脉 | -17.5, -17.5 / 574 km | -19.44, -94.93（当前 LOLA 默认，直径 963.5 km）；若须维持全表 UNKNOWN 网口径则为 -17.5, -81.6（直径 574 km） | 经度 -17.5 与纬度重复，明显是复制错误；该山脉环绕东方海盆地（约 95°W），-17.5°W 处无此山脉 | https://planetarynames.wr.usgs.gov/Feature/4008 | 高 |
| 格罗特胡森·德尔塔山（Mons Gruithuisen Delta） | 山 | 36, -35.9 / 20 km | 36.07, -39.59（当前 LOLA 默认，直径 27.24 km）；或 UNKNOWN 网 36, -39.5 | 经度错约 3.6–3.7°，两套控制网均不支持 -35.9 | https://planetarynames.wr.usgs.gov/Feature/3981 | 高 |
| 泡沫海（Mare Spumans） | 月海 | -1.1, 65.1 / 139 km | 1.1, 65.1（UNKNOWN 网）；或当前默认 1.30, 65.30 | 纬度符号错误（应为北纬 1.1°），偏差 2.2°，超月海 1° 容差 | https://planetarynames.wr.usgs.gov/Feature/3690 | 高 |
| 怨恨湖（Lacus Odii） | 湖 | -19, 7 / 70 km | 19, 7（UNKNOWN 网）；或当前默认 19.22, 7.27 | 纬度符号错误（应为北纬 19°），偏差 38° | https://planetarynames.wr.usgs.gov/Feature/3214 | 高 |

> 说明：任务清单内发现的必须修正项为前 2 条；后 5 条为 featured 全量扫描的额外发现（南极-艾特肯盆地为 featured 的非 IAU 命名要素）。另有 **施特夫勒（Stöfler）** 现值 -41.2/6.0 与 IAU UNKNOWN 网 -41.10/6.00 差 0.1°，在普通环形山 0.3° 容差内，不列入必须修正，见 3.2。

---

## 3. 建议修正清单

### 3.1 坐标控制网版本差异（25 条；与当前 IAU 默认 LOLA 2011 的偏差超过任务容差）

这些条目与 IAU UNKNOWN 历史控制网一致，属于**系统性版本差异**，不是随机录入错误。建议二选一：①在 meta 中明确“坐标采用 IAU UNKNOWN（经典）控制网”；②统一升级为当前 LOLA 2011 值。若升级，需同时更新下列条目的坐标与直径。

| 类别 | 名称 | Δlat | Δlon | 当前 IAU 默认（LOLA 2011） |
| --- | --- | --- | --- | --- |
| 月海 | 风暴洋 | 2.27° | 0.72° | 20.67, -56.68，直径 2592.24 |
| 月海 | 雨海 | 1.92° | 0.69° | 34.72, -14.91，直径 1145.53 |
| 月海 | 丰富海 | 0.03° | 2.37° | -7.83, 53.67，直径 840.35 |
| 月海 | 冷海 | 1.59° | 1.41° | 57.59, -0.01，直径 1446.41 |
| 月海 | 东方海 | 0.47° | 1.87° | -19.87, -94.67，直径 294.16 |
| 月海 | 智海 | 0.45° | 1.33° | -33.25, 164.83，直径 282.2 |
| 月海 | 史密斯海 | 3.01° | 0.45° | -1.71, 87.05，直径 373.97 |
| 月海 | 南海 | 8.87° | 1.01° | -47.77, 91.99，直径 996.84 |
| 环形山 | 克拉维乌斯 | 0.18° | 0.63° | -58.62, -14.73 |
| 环形山 | 阿方索 | 0.31° | 0.35° | -13.39, -2.85 |
| 环形山 | 巴伊 | 0.32° | 0.20° | -66.82, -68.9 |
| 环形山 | 佩塔维乌斯 | 0.29° | 0.38° | -25.39, 60.78 |
| 环形山 | 齐奥尔科夫斯基 | 0.82° | 0.07° | -20.38, 128.97 |
| 环形山 | 阿波罗 | 0.41° | 0.32° | -35.69, -151.48 |
| 环形山 | 赫茨普龙 | 1.23° | 0.54° | 1.37, -128.66 |
| 环形山 | 门捷列夫 | 0.32° | 0.27° | 5.38, 141.17 |
| 环形山 | 加加林 | 0.54° | 0.15° | -19.66, 149.35 |
| 山脉/月谷 | 亚平宁山脉 | 0.97° | 3.73° | 19.87, 0.03，直径 599.67 |
| 山脉/月谷 | 阿尔卑斯山脉 | 1.96° | 0.22° | 48.36, -0.58，直径 334.48 |
| 山脉/月谷 | 高加索山脉 | 0.88° | 0.07° | 37.52, 9.93，直径 443.51 |
| 山脉/月谷 | 哈德利山 | 0.19° | 0.58° | 26.69, 4.12，直径 26.4 |
| 山脉/月谷 | 阿尔卑斯月谷 | 0.71° | 0.43° | 49.21, 3.63，直径 155.42 |
| 山脉/月谷 | 施勒特尔月谷 | 0.04° | 0.78° | 26.16, -51.58，直径 185.32 |
| 山脉/月谷 | 哈德利月溪 | 0.72° | 0.15° | 25.72, 3.15，直径 116.09 |
| 山脉/月谷 | 直壁 | 0.43° | 0.10° | -21.67, -7.7，直径 115.95 |

> 极点要素不参与上述比较：沙克尔顿（-89.9, 0）与皮里（88.6, 33）在极点附近经度退化，两套网络经度差（129.78°、8.6°）换算到实际地表距离仅数公里，保留现值并加注即可。

### 3.2 着陆点小偏差 / 边界（4 条）

| 名称 | 当前值 | 建议 | 说明 | 依据 URL | 置信度 |
| --- | --- | --- | --- | --- | --- |
| 月球9号 | 7.13, -64.37 | 7.18, -64.15（IAU Planitia Descensus）或保留并注明 | 差值 0.05°/0.22°；历史文献本身给出 7.08–7.19°N、64.15–64.37°W 的散布（NASA SP-241 约 7.19, 64.18；Walker 7.08, 64.37），属命名点定义差异 | https://planetarynames.wr.usgs.gov/Feature/4750 ；https://the-moon.us/wiki/Planitia_Descensus | 中 |
| 测量员1号 | -2.45, -43.22 | -2.474, -43.339（LROC 2013 精化坐标） | 经度差 0.12°，略超 0.05° 容差；旧值仍被广泛引用 | https://lroc.im-ldi.com/posts/117 | 中 |
| 嫦娥四号 | -45.5, 177.6 | -45.45, 177.6（IAU Statio Tianhe） | 纬度差恰为 0.05°（容差边界），可保留；如追求严格一致建议改为 -45.45 | https://planetarynames.wr.usgs.gov/Feature/15781 | 中高 |
| 施特夫勒（Stöfler） | -41.2, 6.0 | -41.1, 6.0（UNKNOWN 网） | 差 0.1°，在环形山 0.3° 容差内，可不改；仅提示与 UNKNOWN 网略有出入 | https://planetarynames.wr.usgs.gov/Feature/5736 | 中 |

### 3.3 直径与当前默认值差异 ≥20%（5 条，属控制网版本差异）

| 名称 | 当前直径 | LOLA 2011 | 差异 | 说明 |
| --- | --- | --- | --- | --- |
| 危海 | 418 km | 555.92 km | +25% | 现值＝UNKNOWN 网直径，与全表口径自洽；若升级坐标体系需一并更新 |
| 南海 | 603 km | 996.84 km | +40% | 同上；南海的 LOLA 形心/边界定义变化很大 |
| 格里马尔迪 | 173.49 km | 235 km | +26% | 同上（ULCN 2005 直径即 173.49） |
| 亚平宁山脉 | 401 km | 599.67 km | +33% | 同上 |
| 哈德利月溪 | 80 km | 116.09 km | +31% | 同上 |

### 3.4 任务清单内中文译名建议（9 条）

依据均为中国天文学会天文学名词审定委员会“天文学名词”数据库（含民政部第一批/第二批月球地名标准汉字译名）。规范名与现名不同者，建议采用规范名，并把现名/参考站旧译保留为 `aliases`。

| 英文名 | 现行中文名 | 建议中文名 | 依据 URL | 置信度 | 备注 |
| --- | --- | --- | --- | --- | --- |
| Mare Nectaris | 神酒海 | **酒海** | https://nadc.china-vo.org/astrodict/termdetails?id=2734 | 高 | “神酒海”为参考站意译，规范名为“酒海” |
| Mare Orientale | 东方海 | **东海** | https://nadc.china-vo.org/astrodict/termdetails?id=2736 | 高 | “东方海”在科普界常见，可保留为别名 |
| Aristarchus | 阿里斯塔克斯 | **阿利斯塔克**（环形山） | https://nadc.china-vo.org/astrodict/termdetails?id=305 | 中 | 名词委/民政部规范为“阿利斯塔克”；“阿里斯塔克斯”常见，可作别名 |
| Ptolemaeus | 托勒密 | **托勒玫**（环形山） | https://nadc.china-vo.org/astrodict/termdetails?id=3431 | 中 | “托勒密”为通用译名，建议保留为别名 |
| Theophilus | 狄奥菲勒斯 | **西奥菲勒斯**（环形山） | https://nadc.china-vo.org/astrodict/termdetails?id=20408 | 高 | 参考站原名即“西奥菲勒斯”，构建脚本“规范化”后反而偏离民政部标准名 |
| Surveyor | 测量员1号 | **探测者1号** | https://nadc.china-vo.org/astrodict/termdetails?id=3964 | 中 | 名词委 Surveyor＝探测者号；科普界亦用“测量员/勘测者”，建议保留为别名 |
| Vallis Alpes | 阿尔卑斯月谷 | **阿尔卑斯大峡谷** | https://nadc.china-vo.org/astrodict/termdetails?id=20465 | 中 | “月谷”为通用意译，任务清单也采用，可保留别名 |
| Vallis Schröteri | 施勒特尔月谷 | **施洛特月谷** | https://nadc.china-vo.org/astrodict/termdetails?id=4197 | 中 | 名词委作“施洛特”；“月谷”后缀可保留为惯用写法 |
| Rima Hadley | 哈德利月溪 | **哈德利溪** | https://nadc.china-vo.org/astrodict/termdetails?id=20843 | 低 | “月溪”为通用后缀，属风格问题，可保留 |

### 3.5 其他 featured 中文译名（25 条抽样，均属参考站旧译/台湾译名 vs 大陆规范名）

建议统一：采用名词委/民政部规范名，旧名进入 `aliases`（若已有 `altName` 字段则写入）。

| 英文名 | 现行中文名 | 建议中文名 | 依据 URL | 置信度 |
| --- | --- | --- | --- | --- |
| Lunar Prospector | 月球探勘者 | **月球勘探者** | https://nadc.china-vo.org/astrodict/termdetails?id=2635 | 高（“探勘者”为台湾名） |
| Ranger | 游骑兵9号 | **徘徊者9号** | https://nadc.china-vo.org/astrodict/termdetails?id=3509 | 高（“游骑兵”为台湾名） |
| Montes Carpatus | 喀尔巴仟山脉 | **喀尔巴阡山脉** | https://nadc.china-vo.org/astrodict/termdetails?id=2940 | 高（“仟”错字，规范为“阡”） |
| Rimae Alphonsus | 阿方索斯月溪 | **阿方索溪** | https://nadc.china-vo.org/astrodict/termdetails?id=20856 | 高 |
| Rima Hyginus | 许癸努斯月溪 | **希吉努斯溪** | https://nadc.china-vo.org/astrodict/termdetails?id=3557 | 高 |
| Montes Haemus | 海摩斯山脉 | **海玛斯山脉** | https://nadc.china-vo.org/astrodict/termdetails?id=2943 | 高 |
| Rimae Triesnecker | 特里斯纳凯尔月溪 | **特里斯内克尔月溪** | https://nadc.china-vo.org/astrodict/termdetails?id=26296 | 中（该词条为“试用”） |
| Janssen | 让森 | **让桑**（环形山） | https://nadc.china-vo.org/astrodict/termdetails?id=20363 | 高 |
| Hipparchus | 喜帕恰斯 | **依巴谷**（环形山） | https://nadc.china-vo.org/astrodict/termdetails?id=20429 | 高 |
| Antoniadi | 安东尼亚第 | **安东尼亚迪**（环形山） | https://nadc.china-vo.org/astrodict/termdetails?id=20509 | 高 |
| Montes Spitzbergen | 斯匹次卑尔根山脉 | **施皮茨贝尔根山脉** | https://nadc.china-vo.org/astrodict/termdetails?id=20461 | 高 |
| Fizeau | 斐索 | **菲佐**（环形山） | https://nadc.china-vo.org/astrodict/termdetails?id=20167 | 高 |
| Promontorium Heraclides | 赫拉克利德岬 | **赫拉克利德海角** | https://nadc.china-vo.org/astrodict/termdetails?id=20893 | 中（“岬”为可接受意译） |
| Fabricius | 法布里修斯 | **法布里休斯**（环形山） | https://nadc.china-vo.org/astrodict/termdetails?id=20162 | 高 |
| Montes Harbinger | 哈宾杰山脉 | **前锋山脉** | https://nadc.china-vo.org/astrodict/termdetails?id=22753 | 中 |
| Rimae Littrow | 利特罗月溪 | **利特罗夫溪** | https://nadc.china-vo.org/astrodict/termdetails?id=20877 | 中 |
| Promontorium Agassiz | 阿加西斯岬 | **阿加西海角** | https://nadc.china-vo.org/astrodict/termdetails?id=22809 | 中（“岬”为可接受意译） |
| Vallis Palitzsch | 帕雷泽西月谷 | **帕利奇谷** | https://nadc.china-vo.org/astrodict/termdetails?id=23541 | 高 |
| Palus Somni | 睡沼 | **梦沼** | https://nadc.china-vo.org/astrodict/termdetails?id=3251 | 高 |
| Promontorium Fresnel | 菲涅耳岬 | **菲涅尔海角** | https://nadc.china-vo.org/astrodict/termdetails?id=20490 | 中（“岬”为可接受意译） |
| Rima Marius | 马利厄斯月溪 | **马里乌斯溪** | https://nadc.china-vo.org/astrodict/termdetails?id=20846 | 中 |
| Vallis Snellius | 斯内利厄斯月谷 | **斯涅尔谷** | https://nadc.china-vo.org/astrodict/termdetails?id=20814 | 中 |
| Lacus Luxuriae | 奢湖 | **华贵湖** | https://nadc.china-vo.org/astrodict/termdetails?id=20829 | 高 |
| Aitken | 艾托肯 | **艾特肯**（环形山） | https://nadc.china-vo.org/astrodict/termdetails?id=108 | 高（数据集内“南极-艾特肯盆地”用“艾特肯”，环形山却用“艾托肯”，内部不一致） |
| Eratosthenes | 埃拉托色尼 | **厄拉多塞**（环形山） | https://nadc.china-vo.org/astrodict/termdetails?id=20574 | 高 |

### 3.6 其他提示

- SLIM 的 `nameEn` 用了全称 “Smart Lander for Investigating Moon”；建议显示名用 “SLIM”，全称放 `aliases`（不属错误）。
- 南极-艾特肯盆地为非 IAU 正式命名，建议在名称或名称后标注“（非正式名）”。
- 英文名核对：209 个 IAU 命名地貌的 `nameEn` 与 Gazetteer Clean Name 全部一致，未发现张冠李戴；着陆点 `nameEn` 为任务常用名，未见错误。

---

## 4. 无误抽查数量

- **任务指定 69 条：57 条完全无误**（坐标、直径、英文名、中文名均无需修改；其中佩塔维乌斯、席卡德、沙克尔顿、哈德利山、赖纳伽马 5 条在名词库中未检索到独立词条，按常用译名判为可接受，译名置信度标“中”）。
  - 12 条有问题：2 条必须修正（莫斯科海、界海）＋2 条坐标建议（月球9号、测量员1号）＋8 条译名建议（神酒海、东方海、阿里斯塔克斯、托勒密、狄奥菲勒斯、阿尔卑斯月谷、施勒特尔月谷、哈德利月溪）。校验：2+2+8=12，57+12=69。
  - 按“坐标/直径”单项计：65/69 在容差内或完全一致。
- **另加南极-艾特肯盆地 1 条**：必须修正（不在任务指定文件名清单内，但为 featured 关键盆地）。
- **featured 全量扫描**：209 个 IAU 命名地貌中 202 个（96.7%）坐标与 IAU UNKNOWN 网精确一致；7 个不匹配（6 个必须修正＋施特夫勒 0.1° 建议）；33 个着陆点中任务指定的 15 个全部完成核对（13 条无误或仅边界差异，2 条建议修正）。

---

## 5. 方法与限制

### 5.1 方法

1. 用只读方式读取 `moon_atlas_data_pretty.json`（未运行任何写回/重排脚本），抽取 `featured=true` 全部 243 条及任务指定清单。
2. 坐标/直径主依据：IAU/USGS Gazetteer of Planetary Nomenclature 每个要素页（含 “UNKNOWN”“ULCN 2005”“LOLA 2011” 多套控制网记录），并下载官方全量 KML（https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MOON_nomenclature_center_pts.kmz ，9,087 个 Placemark）做全量匹配。
3. 判定脚本先按英文名与 IAU Clean Name 匹配，再分别与 UNKNOWN、LOLA 2011 记录比纬度/经度；以任务容差（大月海/大盆地 ±1°、普通环形山 ±0.3°、着陆点 ±0.05°；山脉/月谷/月溪无明确规定，按 ±0.3° 参照）判定“必须/建议”。
4. 着陆点：IAU “Statio”（Apollo 11、嫦娥三/四/五/六号、月船3号）官方点；Apollo 12/14/15/16/17 用 NASA ALSJ 《Landing Site Coordinates》（Davies et al. 1987，IAU Mean Earth Polar Axis/DMA-603）；月球17号、测量员1号用 LROC 2013《Coordinates of Robotic Spacecraft》；月球9号用 IAU Planitia Descensus 与 the-moon 讨论页交叉验证；SLIM 用 Gunter's Space Page 公布的着陆点与 IAU Shioli 坑中心互证。
5. 中文译名依据：中国天文学会天文学名词审定委员会“天文学名词”数据库（中国科学院国家天文台 NADC 维护，https://nadc.china-vo.org/astrodict/ ；含《英汉天文学名词》与民政部第一批/第二批月球地名标准汉字译名），逐条检索比对；参考站（data 来源，见 meta.sources：ce2.greensea.org 嫦娥二号月球地图）的旧译名仅作为别名建议保留。

### 5.2 可访问的来源（2026-10-18 实测）

- IAU/USGS Gazetteer 要素页与检索页：可访问（planetarynames.wr.usgs.gov）
- IAU 官方 KML/SHP 数据（asc-planetarynames-data.s3.us-west-2.amazonaws.com）：可访问
- NASA ALSJ（apollojournals.org/alsj/alsjcoords.html）：可访问
- LROC 网站（lroc.im-ldi.com，含 posts/117 坐标表）：可访问
- 天文学名词数据库（nadc.china-vo.org/astrodict）：可访问（含词条页与词典 ZIP）
- the-moon.us wiki：可访问
- HandWiki（英文维基镜像，用于南极-艾特肯盆地）：可访问
- Gunter's Space Page（space.skyrocket.de）：可访问

### 5.3 不可达或受限的来源（影响与替代）

| 来源 | 状态 | 影响 / 替代 |
| --- | --- | --- |
| en.wikipedia.org / zh.wikipedia.org（含 REST API） | 连接失败 | 无法直接引用维基本体；南极-艾特肯盆地改用 HandWiki 镜像（页面注明“原来源 en.wikipedia.org”）并交叉 the-moon；其余要素主依据 IAU，不依赖维基 |
| www.wikidata.org、www.wikiwand.com | 连接失败 | 未使用 |
| web.archive.org | 连接失败 | 无法取维基历史快照 |
| nssdc.gsfc.nasa.gov（NSSDC） | 连接失败 | 着陆点改用 ALSJ/LROC/IAU |
| www.lpi.usra.edu（LPI） | HTTP 403 | 未使用 |
| 全球 JAXA/ISAS/DARTS（global.jaxa.jp、slim.isas.jaxa.jp、darts.isas.jaxa.jp 等） | 连接失败 | SLIM 官方坐标页不可达，SLIM 坐标置信度降为“中”，改用 Gunter's Space Page＋IAU Shioli 坑中心互证 |
| www.cnsa.gov.cn（国家航天局）、www.clep.org.cn（探月工程） | 连接失败 | 嫦娥系列坐标改用 IAU “Statio” 官方命名点（权威且可核） |
| www.isro.gov.in | HTTP 403（安全验证） | 月船3号改用 IAU Statio Shiv Shakti |
| baike.baidu.com | HTTP 403（安全验证） | 中文译名改用名词委数据库 |

### 5.4 其他限制

- 数据坐标采用 IAU UNKNOWN 历史控制网，与当前默认 LOLA 2011 的系统性差异见 3.1；若产品要宣称“IAU 当前坐标”，需统一升级并同步更新直径，否则应在 `meta.notes` 中明确控制网口径。
- 南极-艾特肯盆地无 IAU 正式命名，中心坐标在文献中有 53°S 169°W（英文维基/HandWiki）与 56°S 180°E（the-moon）等不同口径，故其建议值置信度标“中高”。
- 月球9号、测量员1号等着陆点历史坐标本身有 0.1–0.2° 量级散布，超过 0.05° 容差时按“建议修正/注记”处理，未升级为“必须修正”。
- 中文名“未核实”项：佩塔维乌斯、席卡德、沙克尔顿、哈德利山、赖纳伽马在名词库中无独立词条（不等于错误），按常用译名判为可接受；如需“已出版”依据，建议再查民政部月球地名标准译名纸质/正式发布版。
- 本次仅审校地名标签数据，未检查 3D 渲染、纹理贴图与标签遮挡等可视化问题。

---

*审计者：label-auditor（独立审校，task-1）。所有 URL 均为 2026-10-18 实测可访问（除 5.3 列明者）。*
