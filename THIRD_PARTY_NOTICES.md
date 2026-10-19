# Third-Party Notices / 第三方素材声明

SelenoAtlas（望月）的 MIT 许可证只覆盖项目自身的源代码和文档。应用/仓库中打包或使用的下列第三方素材遵循其各自来源的许可与署名要求，不由本项目的 MIT 许可重新授权。

## 1. Three.js r128

- 文件：`web/vendor/three.min.js`
- Copyright © 2010-2021 Three.js Authors
- License: MIT
- Source: https://github.com/mrdoob/three.js
- License text: https://github.com/mrdoob/three.js/blob/r128/LICENSE

```text
MIT License

Copyright (c) 2010-2021 Three.js Authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 2. Moon color texture

- 文件：`web/textures/moon_color_4k.jpg`、`web/textures/moon_color_1k.jpg`，以及 APK 中对应的内嵌纹理
- 来源：Solar System Scope Texture Library — Moon
- 来源页面：https://www.solarsystemscope.com/textures/
- Copyright (c) Solar System Scope
- License: **Creative Commons Attribution 4.0 International (CC BY 4.0)**
  https://creativecommons.org/licenses/by/4.0/
- 变更说明：为离线 Web/APK 交付，对原图进行了缩放与 JPEG 压缩；未改变月面内容。
- 说明：Solar System Scope 的纹理基于 NASA LRO 月面影像。

## 3. Lunar elevation / imagery

- 文件：`web/textures/moon_bump_4k.jpg`、`web/textures/moon_bump_1k.jpg`，以及 APK 中对应的内嵌高程纹理
- 数据来源：NASA Lunar Reconnaissance Orbiter (LRO) LOLA / WAC GLD100 高程数据
- 镜像来源：Jaanga heightmaps
- 鸣谢：NASA / Goddard Space Flight Center / Arizona State University
- 使用说明：NASA 图像与数据一般不受版权保护，但使用时应保留 NASA 及数据提供方的署名。具体数据条款以 NASA/PDS 与镜像页面为准。
- Links:
  - https://www.nasa.gov/
  - https://lunar.gsfc.nasa.gov/
  - https://pds-geosciences.wustl.edu/

## 4. Lunar nomenclature and place-name data

- 来源：IAU Working Group for Planetary System Nomenclature / USGS Astrogeology,
  Gazetteer of Planetary Nomenclature
- URL: https://planetarynames.wr.usgs.gov/
- 用途：IAU 月球地名、坐标与类型参考；地名中文译名参考中国天文学会天文学名词数据库及嫦娥二号月球地图。
- 说明：IAU 官方地名本身是公开的科学命名；本项目的坐标整理与中文译名整理属于项目数据汇编，第三方名称/数据仍应保留来源署名。

## 5. Chinese translations and reference data

- 中国天文学会天文学名词数据库：https://www.astronomynames.cn/
- 嫦娥二号月球地图（greensea）：https://ce2.greensea.org/
- 用途：中文译名、旧译名与检索别名参考。
- 说明：参考站内容不随本项目重新授权；如再分发，请保留对应来源署名。

## 6. Mission / landing-site data

- 人类探测器着陆点、任务年份与国别信息来自公开任务资料、IAU Gazetteer 和 NASA/ALSO/任务页面等公开来源。
- 着陆点坐标为任务公布值或 IAU 命名点，受着陆精度限制；仅用于科普可视化。

## 7. Lunar eclipse catalog

- 数据文件：`web/data/eclipses.json` / 应用内 `ECLIPSES`
- 来源：NASA GSFC, Five Millennium Catalog of Lunar Eclipses: -1999 to +3000
  (Fred Espenak & Jean Meeus), https://eclipse.gsfc.nasa.gov/LEcat5/LE2001-2100.html
- 选段：2001–2035 年；字段：日期、类型（半影/偏食/全食）、半影/本影食分
- 来源要求署名：**“Eclipse Predictions by Fred Espenak and Jean Meeus (NASA's GSFC)”**
- 说明：月食数据为静态历史目录，不在应用内实时计算；如需更新，请以 NASA 目录为准。

## 8. 项目自身内容

- 原始 Android WebView 壳代码、Web 应用源码、构建脚本与文档：
  Copyright (c) 2026 excessiverain，MIT（见根目录 `LICENSE`）。
- 应用内中文/英文说明文字、UI 文案与数据整理：除第三方来源内容外，随项目代码按 MIT 发布。
- `preview.png`、`screenshots/`、`web/textures/*_check.jpg` 等截图/校验图包含上述第三方月面纹理，再分发时同样应保留本声明中的纹理署名。

## 9. No affiliation

本项目是个人学习与科普项目，与 NASA、IAU、USGS、Solar System Scope、中国天文学会或嫦娥二号任务团队无隶属或官方合作关系。相关名称与标识归其各自权利人所有。

---

最后更新：2026-10-19
