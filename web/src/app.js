/* =========================================================================
   望月 SelenoAtlas · 月面三维地名图  /  Lunar 3D Atlas
   单文件交付版：Three.js r128 + NASA LRO 纹理 + IAU 地名数据
   坐标约定：IAU 月球坐标，东经为正（E+），北纬为正（N+）
   ========================================================================= */
(function () {
  'use strict';

  var ATLAS = window.__ATLAS__;
  var TEX_COLOR = window.__TEX_COLOR__;
  var TEX_BUMP = window.__TEX_BUMP__;
  if (!ATLAS || !ATLAS.features) {
    showFatal('地名数据未能载入。');
    return;
  }

  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;
  var MOON_RADIUS_KM = 1737.4;
  var LANG = (function () {
    try {
      var q = new URLSearchParams(location.search).get('lang');
      if (q === 'en' || q === 'zh') return q;
      var saved = localStorage.getItem('seleno-lang');
      if (saved === 'en' || saved === 'zh') return saved;
      var nav = String(navigator.language || navigator.userLanguage || 'zh').toLowerCase();
      return nav.indexOf('zh') === 0 ? 'zh' : 'en';
    } catch (e) { return 'zh'; }
  })();
  function isEN() { return LANG === 'en'; }
  function tr(zh, en) { return LANG === 'en' ? en : zh; }
  function nameOf(f) { return (isEN() && f.nameEn) ? f.nameEn : f.name; }
  function secondaryName(f) { return isEN() ? f.name : (f.nameEn || ''); }
  function altNameOf(f) { return isEN() ? (f.nameEn ? f.name : '') : (f.nameEn || ''); }
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var $ = function (id) { return document.getElementById(id); };
  var now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };
  var isMobile = function () { return window.innerWidth <= 900; };

  /* ---------------------------------------------------------------------
     类型与分组
     --------------------------------------------------------------------- */
  var TYPE_META = {
    mare:        { label: '月海',       en: 'Mare',            color: '#8db4ff', group: 'water' },
    lake:        { label: '湖 / 湾',    en: 'Lake / Bay',      color: '#9ecbff', group: 'water' },
    water:       { label: '月海',       en: 'Lunar sea',       color: '#8db4ff', group: 'water' },
    crater:      { label: '环形山',     en: 'Crater',          color: '#efe6d5', group: 'crater' },
    basin:       { label: '盆地',       en: 'Basin',           color: '#d8b4ff', group: 'crater' },
    montes:      { label: '山脉',       en: 'Mountain range',  color: '#f4c07b', group: 'mountain' },
    mons:        { label: '山',         en: 'Mountain',        color: '#f4c07b', group: 'mountain' },
    rille:       { label: '月溪',       en: 'Rille',           color: '#f3a292', group: 'tectonic' },
    valley:      { label: '月谷',       en: 'Valley',          color: '#f7a273', group: 'tectonic' },
    rupes:       { label: '断崖',       en: 'Rupes',           color: '#ef8a8a', group: 'tectonic' },
    dorsum:      { label: '山脊',       en: 'Dorsum',          color: '#e7a06c', group: 'tectonic' },
    promontorium:{ label: '岬',         en: 'Promontorium',    color: '#e7a06c', group: 'tectonic' },
    catena:      { label: '链坑',       en: 'Catena',          color: '#d7a4c7', group: 'tectonic' },
    swirl:       { label: '月面涡纹',   en: 'Lunar swirl',     color: '#c8a8ff', group: 'tectonic' },
    tectonic:    { label: '构造',       en: 'Tectonic feature', color: '#e7a06c', group: 'tectonic' },
    landing:     { label: '探测点',     en: 'Landing site',    color: '#78dcef', group: 'landing' }
  };
  var GROUP_META = [
    { id: 'water',    label: '月海 · 湖湾',  labelEn: 'Maria · Lakes',    short: '月海',   shortEn: 'Maria',      color: '#8db4ff' },
    { id: 'crater',   label: '环形山 · 盆地', labelEn: 'Craters · Basins', short: '环形山', shortEn: 'Craters',    color: '#efe6d5' },
    { id: 'mountain', label: '山脉',         labelEn: 'Mountains',        short: '山脉',   shortEn: 'Mountains',  color: '#f4c07b' },
    { id: 'tectonic', label: '谷裂 · 断崖',  labelEn: 'Tectonics',        short: '谷裂',   shortEn: 'Tectonics',  color: '#f3a292' },
    { id: 'landing',  label: '人类探测点',   labelEn: 'Landing sites',    short: '探测点', shortEn: 'Landing',    color: '#78dcef' }
  ];
  var GROUP_BY_ID = {};
  GROUP_META.forEach(function (g) { GROUP_BY_ID[g.id] = g; });

  function metaFor(f) { return TYPE_META[f.type] || { label: f.type || '地貌', en: f.type || 'Feature', color: '#dfe7f5', group: f.group || 'crater' }; }
  function groupMeta(f) { return GROUP_BY_ID[f.group] || GROUP_BY_ID.crater; }
  function typeName(f) {
    var m = metaFor(f);
    return isEN() ? (m.en || m.label) : m.label;
  }
  function groupName(g) { return isEN() ? (g.labelEn || g.label) : g.label; }
  function groupShort(g) { return isEN() ? (g.shortEn || g.short) : g.short; }
  function diameterOf(f) {
    return (typeof f.diameter === 'number' && isFinite(f.diameter)) ? f.diameter : null;
  }
  function fmtNum(v, digits) {
    if (v == null || !isFinite(v)) return '—';
    var d = (digits == null) ? (Math.abs(v) >= 100 ? 0 : 1) : digits;
    return Number(v).toFixed(d).replace(/\.0$/, '');
  }
  function fmtCoord(f) {
    return Math.abs(f.lat).toFixed(2) + '°' + (f.lat >= 0 ? 'N' : 'S') + '  ' +
           Math.abs(f.lon).toFixed(2) + '°' + (f.lon >= 0 ? 'E' : 'W');
  }
  function sideOf(f) {
    if (Math.abs(f.lat) >= 80) return isEN() ? (f.lat > 0 ? 'North polar region' : 'South polar region') : (f.lat > 0 ? '北极区' : '南极区');
    if (Math.abs(f.lon) <= 90) return isEN() ? 'Near side · Earth-facing' : '近地面 · 正面';
    return isEN() ? 'Far side' : '月球背面';
  }
  function shortSide(f) {
    if (Math.abs(f.lat) >= 80) return isEN() ? (f.lat > 0 ? 'North polar' : 'South polar') : (f.lat > 0 ? '北极' : '南极');
    if (Math.abs(f.lon) <= 90) return isEN() ? 'Near side' : '正面';
    return isEN() ? 'Far side' : '背面';
  }
  function ce2Url(f) {
    var map = f.lat > 60 ? 'north' : (f.lat < -60 ? 'south' : 'lowlat');
    var d = diameterOf(f) || 80;
    var z = d > 400 ? 3 : (d > 120 ? 4 : (d > 40 ? 5 : 6));
    return 'https://ce2.greensea.org/#/@' + f.lat.toFixed(6) + ',' + f.lon.toFixed(6) + ',' + z + 'z,' + map;
  }
  // 低精度月相：以 2000-01-06 的新月为基准，按平均朔望月推算太阳直射经度。
  // 用于“按当前时间”的真实日照可视化；误差主要来自月球天平动和轨道偏心率，适合展示而非星历级计算。
  function subsolarPoint(date) {
    var jd = date.getTime() / 86400000 + 2440587.5;
    var synodic = 29.530588853;
    var age = ((jd - 2451550.1) % synodic + synodic) % synodic;
    var phase = age / synodic;
    var lon = 180 - phase * 360;
    lon = ((lon + 540) % 360) - 180;
    return { lon: lon, lat: 0, phase: phase };
  }

  function updateSunFromClock() {
    var p = subsolarPoint(new Date());
    state.sunLon = p.lon;
    state.sunLat = p.lat;
    if (state.lightMode === 'sun') updateLights();
  }

  function kindEn(kind) {
    var m = {
      '载人着陆': 'Manned landing', '软着陆': 'Soft landing', '采样返回': 'Sample return',
      '巡视': 'Rover', '撞击': 'Impact', '受控撞击': 'Controlled impact',
      '软着陆 / 巡视': 'Soft landing / rover', '着陆': 'Landing'
    };
    return m[kind] || kind;
  }
  function countryEn(c) {
    var m = { '中国': 'China', '美国': 'United States', '苏联': 'USSR', '俄罗斯': 'Russia', '日本': 'Japan', '印度': 'India', '欧洲': 'Europe', '以色列': 'Israel' };
    return m[c] || c;
  }
  var TYPE_DESC_EN = {
    mare: 'A large, dark basaltic plain on the Moon; maria are not bodies of water.',
    lake: 'A small dark basaltic plain or bay within the lunar highlands.',
    crater: 'An impact crater on the lunar surface.',
    basin: 'A large impact basin, often with multiple rings.',
    montes: 'A mountain range on the Moon.',
    mons: 'An isolated lunar mountain or massif.',
    rille: 'A long, narrow channel or rille on the lunar surface.',
    valley: 'A valley or graben on the Moon.',
    rupes: 'A fault scarp or cliff.',
    dorsum: 'A wrinkle ridge formed by tectonic compression.',
    promontorium: 'A prominent cape or headland.',
    catena: 'A chain of impact craters.',
    swirl: 'A bright lunar swirl associated with a magnetic anomaly.',
    tectonic: 'A tectonic or structural feature.',
    landing: 'A human or robotic landing / impact site on the Moon.'
  };

  function makeNote(f) {
    if (f.type === 'landing') return '';
    if (f.type === 'mare' || f.type === 'lake' || f.type === 'water') {
      return tr('月海与月湖并非液态水体，而是古代大型撞击盆地被玄武岩熔岩填充后形成的深色平原。',
                'Lunar maria are not water: they are dark basaltic plains formed when ancient impact basins were flooded by lava.');
    }
    if (f.id === 'crater-shackleton' || f.nameEn === 'Shackleton') {
      return tr('南极附近的永久阴影撞击坑，坑底温度极低，是月球水冰探测的重点区域。',
                'A permanently shadowed crater near the lunar south pole; its floor is extremely cold and is a key target for water-ice exploration.');
    }
    if (f.nameEn === 'Cabeus') {
      return tr('LCROSS 任务 2009 年撞击卡比厄斯坑附近，探测到水冰存在的证据。',
                'LCROSS impacted near Cabeus in 2009 and detected evidence of water ice.');
    }
    if (f.nameEn === 'Reiner Gamma') {
      return tr('典型的月面涡纹（lunar swirl），与局部磁场相关，成因仍在研究中。',
                'A classic lunar swirl associated with a local magnetic anomaly; its origin is still under study.');
    }
    return '';
  }

  /* ---------------------------------------------------------------------
     数据准备
     --------------------------------------------------------------------- */
  var FEATURES = ATLAS.features.map(function (f) {
    f._meta = metaFor(f);
    f._g = f.group || f._meta.group;
    if (!f._g) f._g = 'crater';
    f._p = sph(f.lat, f.lon);
    f._search = lower([f.name, f.nameEn, f.altName].concat(f.aliases || []).filter(Boolean).join(' '));
    f._displayEn = !!f.featured && (f.priority >= 78 || f.type === 'landing');
    f._diameter = diameterOf(f);
    return f;
  });
  var BY_ID = {};
  FEATURES.forEach(function (f) { BY_ID[f.id] = f; });
  var FEATURED = FEATURES.filter(function (f) { return f.featured; });
  var GROUP_COUNTS = {};
  var FEATURED_COUNTS = {};
  GROUP_META.forEach(function (g) { GROUP_COUNTS[g.id] = 0; FEATURED_COUNTS[g.id] = 0; });
  FEATURES.forEach(function (f) {
    if (GROUP_COUNTS[f._g] != null) GROUP_COUNTS[f._g]++;
    if (f.featured && FEATURED_COUNTS[f._g] != null) FEATURED_COUNTS[f._g]++;
  });

  function lower(s) { return String(s == null ? '' : s).toLowerCase(); }
  function sph(lat, lon) {
    var la = lat * D2R, lo = lon * D2R, c = Math.cos(la);
    return { x: c * Math.cos(lo), y: Math.sin(la), z: -c * Math.sin(lo) };
  }
  function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
  function angleBetween(a, b) { return Math.acos(clamp(dot(a, b), -1, 1)) * R2D; }

  /* ---------------------------------------------------------------------
     全局状态
     --------------------------------------------------------------------- */
  var state = {
    camLon: 4, camLat: 5, camRadius: homeRadius(), targetRadius: homeRadius(),
    autoRotate: true,
    grid: false,
    lightMode: 'soft',
    sunLon: null,
    sunLat: null,
    layers: { water: true, crater: true, mountain: true, tectonic: true, landing: true },
    selectedId: null,
    tab: 'all',
    flying: null,
    inertiaLon: 0,
    inertiaLat: 0,
    dragging: false,
    lastInteract: 0,
    ready: false,
    pointer: { x: 0, y: 0, over: false, t: 0 },
    hoverId: null,
    labelCount: 0
  };
  readHash();

  function readHash() {
    try {
      var h = window.location.hash.replace(/^#\/?/, '');
      if (!h) return;
      var p = h.split(',').map(Number);
      if (p.length >= 3 && isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2])) {
        state.camLat = clamp(p[0], -88, 88);
        state.camLon = ((p[1] + 540) % 360) - 180;
        state.camRadius = clamp(p[2], 1.12, 6.6);
        state.targetRadius = state.camRadius;
      }
    } catch (e) {}
  }
  var lastHash = '';
  function updateHash() {
    if (!state.ready) return;
    var h = state.camLat.toFixed(2) + ',' + state.camLon.toFixed(2) + ',' + state.camRadius.toFixed(2);
    if (h === lastHash) return;
    lastHash = h;
    try { history.replaceState(null, '', '#' + h); } catch (e) {}
  }

  /* ---------------------------------------------------------------------
     DOM / UI 基础
     --------------------------------------------------------------------- */
  var labelsEl, coordEl, listEl, listCountEl, chipsEl, searchInput, searchResults, searchWrap, searchKbd;
  var infoBody, infoClose, toastEl, coachEl;
  var uiReady = false;

  function initUI() {
    labelsEl = $('labels');
    coordEl = $('coordReadout');
    listEl = $('featureList');
    listCountEl = $('listCount');
    chipsEl = $('layerChips');
    searchInput = $('searchInput');
    searchResults = $('searchResults');
    searchWrap = $('searchWrap');
    searchKbd = $('searchKbd');
    infoBody = $('infoBody');
    infoClose = $('infoClose');
    toastEl = $('toast');
    coachEl = $('coach');

    var total = FEATURES.length;
    $('brandCount').textContent = total.toLocaleString(isEN() ? 'en-US' : 'zh-CN') + tr(' 个地名', ' places');
    buildLayerChips();
    buildTabs();
    renderOverview();
    renderList();
    applyLanguage();
    var legalLinks = $('legalLinks');
    if (legalLinks && window.LunarApp) legalLinks.hidden = false;
    bindUI();
    uiReady = true;
  }

  function setText(sel, text) {
    var el = document.querySelector(sel);
    if (el) el.textContent = text;
  }

  function applyStaticLanguage() {
    document.documentElement.lang = isEN() ? 'en' : 'zh-CN';
    document.title = isEN()
      ? 'Wangyue SelenoAtlas · Lunar 3D Atlas'
      : '望月 SelenoAtlas · 月面三维地名图 | Lunar 3D Atlas';
    var brandP = document.querySelector('.brand-copy p');
    if (brandP) {
      brandP.innerHTML = (isEN() ? 'LUNAR 3D ATLAS' : '月面三维地名图 · LUNAR 3D ATLAS') +
        ' <i></i> <span id="brandCount">' + FEATURES.length.toLocaleString(isEN() ? 'en-US' : 'zh-CN') +
        (isEN() ? ' places' : ' 个地名') + '</span>';
    }
    var langBtn = $('btnLang');
    if (langBtn) {
      langBtn.textContent = isEN() ? '中' : 'EN';
      langBtn.title = isEN() ? '切换到中文' : 'Switch to English';
      langBtn.classList.toggle('on', isEN());
    }
    setText('.panel-title', tr('图层与地标', 'Layers & features'));
    setText('#btnRandom span', tr('随机', 'Random'));
    setText('.list-head span', tr('精选地名', 'Featured places'));
    setText('.panel-foot span', tr('指针坐标', 'Cursor'));
    setText('#coordReadout', coordEl && coordEl.textContent !== '—' ? coordEl.textContent : '—');
    setText('.mini-head span', tr('全月图 2D', 'Full Moon map 2D'));
    setText('.mini-hint', tr('点击定位', 'Click to navigate'));
    var miniLegend = document.querySelector('.mini-legend');
    if (miniLegend) miniLegend.innerHTML = '<i class="near"></i>' + tr('近地面', 'Near side') + ' <i class="view"></i>' + tr('当前视野', 'View');
    setText('#btnAuto span', tr('自转', 'Rotate'));
    setText('#btnGrid span', tr('经纬网', 'Grid'));
    setText('#lightLabel', state.lightMode === 'soft' ? tr('柔光', 'Soft') : tr('日照', 'Sun'));
    var viewLabels = { near: tr('正面', 'Near'), far: tr('背面', 'Far'), north: tr('北极', 'North'), south: tr('南极', 'South') };
    document.querySelectorAll('.view-btn').forEach(function (b) { b.textContent = viewLabels[b.dataset.view] || b.textContent; });
    if (searchInput) {
      searchInput.placeholder = tr('搜索地名：第谷 / 静海 / 阿波罗11号 / Tycho', 'Search: Tycho / Mare Imbrium / Apollo 11');
      searchInput.setAttribute('aria-label', tr('搜索月球地名', 'Search lunar place names'));
    }
    if (coachEl) coachEl.textContent = tr('拖拽旋转 · 滚轮缩放 · 点击地名查看详情', 'Drag to rotate · Scroll / pinch to zoom · Tap a label for details');
    if (infoClose) infoClose.title = tr('关闭详情', 'Close details');
    setText('.info-top .eyebrow', 'FEATURE');

    // 关于弹窗
    var modalCard = document.querySelector('.modal-card');
    if (modalCard) {
      var h2 = modalCard.querySelector('h2');
      if (h2) h2.textContent = tr('望月 SelenoAtlas', 'Wangyue SelenoAtlas');
      var lede = modalCard.querySelector('.lede');
      if (lede) lede.innerHTML = isEN()
        ? '<b>Lunar 3D Atlas</b><br>SelenoAtlas (望月) is a three-dimensional lunar place-name atlas: real LRO imagery and elevation, IAU nomenclature, maria, craters, mountains, valleys and human landing sites. Interaction and place-name browsing are inspired by the <a href="https://ce2.greensea.org/" target="_blank" rel="noopener">Chang’e-2 lunar map</a>.'
        : '<b>月面三维地名图 · Lunar 3D Atlas</b><br>把月球放进浏览器里：用真实月面影像与高程构建可旋转的三维球体，叠加 IAU 地名、月海、环形山、山脉、月谷以及人类探测器的着陆点。地名浏览与检索交互参考<a href="https://ce2.greensea.org/" target="_blank" rel="noopener">嫦娥二号月球地图</a>。';
      var h3s = modalCard.querySelectorAll('h3');
      if (h3s[0]) h3s[0].textContent = tr('交互', 'Interaction');
      if (h3s[1]) h3s[1].textContent = tr('坐标约定', 'Coordinates');
      if (h3s[2]) h3s[2].textContent = tr('数据与影像', 'Data & imagery');
      var uls = modalCard.querySelectorAll('.modal-grid ul');
      if (uls[0]) uls[0].innerHTML = isEN()
        ? '<li><b>Drag</b> to rotate · <b>Scroll / pinch</b> to zoom</li><li><b>Tap a label</b> for coordinates, size and naming notes</li><li><b>Ctrl K</b> search · <b>Esc</b> close</li><li><b>R</b> rotate · <b>G</b> grid · <b>Arrow keys</b> adjust view</li><li><b>Double-click</b> the lunar surface to locate and zoom</li>'
        : '<li><b>拖拽</b> 旋转月球 · <b>滚轮 / 双指</b> 缩放</li><li><b>点击地名</b> 查看坐标、直径与命名来源</li><li><b>Ctrl K</b> 聚焦搜索 · <b>Esc</b> 关闭详情</li><li><b>R</b> 自转 · <b>G</b> 经纬网 · <b>方向键</b> 微调视角</li><li><b>双击月面</b> 快速定位并放大</li>';
      if (uls[1]) uls[1].innerHTML = isEN()
        ? '<li>IAU lunar coordinates, <b>east-positive</b> (E+ / W−).</li><li>Latitude 0° is the equator; ±90° are the poles.</li><li>|lon| ≤ 90° is the near side; the rest is the far side.</li><li>Mean lunar radius: 1,737.4 km.</li>'
        : '<li>IAU 月球坐标，<b>东经为正</b>（E+ / W−）。</li><li>纬度 0° 为赤道，±90° 为两极。</li><li>经度 |λ| ≤ 90° 为近地面（正面），其余为月球背面。</li><li>月球平均半径 1,737.4 km。</li>';
      var sourceLabels = ['地名与检索交互参考', '地名规范', '中文译名', '彩色月面纹理', '高程 / 地形', '三维引擎'];
      var sourceLabelsEn = ['Place-name reference', 'Nomenclature', 'Chinese names', 'Color imagery', 'Elevation', '3D engine'];
      modalCard.querySelectorAll('.sources li span').forEach(function (s, i) { s.textContent = isEN() ? (sourceLabelsEn[i] || s.textContent) : (sourceLabels[i] || s.textContent); });
      var fine = modalCard.querySelector('.fineprint');
      if (fine) fine.textContent = isEN()
        ? 'Lunar maria are not water: they are ancient basaltic lava plains. Landing-site coordinates are task-reported or IAU named points and are subject to landing accuracy. Chinese naming notes are retained as source material; the interface is available in Chinese and English. Data reviewed 2026-10-18; see docs/qa_label_audit.md.'
        : '说明：月海并非液态水，而是古老玄武岩熔岩填充的平原；探测器坐标为任务公布值或 IAU 命名点，受着陆点精度限制。地名中文译名以通用译名为主，部分参考站旧译名保留为检索别名。数据已于 2026-10-18 完成独立审校：修正 7 处显著录入错误，并对差异较大的大型地貌采用 IAU LOLA 2011 坐标；审校记录见项目目录 docs/qa_label_audit.md。';
      var primary = modalCard.querySelector('.modal-actions .primary-btn');
      var ok = modalCard.querySelector('#modalOk');
      if (primary) primary.textContent = tr('打开嫦娥二号月球地图 ↗', 'Open the Chang’e-2 lunar map ↗');
      if (ok) ok.textContent = tr('开始探索', 'Start exploring');
    }
  }

  function refreshLabelsForLanguage() {
    if (typeof labelEls === 'undefined' || !labelEls || !labelsEl) return;
    labelsEl.innerHTML = '';
    labelEls = {};
    labelSizes = {};
    visibleLabelIds = {};
    if (state.selectedId) {
      var f = BY_ID[state.selectedId];
      if (f) { var el = getLabelEl(f); el.classList.add('sel'); }
    }
    if (state.ready) updateLabels();
  }

  function applyLanguage() {
    applyStaticLanguage();
    buildLayerChips();
    buildTabs();
    renderList();
    if (state.selectedId && BY_ID[state.selectedId]) renderDetail(BY_ID[state.selectedId]);
    else renderOverview();
    if (searchOpen && searchInput) {
      if (searchInput.value.trim()) runSearch(searchInput.value);
      else showSearchHistory();
    }
    if (typeof keyLight !== 'undefined' && keyLight) setLightMode(state.lightMode);
    refreshLabelsForLanguage();
  }


  function buildLayerChips() {
    chipsEl.innerHTML = '';
    GROUP_META.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (state.layers[g.id] ? ' on' : '');
      b.dataset.group = g.id;
      b.style.setProperty('--c', g.color);
      b.innerHTML = '<i class="cdot"></i><span>' + esc(groupName(g)) + '</span>' +
        '<span class="cnum">' + GROUP_COUNTS[g.id] + '</span>';
      b.title = tr('显示 / 隐藏 ', 'Show / hide ') + groupName(g);
      b.addEventListener('click', function () {
        state.layers[g.id] = !state.layers[g.id];
        b.classList.toggle('on', state.layers[g.id]);
        renderList();
        if (state.selectedId) {
          var sel = BY_ID[state.selectedId];
          if (sel && !state.layers[sel._g]) hideLabel(state.selectedId);
        }
      });
      chipsEl.appendChild(b);
    });
  }

  function buildTabs() {
    var tabs = document.querySelectorAll('#listTabs .tab');
    var labels = {
      all: tr('全部', 'All'),
      water: tr('月海', 'Maria'),
      crater: tr('环形山', 'Craters'),
      mountain: tr('山脉', 'Mtns'),
      tectonic: tr('谷裂', 'Tect.'),
      landing: tr('探测点', 'Sites')
    };
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].textContent = labels[tabs[i].dataset.tab] || tabs[i].textContent;
      (function (tab) {
        if (tab.dataset.bound) return;
        tab.dataset.bound = '1';
        tab.addEventListener('click', function () {
          state.tab = tab.dataset.tab;
          for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('on', tabs[j] === tab);
          renderList();
        });
      })(tabs[i]);
    }
  }

  function renderOverview() {
    if (!infoBody) return;
    infoClose.hidden = true;
    var eyebrow = document.querySelector('.info-top .eyebrow');
    if (eyebrow) eyebrow.textContent = 'OVERVIEW';
    var groupLegend = GROUP_META.map(function (g) {
      return '<div class="legend-row" style="--c:' + g.color + '"><i></i><span>' + esc(groupName(g)) +
        '</span><span>' + FEATURED_COUNTS[g.id] + '</span></div>';
    }).join('');
    var featureCount = FEATURES.length.toLocaleString(isEN() ? 'en-US' : 'zh-CN');
    infoBody.innerHTML =
      '<div class="overview">' +
        '<div class="eyebrow">' + (isEN() ? "THE MOON · EARTH'S NATURAL SATELLITE" : 'THE MOON · 地球的天然卫星') + '</div>' +
        '<h2>' + (isEN() ? 'The Moon' : '月球') + '</h2>' +
        '<div class="en-title">LUNA · 3D ATLAS</div>' +
        '<p class="lede">' + (isEN()
          ? 'Explore the Moon in your browser. Drag to orbit, scroll or pinch to zoom, and tap a place label to read its coordinates, size and naming notes.'
          : '把月球放在浏览器里。拖动球体环视正面与背面，缩放查看环形山，点击地名读取它的坐标、规模与命名来源。') + '</p>' +
        '<div class="fact-grid">' +
          '<div class="fact"><div class="fk">' + (isEN() ? 'Mean radius' : '平均半径') + '</div><div class="fv">1,737.4<span class="fu">km</span></div></div>' +
          '<div class="fact"><div class="fk">' + (isEN() ? 'Surface gravity' : '表面重力') + '</div><div class="fv">1.62<span class="fu">m/s²</span></div></div>' +
          '<div class="fact"><div class="fk">' + (isEN() ? 'Earth–Moon distance' : '地月距离') + '</div><div class="fv">384,400<span class="fu">km</span></div></div>' +
          '<div class="fact"><div class="fk">' + (isEN() ? 'Sidereal month' : '恒星月') + '</div><div class="fv">27.32<span class="fu">' + (isEN() ? 'days' : '天') + '</span></div></div>' +
          '<div class="fact"><div class="fk">' + (isEN() ? 'Named features' : '地名总数') + '</div><div class="fv">' + featureCount + '<span class="fu">' + (isEN() ? '' : '个') + '</span></div></div>' +
          '<div class="fact"><div class="fk">' + (isEN() ? 'Featured labels' : '精选标注') + '</div><div class="fv">' + FEATURED.length + '<span class="fu">' + (isEN() ? '' : '处') + '</span></div></div>' +
        '</div>' +
        '<div class="section-label">' + (isEN() ? 'LEGEND' : '图例') + '</div>' +
        '<div class="legend">' + groupLegend + '</div>' +
        '<div class="overview-actions">' +
          '<button class="primary-btn" data-action="random" type="button">' + (isEN() ? 'Random feature' : '随机看一个地标') + '</button>' +
          '<button class="ghost-btn" data-action="home" type="button">' + (isEN() ? 'Near side' : '回到正面') + '</button>' +
        '</div>' +
        '<div class="section-label" style="margin-top:19px">' + (isEN() ? 'TIPS' : '使用提示') + '</div>' +
        '<p class="fineprint">' + (isEN()
          ? 'Tap a label on the globe, or use the Featured places list / search box. Labels are shown automatically without overlapping; zoom in to reveal more detail.'
          : '点击球面上的地名标签，或在左侧“精选地名”与顶部搜索框中定位。地名标签按视角与缩放在不重叠的前提下自动显示，放大后可看到更多细节。') + '</p>' +
      '</div>';
  }

  function renderList() {
    if (!listEl) return;
    var items = FEATURED.filter(function (f) {
      return state.layers[f._g] && (state.tab === 'all' || f._g === state.tab);
    });
    items.sort(function (a, b) { return (b.priority || 0) - (a.priority || 0) || nameOf(a).localeCompare(nameOf(b), isEN() ? 'en' : 'zh'); });
    var shown = items.slice(0, 90);
    listCountEl.textContent = items.length;
    if (!shown.length) {
      listEl.innerHTML = '<div class="list-empty">' + tr('这一类地标暂时没有显示。<br>试试打开上方图层，或直接搜索地名。',
        'No features in this category.<br>Try enabling a layer above, or search for a place.') + '</div>';
      return;
    }
    var html = '';
    shown.forEach(function (f) {
      var g = groupMeta(f);
      var d = f._diameter;
      var km = '';
      if (d != null) km = fmtNum(d) + ' km';
      else if (f.year) km = f.year;
      var secondary = secondaryName(f);
      html += '<div class="feat-item' + (state.selectedId === f.id ? ' sel' : '') + '" data-id="' + esc(f.id) + '">' +
        '<i class="fdot" style="--c:' + g.color + '"></i>' +
        '<div class="fmain"><div class="fname">' + esc(nameOf(f)) + '</div>' +
        '<div class="fen">' + esc(secondary || '') + '</div></div>' +
        (km ? '<span class="fkm">' + esc(km) + '</span>' : '') +
        '</div>';
    });
    listEl.innerHTML = html;
  }

  function updateListSelection() {
    if (!listEl) return;
    var nodes = listEl.querySelectorAll('.feat-item');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('sel', nodes[i].dataset.id === state.selectedId);
    }
  }

  /* ---------------------------------------------------------------------
     搜索
     --------------------------------------------------------------------- */
  var searchItems = [];
  var searchActive = -1;
  var searchOpen = false;
  var SEARCH_HISTORY_KEY = 'seleno-search-history-v1';
  var SEARCH_HISTORY_MAX = 12;
  var searchHistory = loadSearchHistory();

  function nativeSearchStorage() {
    return !!(window.LunarApp &&
      typeof window.LunarApp.loadSearchHistory === 'function' &&
      typeof window.LunarApp.saveSearchHistory === 'function');
  }

  function loadSearchHistory() {
    try {
      var raw = null;
      if (nativeSearchStorage()) {
        try { raw = window.LunarApp.loadSearchHistory(); } catch (e) { raw = null; }
      }
      if (raw == null) raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      var parsed = JSON.parse(raw || '[]');
      if (!Array.isArray(parsed)) return [];
      var out = [];
      parsed.forEach(function (id) {
        if (BY_ID[id] && out.indexOf(id) < 0) out.push(id);
      });
      return out.slice(0, SEARCH_HISTORY_MAX);
    } catch (e) { return []; }
  }
  function saveSearchHistory() {
    var json = JSON.stringify(searchHistory);
    if (nativeSearchStorage()) {
      try { window.LunarApp.saveSearchHistory(json); return; } catch (e) {}
    }
    try { localStorage.setItem(SEARCH_HISTORY_KEY, json); } catch (e) {}
  }
  function rememberSearch(f) {
    if (!f) return;
    searchHistory = [f.id].concat(searchHistory.filter(function (id) { return id !== f.id; })).slice(0, SEARCH_HISTORY_MAX);
    saveSearchHistory();
  }
  function clearSearchHistory() {
    searchHistory = [];
    saveSearchHistory();
    showSearchHistory();
  }

  function searchScore(f, q, typeHint) {
    var best = 99;
    var names = [f.name, f.nameEn, f.altName].concat(f.aliases || []);
    for (var i = 0; i < names.length; i++) {
      var n = lower(names[i]);
      if (!n) continue;
      if (n === q) best = Math.min(best, 0);
      else if (n.indexOf(q) === 0) best = Math.min(best, 1);
      else if (n.indexOf(q) >= 0) best = Math.min(best, 2);
    }
    if (best === 99 && q.length >= 2 && lower(f.origin).indexOf(q) >= 0) best = 3;
    if (best === 99 && typeHint && f._g === typeHint) best = 4;
    if (best === 99) return null;
    // “嫦娥 / 阿波罗 / 月船”等既是地名也是任务名：任务点优先
    if (f.type === 'landing' && /^(嫦娥|阿波罗|月球|月船|探测|着陆|apollo|luna|change|surveyor|ranger|slim|lcross)/.test(q)) best -= 3;
    return best - (f.featured ? 0.35 : 0) - (f.priority || 0) * 0.001;
  }

  function typeHintFor(q) {
    if (q === '月海' || q === '海' || q === 'mare' || q === 'maria' || q === 'sea' || q === 'seas') return 'water';
    if (q === '环形山' || q === '陨石坑' || q === '坑' || q === 'crater' || q === 'craters') return 'crater';
    if (q === '山脉' || q === '山' || q === 'montes' || q === 'mountain' || q === 'mountains') return 'mountain';
    if (q === '月谷' || q === '月溪' || q === '断崖' || q === '谷' || q === 'rille' || q === 'rilles' || q === 'valley' || q === 'valleys') return 'tectonic';
    if (q === '着陆点' || q === '探测器' || q === 'landing' || q === 'landings' || q === 'site' || q === 'sites' || q === '探月') return 'landing';
    return null;
  }

  function runSearch(q) {
    q = lower(q.trim());
    if (!q) { showSearchHistory(); return; }
    var hint = typeHintFor(q);
    var out = [];
    for (var i = 0; i < FEATURES.length; i++) {
      var f = FEATURES[i];
      var s = searchScore(f, q, hint);
      if (s != null) out.push({ f: f, s: s });
    }
    out.sort(function (a, b) { return a.s - b.s || (b.f.priority || 0) - (a.f.priority || 0); });
    searchItems = out.slice(0, 14).map(function (x) { return x.f; });
    searchActive = searchItems.length ? 0 : -1;
    renderSearchResults(q);
  }

  function showSearchHistory() {
    if (!searchResults) return;
    if (!searchHistory.length) { hideSearch(); return; }
    searchOpen = true;
    searchResults.hidden = false;
    searchItems = [];
    searchActive = -1;
    var html = '<div class="search-section"><span>' + tr('最近搜索', 'RECENT SEARCHES') +
      ' · ' + searchHistory.length + '</span><button class="history-clear" type="button">' +
      tr('清除', 'Clear') + '</button></div>';
    searchHistory.forEach(function (id) {
      var f = BY_ID[id];
      if (!f) return;
      var g = groupMeta(f);
      var secondary = secondaryName(f);
      html += '<div class="result" data-history-id="' + esc(f.id) + '">' +
        '<i class="r-dot" style="--c:' + g.color + '"></i>' +
        '<div class="r-main"><div class="r-name">' + esc(nameOf(f)) + '</div>' +
        (secondary ? '<div class="r-en">' + esc(secondary) + '</div>' : '') + '</div>' +
        '<span class="r-type">' + esc(typeName(f)) + '</span>' +
        '<span class="r-coord">' + Math.abs(f.lat).toFixed(1) + '°' + (f.lat >= 0 ? 'N' : 'S') + ' ' +
          Math.abs(f.lon).toFixed(1) + '°' + (f.lon >= 0 ? 'E' : 'W') + '</span>' +
        '</div>';
    });
    searchResults.innerHTML = html;
  }

  function highlight(text, q) {
    var safe = esc(text);
    if (!q) return safe;
    try {
      var rx = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      return safe.replace(rx, '<mark>$1</mark>');
    } catch (e) { return safe; }
  }

  function renderSearchResults(q) {
    if (!searchResults) return;
    searchOpen = true;
    searchResults.hidden = false;
    if (!searchItems.length) {
      searchResults.innerHTML = '<div class="search-empty">' + tr(
        '没有找到“<b>' + esc(q) + '</b>”。<br>试试中文名、拉丁名或任务名，例如：静海、Tycho、嫦娥五号。',
        'No results for “<b>' + esc(q) + '</b>”.<br>Try a Latin name, Chinese name or mission, e.g. Mare Imbrium, Tycho, Chang’e 5.'
      ) + '</div>';
      return;
    }
    var html = '<div class="search-section">' + tr('最佳匹配', 'BEST MATCHES') + ' · ' + searchItems.length + tr(' 条', ' results') + '</div>';
    searchItems.forEach(function (f, idx) {
      var g = groupMeta(f);
      var secondary = secondaryName(f);
      html += '<div class="result' + (idx === searchActive ? ' active' : '') + '" data-id="' + esc(f.id) + '" role="option" aria-selected="' + (idx === searchActive) + '">' +
        '<i class="r-dot" style="--c:' + g.color + '"></i>' +
        '<div class="r-main"><div class="r-name">' + highlight(nameOf(f), q) + '</div>' +
        (secondary ? '<div class="r-en">' + highlight(secondary, q) + '</div>' : '') + '</div>' +
        '<span class="r-type">' + esc(typeName(f)) + '</span>' +
        '<span class="r-coord">' + Math.abs(f.lat).toFixed(1) + '°' + (f.lat >= 0 ? 'N' : 'S') + ' ' +
          Math.abs(f.lon).toFixed(1) + '°' + (f.lon >= 0 ? 'E' : 'W') + '</span>' +
        '</div>';
    });
    searchResults.innerHTML = html;
  }

  function hideSearch() {
    if (!searchResults) return;
    searchOpen = false;
    searchResults.hidden = true;
    searchItems = [];
    searchActive = -1;
  }

  function chooseFeature(f) {
    if (!f) return;
    rememberSearch(f);
    searchInput.value = nameOf(f);
    hideSearch();
    searchInput.blur();
    selectFeature(f.id, { fly: true, fromSearch: true });
  }

  function openSearch() {
    searchInput.focus();
    searchInput.select();
    searchKbd.style.opacity = '0';
    if (searchInput.value.trim()) runSearch(searchInput.value);
    else showSearchHistory();
  }

  function chooseSearch(index) {
    if (index < 0 || index >= searchItems.length) return;
    chooseFeature(searchItems[index]);
  }

  /* ---------------------------------------------------------------------
     选中 / 详情
     --------------------------------------------------------------------- */
  function selectFeature(id, opts) {
    opts = opts || {};
    var f = BY_ID[id];
    if (!f) return;
    if (!state.layers[f._g]) {
      state.layers[f._g] = true;
      var chip = chipsEl.querySelector('.chip[data-group="' + f._g + '"]');
      if (chip) chip.classList.add('on');
      renderList();
    }
    var prev = state.selectedId ? BY_ID[state.selectedId] : null;
    if (prev) {
      var pel = labelEls[prev.id];
      if (pel) pel.classList.remove('sel');
    }
    state.selectedId = id;
    state.lastInteract = now();
    var el = getLabelEl(f);
    el.classList.add('sel');
    updateListSelection();
    renderDetail(f);
    setMarker(f);
    var infoPanel = $('infoPanel');
    if (isMobile()) {
      $('leftPanel').classList.remove('open');
      infoPanel.classList.add('open');
    }
    if (opts.fly !== false) {
      var r = viewRadiusFor(f);
      flyTo(f.lat, f.lon, r, 1100);
    }
  }

  function clearSelection() {
    if (state.selectedId) {
      var el = labelEls[state.selectedId];
      if (el) el.classList.remove('sel');
    }
    state.selectedId = null;
    hideMarker();
    updateListSelection();
    renderOverview();
    $('infoPanel').classList.remove('open');
  }

  function viewRadiusFor(f) {
    var d = f._diameter || 0;
    if (f.type === 'landing') return 2.00;
    if (f.type === 'mare' || f.type === 'water' || f.type === 'basin' || f.type === 'montes') return 2.55;
    if (f.type === 'lake' || f.type === 'mons') return 2.10;
    if (d >= 250) return 2.25;
    if (d >= 120) return 2.05;
    if (d >= 60) return 1.92;
    if (d >= 30) return 1.82;
    return 1.72;
  }

  function renderDetail(f) {
    var g = groupMeta(f);
    var m = f._meta;
    var color = m.color;
    var eyebrow = document.querySelector('.info-top .eyebrow');
    if (eyebrow) eyebrow.textContent = 'FEATURE';
    var facts = [];
    var d = f._diameter;
    if (d != null) {
      var linear = (f.type === 'montes' || f.type === 'rupes' || f.type === 'rille' ||
                    f.type === 'valley' || f.type === 'dorsum' || f.type === 'catena');
      facts.push([linear ? tr('延伸规模', 'Extent') : tr('直径', 'Diameter'), fmtNum(d) + ' ' + '<small>km</small>']);
    }
    if (typeof f.elevation === 'number' && isFinite(f.elevation) && f.elevation > 0) {
      facts.push([tr('高程', 'Elevation'), fmtNum(f.elevation, 1) + ' <small>km</small>']);
    }
    if (f.type === 'landing') {
      if (f.country) facts.push([tr('国家 / 机构', 'Country / agency'), esc(isEN() ? countryEn(f.country) : f.country)]);
      if (f.year) facts.push([tr('年份', 'Year'), String(f.year)]);
      if (f.kind) facts.push([tr('任务类型', 'Mission type'), esc(isEN() ? kindEn(f.kind) : f.kind)]);
    } else {
      facts.push([tr('类别', 'Category'), esc(typeName(f))]);
    }
    facts.push([tr('所在半球', 'Hemisphere'), esc(shortSide(f))]);
    var factsHtml = facts.map(function (x) {
      return '<div class="detail-fact"><div class="k">' + esc(x[0]) + '</div><div class="v">' + x[1] + '</div></div>';
    }).join('');

    var note = makeNote(f);
    var origin = f.origin ? esc(f.origin) : tr('暂无命名说明。', 'No naming note available.');
    var alt = f.altName ? '<div class="detail-alt">' + tr('又译：', 'Also known as: ') + esc(f.altName) + '</div>' : '';
    var originLabel = f.type === 'landing'
      ? tr('任务摘要', 'Mission summary (Chinese source)')
      : tr('命名 / 说明', 'Naming / notes (Chinese source)');
    var enDesc = isEN() ? (TYPE_DESC_EN[f.type] || '') : '';
    var detailSource = isEN()
      ? (d != null ? 'D = ' + fmtNum(d) + ' km. ' : 'Coordinates are task-reported values. ') +
        'Names and coordinates compiled from the Chang’e-2 lunar map and the IAU Gazetteer of Planetary Nomenclature; mean lunar radius 1,737.4 km.'
      : (d != null ? 'D = ' + fmtNum(d) + ' km。' : '坐标为任务公布值。') +
        '地名坐标整理自嫦娥二号月球地图与 IAU 行星地名数据库，半径按 1,737.4 km 计。';
    infoBody.innerHTML =
      '<div class="detail">' +
        '<div class="detail-head">' +
          '<div class="type-badge" style="--c:' + color + '"><i></i>' + esc(typeName(f)) + '</div>' +
          '<h2 class="detail-name">' + esc(nameOf(f)) + '</h2>' +
          '<div class="detail-en">' + esc(secondaryName(f) || '') + '</div>' + alt +
        '</div>' +
        '<div class="detail-coord">' +
          '<div><div class="dc-main">' + fmtCoord(f) + '</div>' +
          '<div class="dc-sub">EAST-POSITIVE · IAU 2000</div></div>' +
          '<span class="side-tag">' + esc(sideOf(f)) + '</span>' +
        '</div>' +
        '<div class="detail-facts">' + factsHtml + '</div>' +
        (enDesc ? '<div class="section-label">' + tr('概述', 'OVERVIEW') + '</div><div class="detail-origin" style="margin-bottom:13px">' + esc(enDesc) + '</div>' : '') +
        '<div class="section-label">' + originLabel + '</div>' +
        '<div class="detail-origin">' + origin + '</div>' +
        (note ? '<div class="note">' + esc(note) + '</div>' : '') +
        '<div class="detail-actions">' +
          '<button class="primary-btn" data-action="fly" type="button">' + tr('定位到此处', 'Locate') + '</button>' +
          '<button class="ghost-btn" data-action="copy" type="button">' + tr('复制坐标', 'Copy coordinates') + '</button>' +
          '<a class="ghost-btn" href="' + ce2Url(f) + '" target="_blank" rel="noopener">' + tr('嫦娥二号地图 ↗', 'Chang’e-2 map ↗') + '</a>' +
        '</div>' +
        '<div class="detail-source">' + detailSource + '</div>' +
      '</div>';
    infoClose.hidden = false;
  }

  function copyCoord(f) {
    var text = nameOf(f) + ' / ' + (isEN() ? f.name : (f.nameEn || '')) + '  ' + fmtCoord(f).replace(/\s+/g, ' ') +
      '  https://ce2.greensea.org/#/@' + f.lat.toFixed(6) + ',' + f.lon.toFixed(6) + ',4z,lowlat';
    copyText(text);
  }
  function copyText(text) {
    var done = function () { showToast(tr('已复制坐标', 'Coordinates copied')); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else fallbackCopy(text, done);
  }
  function fallbackCopy(text, cb) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta); cb();
    } catch (e) { showToast(tr('复制失败，请手动选择坐标', 'Copy failed — please select the coordinates manually')); }
  }

  var toastTimer = 0;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 1900);
  }

  /* ---------------------------------------------------------------------
     飞行 / 视角
     --------------------------------------------------------------------- */
  function flyTo(lat, lon, radius, duration) {
    duration = duration == null ? 1100 : duration;
    lat = clamp(lat, -88, 88);
    lon = ((lon + 540) % 360) - 180;
    var startLon = state.camLon;
    var endLon = startLon + ((((lon - startLon) + 540) % 360) - 180);
    state.flying = {
      t0: now(), duration: Math.max(1, duration),
      from: { lat: state.camLat, lon: startLon, r: state.camRadius },
      to: { lat: lat, lon: endLon, r: radius == null ? state.targetRadius : clamp(radius, 1.12, 6.6) }
    };
    state.targetRadius = state.flying.to.r;
    state.inertiaLon = state.inertiaLat = 0;
    state.lastInteract = now();
  }

  function stopFly() {
    if (!state.flying) return;
    state.flying = null;
  }

  function setView(lat, lon, radius, duration) {
    flyTo(lat, lon, radius, duration == null ? 950 : duration);
  }

  var activeViewPreset = null;
  var viewBeforePreset = null;

  function setViewPresetButton(name) {
    document.querySelectorAll('.view-btn').forEach(function (b) {
      b.classList.toggle('on', b.dataset.view === name);
    });
  }

  function clearViewPresetState() {
    activeViewPreset = null;
    viewBeforePreset = null;
    setViewPresetButton(null);
  }

  function viewPreset(name, force) {
    var buttons = document.querySelectorAll('.view-btn');
    if (!force && activeViewPreset === name) {
      var restore = viewBeforePreset;
      activeViewPreset = null;
      viewBeforePreset = null;
      buttons.forEach(function (b) { b.classList.remove('on'); });
      clearSelection();
      if (restore) flyTo(restore.lat, restore.lon, restore.r, 850);
      return;
    }
    if (!activeViewPreset) {
      viewBeforePreset = { lat: state.camLat, lon: state.camLon, r: state.camRadius };
    }
    activeViewPreset = name;
    setViewPresetButton(name);
    clearSelection();
    var r = homeRadius();
    if (name === 'near') flyTo(5, 4, r, 950);
    else if (name === 'far') flyTo(0, 180, r, 950);
    else if (name === 'north') flyTo(87, 0, r * 0.94, 950);
    else if (name === 'south') flyTo(-87, 0, r * 0.94, 950);
  }

  function homeRadius() {
    var w = window.innerWidth, h = window.innerHeight;
    if (w <= 520) return 5.8;
    if (w <= 680) return 4.8;
    var central;
    if (w > 1180) central = (w - 356) - 326;
    else if (w > 680) central = (w - 356) - 16;
    else central = w - 32;
    var target = Math.max(330, Math.min(central - 24, h * 0.86));
    var focal = (h / 2) / Math.tan(19 * D2R);
    return clamp(Math.sqrt(1 + Math.pow(2 * focal / target, 2)), 3.30, 5.4);
  }

  function zoomBy(factor) {
    state.targetRadius = clamp(state.targetRadius * factor, 1.12, 6.6);
    state.lastInteract = now();
  }

  function randomFeature() {
    var pool = FEATURED.filter(function (f) { return f.priority >= 80; });
    if (!pool.length) pool = FEATURED;
    var f = pool[Math.floor(Math.random() * pool.length)];
    selectFeature(f.id, { fly: true });
  }

  /* ---------------------------------------------------------------------
     Three.js 场景
     --------------------------------------------------------------------- */
  var renderer, scene, camera, moonGroup, moonMesh, pickSphere, gridMesh, marker;
  var keyLight, fillLight, rimLight, ambient;
  var colorTex = null, bumpTex = null, miniSource = null;
  var starTex = null;
  var raycaster = null, pointerNDC = null;
  var sunDir = { x: 1, y: 0, z: 0 };
  var sunDirVec;
  var lastFrame = 0;
  var labelEls = {};
  var labelSizes = {};
  var visibleLabelIds = {};
  var frameCount = 0;
  var lastMini = 0;
  var lastCoordPing = 0;
  var loading = { color: false, bump: false, finished: false };
  var miniCanvas, miniCtx;
  var pickVec, projVec, camDirVec, rightVec, upVec;

  function initThree() {
    var canvas = $('webgl');
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas, antialias: true, alpha: true,
        powerPreference: 'high-performance'
      });
    } catch (err) {
      showFatal('WebGL 初始化失败：' + (err && err.message ? err.message : err));
      return false;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.005, 400);
    scene.add(camera);

    moonGroup = new THREE.Group();
    scene.add(moonGroup);

    var segX = window.innerWidth < 760 ? 256 : 480;
    var segY = window.innerWidth < 760 ? 128 : 240;
    var geo = new THREE.SphereGeometry(1, segX, segY);
    var mat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.99, metalness: 0.0,
      bumpScale: 0.0016, displacementScale: 0.0095, displacementBias: -0.00475
    });
    moonMesh = new THREE.Mesh(geo, mat);
    moonMesh.rotation.y = 0;
    moonGroup.add(moonMesh);

    var pickGeo = new THREE.SphereGeometry(1, 64, 32);
    pickSphere = new THREE.Mesh(pickGeo, new THREE.MeshBasicMaterial({ visible: false }));
    moonGroup.add(pickSphere);

    makeStars();
    makeHalo();
    makeGrid();
    makeMarker();
    makeLights();

    raycaster = new THREE.Raycaster();
    pointerNDC = new THREE.Vector2();
    pickVec = new THREE.Vector3();
    projVec = new THREE.Vector3();
    camDirVec = new THREE.Vector3();
    rightVec = new THREE.Vector3();
    upVec = new THREE.Vector3();
    sunDirVec = new THREE.Vector3(1, 0, 0);

    miniCanvas = $('minimap');
    miniCtx = miniCanvas ? miniCanvas.getContext('2d') : null;

    updateCamera();
    return true;
  }

  function makeStars() {
    var starGeo = new THREE.BufferGeometry();
    var n = 1900;
    var positions = new Float32Array(n * 3);
    var colors = new Float32Array(n * 3);
    var palette = [
      [1.0, 1.0, 1.0], [0.82, 0.90, 1.0], [0.66, 0.80, 1.0],
      [1.0, 0.90, 0.72], [1.0, 0.78, 0.62], [0.94, 0.94, 1.0]
    ];
    for (var i = 0; i < n; i++) {
      var u = Math.random() * 2 - 1;
      var th = Math.random() * Math.PI * 2;
      var s = Math.sqrt(1 - u * u);
      var r = 45 + Math.random() * 90;
      positions[i * 3] = Math.cos(th) * s * r;
      positions[i * 3 + 1] = u * r;
      positions[i * 3 + 2] = Math.sin(th) * s * r;
      var c = palette[Math.floor(Math.random() * palette.length)];
      var v = 0.55 + Math.random() * 0.45;
      colors[i * 3] = c[0] * v; colors[i * 3 + 1] = c[1] * v; colors[i * 3 + 2] = c[2] * v;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starTex = makeGlowTexture();
    var starMat = new THREE.PointsMaterial({
      size: 1.7, sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity: 0.85, map: starTex,
      blending: THREE.AdditiveBlending, depthWrite: false, alphaTest: 0.02
    });
    var stars = new THREE.Points(starGeo, starMat);
    stars.renderOrder = -2;
    scene.add(stars);

    // 一条淡淡的银河带
    var n2 = 1400;
    var pos2 = new Float32Array(n2 * 3);
    var col2 = new Float32Array(n2 * 3);
    var q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5, 0.9, 0.2));
    for (var j = 0; j < n2; j++) {
      var a = Math.random() * Math.PI * 2;
      var off = (Math.random() + Math.random() + Math.random() - 1.5) * 0.30;
      var v2 = new THREE.Vector3(Math.cos(a), off, Math.sin(a)).normalize().multiplyScalar(70 + Math.random() * 50);
      v2.applyQuaternion(q);
      pos2[j * 3] = v2.x; pos2[j * 3 + 1] = v2.y; pos2[j * 3 + 2] = v2.z;
      var b = 0.22 + Math.random() * 0.28;
      col2[j * 3] = 0.66 * b; col2[j * 3 + 1] = 0.74 * b; col2[j * 3 + 2] = 1.0 * b;
    }
    var bandGeo = new THREE.BufferGeometry();
    bandGeo.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
    bandGeo.setAttribute('color', new THREE.BufferAttribute(col2, 3));
    var band = new THREE.Points(bandGeo, new THREE.PointsMaterial({
      size: 1.0, sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity: 0.55, map: starTex,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    band.renderOrder = -3;
    scene.add(band);
  }

  function makeGlowTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.22, 'rgba(255,255,255,.92)');
    g.addColorStop(0.5, 'rgba(255,255,255,.30)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    var t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  function makeHalo() {
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), color: 0x9cbbea, transparent: true,
      opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    sprite.scale.set(3.15, 3.15, 1);
    sprite.renderOrder = -1;
    scene.add(sprite);
  }

  function makeGrid() {
    var verts = [];
    var lat, lon, i;
    for (lat = -60; lat <= 60; lat += 30) {
      for (i = 0; i < 180; i++) {
        var l1 = -180 + i * 2, l2 = -180 + (i + 1) * 2;
        var a = sph(lat, l1), b = sph(lat, l2);
        verts.push(a.x * 1.013, a.y * 1.013, a.z * 1.013, b.x * 1.013, b.y * 1.013, b.z * 1.013);
      }
    }
    for (lon = -180; lon < 180; lon += 30) {
      for (i = 0; i < 90; i++) {
        var t1 = -90 + i * 2, t2 = -90 + (i + 1) * 2;
        var p = sph(t1, lon), q = sph(t2, lon);
        verts.push(p.x * 1.013, p.y * 1.013, p.z * 1.013, q.x * 1.013, q.y * 1.013, q.z * 1.013);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    gridMesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({
      color: 0x9ec8f0, transparent: true, opacity: 0.32, depthWrite: false
    }));
    gridMesh.visible = false;
    gridMesh.renderOrder = 2;
    moonGroup.add(gridMesh);
  }

  function makeMarker() {
    marker = new THREE.Group();
    var ring = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 1.0, 48),
      new THREE.MeshBasicMaterial({ color: 0xe6c082, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false })
    );
    var dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.20, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff3d4, transparent: true, opacity: 0.95, depthWrite: false })
    );
    marker.add(ring); marker.add(dot);
    marker.userData.ring = ring;
    marker.visible = false;
    marker.renderOrder = 3;
    moonGroup.add(marker);
  }

  function makeLights() {
    ambient = new THREE.AmbientLight(0x8fa3c4, 0.34);
    scene.add(ambient);
    keyLight = new THREE.DirectionalLight(0xfff1d6, 1.28);
    scene.add(keyLight);
    fillLight = new THREE.DirectionalLight(0x7796d6, 0.30);
    scene.add(fillLight);
    rimLight = new THREE.DirectionalLight(0xa8c8ff, 0.25);
    scene.add(rimLight);
  }

  function loadTextures() {
    var loader = new THREE.TextureLoader();
    setLoading(18, tr('正在准备三维月球…', 'Preparing the lunar globe…'));
    loader.load(TEX_COLOR, function (t) {
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      colorTex = t;
      moonMesh.material.map = t;
      moonMesh.material.needsUpdate = true;
      makeMiniSource(t.image);
      loading.color = true;
      setLoading(58, tr('正在加载月面影像…', 'Loading lunar imagery…'));
      maybeFinish();
    }, undefined, function (e) {
      showFatal(tr('月面彩色纹理加载失败。', 'Failed to load the lunar color texture.'));
    });

    loader.load(TEX_BUMP, function (t) {
      t.encoding = THREE.LinearEncoding;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      bumpTex = t;
      moonMesh.material.bumpMap = t;
      moonMesh.material.displacementMap = t;
      moonMesh.material.needsUpdate = true;
      loading.bump = true;
      setLoading(84, tr('正在构建月面高程…', 'Building lunar elevation…'));
      maybeFinish();
    }, undefined, function () {
      // 高程纹理失败不致命，保留彩色底图
      loading.bump = true;
      setLoading(84, '高程纹理不可用，继续加载…');
      maybeFinish();
    });
  }

  function makeMiniSource(img) {
    if (!img) return;
    try {
      var c = document.createElement('canvas');
      c.width = 1024; c.height = 512;
      var ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 1024, 512);
      miniSource = c;
    } catch (e) { miniSource = null; }
  }

  function maybeFinish() {
    if (loading.finished || !loading.color || !loading.bump) return;
    loading.finished = true;
    setLoading(100, '就绪');
    state.ready = true;
    // 先渲染一帧再淡出加载层
    requestAnimationFrame(function () {
      renderer.render(scene, camera);
      setTimeout(function () {
        $('loader').classList.add('done');
        if (window.__LUNAR__) window.__LUNAR__.ready = true;
        window.__READY__ = true;
        setTimeout(function () { if (coachEl) coachEl.classList.add('hide'); }, 9000);
      }, 420);
    });
  }

  function setLoading(pct, text) {
    var bar = $('loaderBar'), st = $('loaderStatus');
    if (bar) bar.style.width = pct + '%';
    if (st && text) st.textContent = text;
  }

  function showFatal(msg) {
    var f = $('fatal'), m = $('fatalMsg');
    if (m && msg) m.textContent = msg;
    if (f) f.hidden = false;
    var l = $('loader');
    if (l) l.classList.add('done');
  }

  /* ---------------------------------------------------------------------
     相机 / 光照
     --------------------------------------------------------------------- */
  function updateCamera() {
    var lat = state.camLat * D2R;
    var lon = state.camLon * D2R;
    var cl = Math.cos(lat);
    var pos = {
      x: cl * Math.cos(lon), y: Math.sin(lat), z: -cl * Math.sin(lon)
    };
    camera.position.set(pos.x * state.camRadius, pos.y * state.camRadius, pos.z * state.camRadius);
    camera.up.set(-Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon)).normalize();
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camDirVec.set(pos.x, pos.y, pos.z).normalize();
  }

  function updateLights() {
    if (!keyLight) return;
    if (state.lightMode === 'sun') {
      var sl = (state.sunLon == null ? -46 : state.sunLon) * D2R;
      var sb = (state.sunLat == null ? 16 : state.sunLat) * D2R;
      var cb = Math.cos(sb);
      sunDir = { x: cb * Math.cos(sl), y: Math.sin(sb), z: -cb * Math.sin(sl) };
      sunDirVec.set(sunDir.x, sunDir.y, sunDir.z);
      keyLight.position.copy(sunDirVec).multiplyScalar(10);
      keyLight.intensity = 1.55;
      ambient.intensity = 0.11;
      fillLight.intensity = 0.16;
      fillLight.position.set(-sunDirVec.x * 8, -sunDirVec.y * 8, -sunDirVec.z * 8);
      rimLight.intensity = 0.12;
      rimLight.position.set(-sunDirVec.x * 6, 3, -sunDirVec.z * 6);
      renderer.toneMappingExposure = 1.02;
    } else {
      rightVec.setFromMatrixColumn(camera.matrixWorld, 0);
      upVec.setFromMatrixColumn(camera.matrixWorld, 1);
      var d = camDirVec.clone().addScaledVector(rightVec, 0.34).addScaledVector(upVec, 0.44).normalize();
      sunDirVec.copy(d);
      sunDir = { x: d.x, y: d.y, z: d.z };
      keyLight.position.copy(d).multiplyScalar(10);
      keyLight.intensity = 1.25;
      ambient.intensity = 0.36;
      fillLight.intensity = 0.30;
      fillLight.position.copy(d).multiplyScalar(-8).add(new THREE.Vector3(0, 4, 0));
      rimLight.intensity = 0.32;
      rimLight.position.set(-d.x * 7, 2, -d.z * 7);
      renderer.toneMappingExposure = 1.10;
    }
  }

  /* ---------------------------------------------------------------------
     地名标签
     --------------------------------------------------------------------- */
  function getLabelEl(f) {
    if (labelEls[f.id]) return labelEls[f.id];
    var el = document.createElement('div');
    var primary = nameOf(f);
    var secondary = secondaryName(f);
    var major = !!f._displayEn;
    var showSecondary = major && lower(primary) !== lower(secondary);
    el.className = 'lbl ' + (major ? 'major' : 'minor') + (f._g === 'landing' ? ' landing' : '');
    el.dataset.id = f.id;
    el.style.setProperty('--c', f._meta.color);
    el.innerHTML = '<i class="dot"></i><span class="txt"><span class="zh">' + esc(primary) + '</span>' +
      (showSecondary ? '<span class="en">' + esc(secondary || '') + '</span>' : '') + '</span>';
    el.title = primary + (secondary ? '  ·  ' + secondary : '') + '  ·  ' + fmtCoord(f);
    el.addEventListener('click', function (ev) {
      ev.stopPropagation();
      selectFeature(f.id, { fly: true });
    });
    el.addEventListener('pointerenter', function () { state.hoverId = f.id; el.style.zIndex = 10; });
    el.addEventListener('pointerleave', function () { state.hoverId = null; el.style.zIndex = ''; });
    labelsEl.appendChild(el);
    labelEls[f.id] = el;
    // 首次创建后量一次尺寸，用于标签避让
    labelSizes[f.id] = { w: el.offsetWidth || 80, h: el.offsetHeight || 22 };
    el.style.display = 'none';
    return el;
  }

  function hideLabel(id) {
    var el = labelEls[id];
    if (el) { el.style.opacity = '0'; el.style.display = 'none'; }
  }

  function gateFeature(f, r, camLonLatDir) {
    if (state.selectedId === f.id) return true;
    if (!state.layers[f._g]) return false;
    var farSide = Math.abs(state.camLon) > 90;
    if (f.featured) {
      var minP;
      if (r > 3.05) minP = farSide ? 82 : 88;
      else if (r > 2.72) minP = farSide ? 70 : 80;
      else if (r > 2.26) minP = farSide ? 58 : 68;
      else if (r > 1.86) minP = farSide ? 44 : 52;
      else minP = 32;
      return (f.priority || 0) >= minP;
    }
    if (f.type === 'crater') {
      if (r > 2.9) return false;
      var minD = 16 + 96 * Math.pow(clamp((r - 1.18) / 1.72, 0, 1), 2);
      if ((f._diameter || 0) < minD) return false;
      var ang = angleBetween(f._p, camLonLatDir);
      return ang <= (r < 1.65 ? 52 : 64);
    }
    if (f._g === 'tectonic' || f._g === 'mountain') {
      if (r > 1.84) return false;
      if ((f._diameter || 0) < 36) return false;
      return angleBetween(f._p, camLonLatDir) <= 48;
    }
    return false;
  }

  function labelRectFor(f, x, y, w, h, safeL, safeR) {
    // 以点 (x,y) 为行首，文字在右侧；靠近右侧安全边界时向左展开
    var gap = 8;
    var flip = x + w + gap > safeR;
    var rect = flip
      ? { x: x - w - gap, y: y - h / 2, w: w + gap, h: h, flip: true }
      : { x: x - 2, y: y - h / 2, w: w + gap, h: h, flip: false };
    return rect;
  }

  function updateLabels() {
    if (!state.ready) return;
    var r = state.camRadius;
    var invR = 1 / r;
    var W = window.innerWidth, H = window.innerHeight;
    var wide = W > 1180;
    var safeL = wide ? 326 : 16;
    var safeR = wide ? (W - 356) : (W > 680 ? W - 356 : W - 16);
    var safeT = 84;
    var safeB = H - 14;
    var dockEl = $('dock');
    var dockRect = (dockEl && dockEl.offsetParent !== null) ? dockEl.getBoundingClientRect() : null;
    var cands = [];
    var selectedId = state.selectedId;

    for (var i = 0; i < FEATURES.length; i++) {
      var f = FEATURES[i];
      if (!state.layers[f._g] && f.id !== selectedId) continue;
      var d = dot(f._p, camDirVec);
      if (d <= invR + 0.002) continue;
      if (!gateFeature(f, r, camDirVec)) continue;
      // 屏幕投影
      projVec.set(f._p.x, f._p.y, f._p.z).multiplyScalar(1.006).project(camera);
      if (projVec.z < -1 || projVec.z > 1) continue;
      var x = (projVec.x * 0.5 + 0.5) * W;
      var y = (-projVec.y * 0.5 + 0.5) * H;
      if (x < safeL || x > safeR || y < safeT || y > safeB) continue;
      var limb = clamp((d - invR) / 0.20, 0, 1);
      var score = (f.priority || 0) * 12 + limb * 55 + (f.featured ? 700 : 0) + (f._g === 'landing' ? 50 : 0);
      if (f.id === selectedId) score += 100000;
      cands.push({ f: f, x: x, y: y, limb: limb, score: score });
    }

    cands.sort(function (a, b) { return b.score - a.score; });
    var occupied = [];
    var visible = {};
    var count = 0;
    var maxLabels = r < 1.7 ? 150 : 115;
    for (var k = 0; k < cands.length && count < maxLabels; k++) {
      var c = cands[k];
      var f = c.f;
      var el = getLabelEl(f);
      var sz = labelSizes[f.id] || { w: 80, h: 22 };
      var rect = labelRectFor(f, c.x, c.y, sz.w, sz.h, safeL, safeR);
      var sel = f.id === selectedId;
      if (!sel) {
        if (rect.x < safeL || rect.x + rect.w > safeR || rect.y < safeT || rect.y + rect.h > safeB) {
          if (el.style.display !== 'none') { el.style.display = 'none'; el.style.opacity = '0'; }
          continue;
        }
        if (dockRect && rect.x < dockRect.right + 8 && rect.x + rect.w > dockRect.left - 8 &&
            rect.y < dockRect.bottom + 4 && rect.y + rect.h > dockRect.top - 4) {
          if (el.style.display !== 'none') { el.style.display = 'none'; el.style.opacity = '0'; }
          continue;
        }
        var hit = false;
        for (var m = 0; m < occupied.length; m++) {
          var o = occupied[m];
          if (rect.x < o.x + o.w + 2 && rect.x + rect.w + 2 > o.x &&
              rect.y < o.y + o.h + 1 && rect.y + rect.h + 1 > o.y) { hit = true; break; }
        }
        if (hit) { if (el.style.display !== 'none') { el.style.display = 'none'; el.style.opacity = '0'; } continue; }
      }
      occupied.push(rect);
      visible[f.id] = true;
      count++;
      var op = sel ? 1 : (0.52 + 0.48 * c.limb);
      if (state.lightMode === 'sun' && !sel) {
        var lit = Math.max(0, dot(f._p, sunDirVec));
        op *= 0.58 + 0.42 * lit;
      }
      var tx = c.x;
      if (rect.flip) {
        el.classList.add('flip');
        el.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px,0) translateY(-50%) translateX(-100%)';
      } else {
        el.classList.remove('flip');
        el.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px,0) translateY(-50%)';
      }
      if (el.style.display !== 'flex') el.style.display = 'flex';
      el.style.opacity = Math.max(0.15, op).toFixed(3);
      el.style.pointerEvents = 'auto';
    }
    // 隐藏上一帧仍在但本帧未入选的标签
    for (var id in visibleLabelIds) {
      if (!visible[id]) {
        var old = labelEls[id];
        if (old && old.style.display !== 'none') { old.style.display = 'none'; old.style.opacity = '0'; }
      }
    }
    visibleLabelIds = visible;
    state.labelCount = count;
  }

  function setMarker(f) {
    if (!marker || !f) return;
    var p = f._p;
    marker.position.set(p.x * 1.009, p.y * 1.009, p.z * 1.009);
    var n = new THREE.Vector3(p.x, p.y, p.z);
    var q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    marker.quaternion.copy(q);
    marker.visible = true;
    marker.userData.ring.material.color.set(metaFor(f).color);
    marker.userData.ring.material.opacity = 0.95;
  }
  function hideMarker() {
    if (marker) marker.visible = false;
  }

  /* ---------------------------------------------------------------------
     动画循环
     --------------------------------------------------------------------- */
  function animate(ts) {
    requestAnimationFrame(animate);
    if (!renderer) return;
    var t = ts || now();
    var dt = lastFrame ? Math.min(0.05, (t - lastFrame) / 1000) : 0.016;
    lastFrame = t;
    frameCount++;

    if (state.flying) {
      var fly = state.flying;
      var k = clamp((t - fly.t0) / fly.duration, 0, 1);
      var e = easeInOut(k);
      state.camLat = lerp(fly.from.lat, fly.to.lat, e);
      state.camLon = lerp(fly.from.lon, fly.to.lon, e);
      state.camRadius = lerp(fly.from.r, fly.to.r, e);
      state.targetRadius = state.camRadius;
      if (k >= 1) {
        state.flying = null;
        state.camLon = ((state.camLon + 540) % 360) - 180;
      }
    } else {
      if (state.autoRotate && !state.dragging && t - state.lastInteract > 2600) {
        state.camLon -= dt * 1.15;
        if (state.camLon < -180) state.camLon += 360;
      }
      if (Math.abs(state.inertiaLon) > 0.005 || Math.abs(state.inertiaLat) > 0.005) {
        state.camLon += state.inertiaLon * dt;
        state.camLat = clamp(state.camLat + state.inertiaLat * dt, -88, 88);
        var decay = Math.exp(-dt * 3.4);
        state.inertiaLon *= decay;
        state.inertiaLat *= decay;
      }
      state.camRadius += (state.targetRadius - state.camRadius) * (1 - Math.exp(-dt * 9));
    }

    updateCamera();
    updateLights();

    if (marker && marker.visible) {
      var pulse = 1 + 0.22 * Math.sin(t * 0.0045);
      marker.scale.setScalar(state.camRadius * 0.0072);
      marker.userData.ring.scale.set(pulse, pulse, pulse);
    }

    if (state.ready && (frameCount % 2 === 0)) updateLabels();
    if (t - lastMini > 90) { drawMini(); lastMini = t; }
    if (state.pointer.over && t - lastCoordPing > 70) { updateCoordFromPointer(); lastCoordPing = t; }
    if (state.ready && frameCount % 30 === 0) updateHash();

    renderer.render(scene, camera);
  }

  /* ---------------------------------------------------------------------
     小地图
     --------------------------------------------------------------------- */
  function drawMini() {
    if (!miniCtx) return;
    var W = miniCanvas.width, H = miniCanvas.height;
    var ctx = miniCtx;
    ctx.clearRect(0, 0, W, H);
    if (miniSource) ctx.drawImage(miniSource, 0, 0, W, H);
    else { ctx.fillStyle = '#0a111d'; ctx.fillRect(0, 0, W, H); }
    ctx.save();
    // 暗化 + 近地面强调
    ctx.fillStyle = 'rgba(3,6,12,.055)';
    ctx.fillRect(0, 0, W, H);
    var x90 = ((-90 + 180) / 360) * W, x270 = ((90 + 180) / 360) * W;
    ctx.fillStyle = 'rgba(140,180,255,.045)';
    ctx.fillRect(x90, 0, x270 - x90, H);
    ctx.strokeStyle = 'rgba(142,171,255,.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x90 + 0.5, 0.5, x270 - x90 - 1, H - 1);

    // 经纬网
    ctx.strokeStyle = 'rgba(200,218,245,.13)';
    ctx.lineWidth = 1;
    for (var lon = -180; lon <= 180; lon += 30) {
      var x = ((lon + 180) / 360) * W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (var lat = -60; lat <= 60; lat += 30) {
      var y = ((90 - lat) / 180) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(210,228,255,.28)';
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

    // 当前视野椭圆
    var normLon = ((state.camLon + 540) % 360) - 180;
    var cx = ((normLon + 180) / 360) * W;
    var cy = ((90 - state.camLat) / 180) * H;
    var fovY = camera.fov * D2R / 2;
    var aspect = camera.aspect;
    var halfX = Math.atan(Math.tan(fovY) * aspect) * R2D;
    var halfY = camera.fov / 2;
    var rx = (halfX / 360) * W / Math.max(0.38, Math.cos(state.camLat * D2R));
    var ry = (halfY / 180) * H;
    rx = Math.min(rx, W / 2);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(230,192,130,.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,192,130,.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 中心十字
    ctx.strokeStyle = 'rgba(240,215,170,.95)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 3.2, 0, Math.PI * 2); ctx.stroke();

    // 探测点
    var landing = FEATURED.filter(function (f) { return f._g === 'landing'; });
    ctx.fillStyle = 'rgba(120,220,239,.85)';
    for (var i = 0; i < landing.length; i++) {
      var f = landing[i];
      var xx = ((f.lon + 180) / 360) * W;
      var yy = ((90 - f.lat) / 180) * H;
      ctx.beginPath(); ctx.arc(xx, yy, 1.6, 0, Math.PI * 2); ctx.fill();
    }

    // 选中点
    var sel = state.selectedId ? BY_ID[state.selectedId] : null;
    if (sel) {
      var sx = ((sel.lon + 180) / 360) * W;
      var sy = ((90 - sel.lat) / 180) * H;
      ctx.strokeStyle = '#e6c082';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#e6c082';
      ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, Math.PI * 2); ctx.fill();
    }

    // 文字
    ctx.fillStyle = 'rgba(210,225,248,.55)';
    ctx.font = '600 9px "Segoe UI","Microsoft YaHei",sans-serif';
    ctx.fillText('近地面', x90 + 5, 12);
    ctx.fillStyle = 'rgba(230,192,130,.8)';
    ctx.fillText('视野', Math.min(W - 26, cx + rx + 4), Math.max(12, cy - ry + 9));
    ctx.restore();
  }

  /* ---------------------------------------------------------------------
     指针与交互
     --------------------------------------------------------------------- */
  var dragState = null;
  var pointers = {};
  var pinchStart = 0;
  var pinchRadius = 0;

  function setupCanvasEvents() {
    var canvas = $('webgl');
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var n = Object.keys(pointers).length;
      state.lastInteract = now();
      if (n === 1) {
        dragState = { x: e.clientX, y: e.clientY, t: now(), moved: 0 };
        state.dragging = true;
        state.inertiaLon = state.inertiaLat = 0;
        stopFly();
        canvas.classList.add('dragging');
      } else if (n === 2) {
        var ids = Object.keys(pointers);
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
        pinchRadius = state.targetRadius;
      }
    });

    canvas.addEventListener('pointermove', function (e) {
      state.pointer.over = true;
      state.pointer.x = e.clientX; state.pointer.y = e.clientY;
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length >= 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchStart > 0) {
          state.targetRadius = clamp(pinchRadius * (pinchStart / Math.max(1, dist)), 1.12, 6.6);
          state.lastInteract = now();
        }
        return;
      }
      if (!dragState) return;
      var dx = e.clientX - dragState.x;
      var dy = e.clientY - dragState.y;
      dragState.moved += Math.abs(dx) + Math.abs(dy);
      dragState.x = e.clientX; dragState.y = e.clientY;
      var dt = Math.max(8, now() - dragState.t) / 1000;
      dragState.t = now();
      var speed = 0.23;
      var dLon = -dx * speed;
      var dLat = dy * speed;
      state.camLon += dLon;
      state.camLat = clamp(state.camLat + dLat, -88, 88);
      state.targetRadius = state.camRadius;
      state.inertiaLon = dLon / dt * 0.55;
      state.inertiaLat = dLat / dt * 0.55;
      state.lastInteract = now();
      if (state.camLon < -180) state.camLon += 360;
      if (state.camLon > 180) state.camLon -= 360;
    });

    function endPointer(e) {
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length === 0) {
        state.dragging = false;
        $('webgl').classList.remove('dragging');
        if (dragState && dragState.moved < 6) {
          var rect = $('webgl').getBoundingClientRect();
          var pt = pickMoon(e.clientX, e.clientY);
          if (pt) {
            var near = nearestFeature(pt.lat, pt.lon, 3.2);
            if (near) selectFeature(near.id, { fly: false });
            else showToast(tr('月面坐标  ', 'Lunar coordinates  ') + Math.abs(pt.lat).toFixed(1) + '°' + (pt.lat >= 0 ? 'N' : 'S') + '  ' +
              Math.abs(pt.lon).toFixed(1) + '°' + (pt.lon >= 0 ? 'E' : 'W'));
          }
        }
        dragState = null;
        pinchStart = 0;
      } else if (Object.keys(pointers).length === 1) {
        var id = Object.keys(pointers)[0];
        dragState = { x: pointers[id].x, y: pointers[id].y, t: now(), moved: 0 };
      }
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('pointerleave', function (e) {
      if (!state.dragging) {
        state.pointer.over = false;
        if (coordEl) coordEl.textContent = '—';
      }
    });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      stopFly();
      var delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;
      state.targetRadius = clamp(state.targetRadius * Math.exp(delta * 0.0011), 1.12, 6.6);
      state.lastInteract = now();
    }, { passive: false });
    canvas.addEventListener('dblclick', function (e) {
      var pt = pickMoon(e.clientX, e.clientY);
      if (!pt) return;
      var near = nearestFeature(pt.lat, pt.lon, 4.5);
      if (near) selectFeature(near.id, { fly: true });
      else { flyTo(pt.lat, pt.lon, Math.min(state.targetRadius, 1.8), 900); showToast('已定位到 ' + Math.abs(pt.lat).toFixed(1) + '°' + (pt.lat >= 0 ? 'N' : 'S') + '  ' + Math.abs(pt.lon).toFixed(1) + '°' + (pt.lon >= 0 ? 'E' : 'W')); }
    });
  }

  function nearestFeature(lat, lon, maxDeg) {
    var p = sph(lat, lon);
    var best = null, bestA = maxDeg;
    for (var i = 0; i < FEATURED.length; i++) {
      var f = FEATURED[i];
      if (!state.layers[f._g]) continue;
      var a = angleBetween(p, f._p);
      var lim = maxDeg;
      if (f.type === 'mare' || f.type === 'water') lim = Math.min(maxDeg * 2.2, 14);
      if (a < lim && a < bestA) { best = f; bestA = a; }
    }
    return best;
  }

  function pickMoon(clientX, clientY) {
    if (!camera || !raycaster) return null;
    var rect = $('webgl').getBoundingClientRect();
    pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    var hits = raycaster.intersectObject(pickSphere, false);
    if (!hits || !hits.length) return null;
    var p = hits[0].point.clone().normalize();
    return { lat: Math.asin(clamp(p.y, -1, 1)) * R2D, lon: Math.atan2(-p.z, p.x) * R2D };
  }

  function updateCoordFromPointer() {
    if (!coordEl) return;
    if (state.dragging) return;
    var pt = pickMoon(state.pointer.x, state.pointer.y);
    if (!pt) { coordEl.textContent = '—'; return; }
    coordEl.textContent = Math.abs(pt.lat).toFixed(1) + '°' + (pt.lat >= 0 ? 'N' : 'S') + '  ' +
      Math.abs(pt.lon).toFixed(1) + '°' + (pt.lon >= 0 ? 'E' : 'W');
  }

  /* ---------------------------------------------------------------------
     UI 事件
     --------------------------------------------------------------------- */
  function bindUI() {
    // 搜索
    searchInput.addEventListener('input', function () {
      var q = searchInput.value;
      $('searchClear').hidden = !q;
      if (!q.trim()) { showSearchHistory(); return; }
      runSearch(q);
    });
    searchInput.addEventListener('focus', function () {
      if (searchInput.value.trim()) runSearch(searchInput.value);
      else showSearchHistory();
    });
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (searchOpen && searchItems.length) {
          searchActive = (searchActive + 1) % searchItems.length;
          updateSearchActive();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (searchOpen && searchItems.length) {
          searchActive = (searchActive - 1 + searchItems.length) % searchItems.length;
          updateSearchActive();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchOpen) chooseSearch(searchActive >= 0 ? searchActive : 0);
      } else if (e.key === 'Escape') {
        hideSearch(); searchInput.blur();
      }
    });
    searchResults.addEventListener('click', function (e) {
      var clear = e.target.closest('.history-clear');
      if (clear) { e.stopPropagation(); clearSearchHistory(); return; }
      var historyItem = e.target.closest('[data-history-id]');
      if (historyItem) {
        chooseFeature(BY_ID[historyItem.dataset.historyId]);
        return;
      }
      var item = e.target.closest('.result');
      if (!item) return;
      var idx = searchItems.findIndex(function (f) { return f.id === item.dataset.id; });
      if (idx >= 0) chooseSearch(idx);
    });
    searchResults.addEventListener('mousemove', function (e) {
      var item = e.target.closest('.result');
      if (!item || item.dataset.historyId) return;
      var idx = searchItems.findIndex(function (f) { return f.id === item.dataset.id; });
      if (idx >= 0 && idx !== searchActive) { searchActive = idx; updateSearchActive(); }
    });
    $('searchClear').addEventListener('click', function () {
      searchInput.value = '';
      $('searchClear').hidden = true;
      showSearchHistory();
      searchInput.focus();
    });
    document.addEventListener('pointerdown', function (e) {
      if (!searchWrap.contains(e.target)) hideSearch();
    });

    // 图层列表
    listEl.addEventListener('click', function (e) {
      var item = e.target.closest('.feat-item');
      if (!item) return;
      selectFeature(item.dataset.id, { fly: true });
    });

    // 详情按钮
    infoBody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.dataset.action;
      if (action === 'fly' && state.selectedId) {
        var f = BY_ID[state.selectedId];
        flyTo(f.lat, f.lon, viewRadiusFor(f), 900);
      } else if (action === 'copy' && state.selectedId) {
        copyCoord(BY_ID[state.selectedId]);
      } else if (action === 'random') {
        randomFeature();
      } else if (action === 'home') {
        clearSelection();
        viewPreset('near', true);
      }
    });
    infoClose.addEventListener('click', clearSelection);

    // 顶栏
    $('btnHelp').addEventListener('click', function () { $('modal').classList.add('open'); });
    $('modalClose').addEventListener('click', closeModal);
    $('modalOk').addEventListener('click', closeModal);
    $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) closeModal(); });
    $('btnFullscreen').addEventListener('click', function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen && document.exitFullscreen();
      }
    });
    $('btnLayers').addEventListener('click', function () { $('leftPanel').classList.toggle('open'); });
    $('btnLang').addEventListener('click', function () {
      LANG = LANG === 'en' ? 'zh' : 'en';
      try { localStorage.setItem('seleno-lang', LANG); } catch (e) {}
      applyLanguage();
    });
    $('btnRandom').addEventListener('click', randomFeature);
    document.addEventListener('pointerdown', function (e) {
      var lp = $('leftPanel');
      if (lp.classList.contains('open') && !lp.contains(e.target) && !$('btnLayers').contains(e.target)) {
        lp.classList.remove('open');
      }
    });

    // 底部
    $('btnAuto').addEventListener('click', function () {
      state.autoRotate = !state.autoRotate;
      this.classList.toggle('on', state.autoRotate);
      state.lastInteract = now();
    });
    $('btnGrid').addEventListener('click', function () {
      state.grid = !state.grid;
      gridMesh.visible = state.grid;
      this.classList.toggle('on', state.grid);
    });
    $('btnLight').addEventListener('click', function () {
      setLightMode(state.lightMode === 'soft' ? 'sun' : 'soft');
    });
    var viewBtns = document.querySelectorAll('.view-btn');
    for (var i = 0; i < viewBtns.length; i++) {
      (function (b) {
        b.addEventListener('click', function () {
          viewPreset(b.dataset.view);
        });
      })(viewBtns[i]);
    }
    $('btnZoomIn').addEventListener('click', function () { zoomBy(0.78); });
    $('btnZoomOut').addEventListener('click', function () { zoomBy(1.28); });
    $('btnReset').addEventListener('click', function () {
      clearSelection();
      clearViewPresetState();
      flyTo(5, 4, homeRadius(), 950);
    });

    // 小地图
    // 注意：miniCanvas 由 initThree 创建，因此点击监听在 boot 中 initThree 之后绑定

    // 键盘
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      var typing = tag === 'input' || tag === 'textarea';
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); openSearch(); return;
      }
      if (e.key === 'Escape') {
        if ($('modal').classList.contains('open')) { closeModal(); return; }
        if (searchOpen) { hideSearch(); searchInput.blur(); return; }
        if (state.selectedId) { clearSelection(); return; }
      }
      if (typing) return;
      if (e.key === '/') { e.preventDefault(); openSearch(); }
      else if (e.key === 'g' || e.key === 'G') { $('btnGrid').click(); }
      else if (e.key === 'r' || e.key === 'R') { $('btnAuto').click(); }
      else if (e.key === 'l' || e.key === 'L') { $('btnLight').click(); }
      else if (e.key === 'h' || e.key === 'H') { $('btnReset').click(); }
      else if (e.key === 'ArrowLeft') { state.camLon -= 3; state.lastInteract = now(); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { state.camLon += 3; state.lastInteract = now(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { state.camLat = clamp(state.camLat + 2, -88, 88); state.lastInteract = now(); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { state.camLat = clamp(state.camLat - 2, -88, 88); state.lastInteract = now(); e.preventDefault(); }
      else if (e.key === '+' || e.key === '=') { zoomBy(0.82); e.preventDefault(); }
      else if (e.key === '-') { zoomBy(1.22); e.preventDefault(); }
    });

    // 窗口
    window.addEventListener('resize', onResize);
  }

  function bindMinimap() {
    if (!miniCanvas) return;
    miniCanvas.addEventListener('click', function (e) {
      var r = miniCanvas.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = (e.clientY - r.top) / r.height;
      var lon = x * 360 - 180;
      var lat = 90 - y * 180;
      flyTo(lat, lon, Math.min(state.targetRadius, 2.4), 700);
    });
  }

  function updateSearchActive() {
    var nodes = searchResults.querySelectorAll('.result');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('active', i === searchActive);
      nodes[i].setAttribute('aria-selected', i === searchActive ? 'true' : 'false');
      if (i === searchActive) nodes[i].scrollIntoView({ block: 'nearest' });
    }
  }

  function closeModal() { $('modal').classList.remove('open'); }

  function setLightMode(mode) {
    state.lightMode = mode === 'sun' ? 'sun' : 'soft';
    var btn = $('btnLight');
    if (btn) {
      btn.classList.toggle('on', state.lightMode === 'sun');
      btn.title = state.lightMode === 'soft'
        ? tr('光照：柔光（点击切换为按当前时间计算的真实日照）', 'Lighting: soft (click for real sunlight computed from the current time)')
        : tr('光照：按当前时间计算的真实日照（点击切换为柔光）', 'Lighting: real sunlight from the current time (click for soft light)');
    }
    var label = $('lightLabel');
    if (label) label.textContent = state.lightMode === 'soft' ? tr('柔光', 'Soft') : tr('日照', 'Sun');
    if (state.lightMode === 'sun') updateSunFromClock();
    else updateLights();
  }

  function onResize() {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    if (isMobile()) $('infoPanel').classList.remove('open');
    drawMini();
  }

  /* ---------------------------------------------------------------------
     启动
     --------------------------------------------------------------------- */
  function boot() {
    initUI();
    if (!initThree()) return;
    loadTextures();
    setupCanvasEvents();
    bindMinimap();
    updateSunFromClock();
    setInterval(updateSunFromClock, 60000);
    requestAnimationFrame(animate);
    window.__LUNAR__ = {
      ready: false,
      state: state,
      features: FEATURES,
      select: function (id) { selectFeature(id, { fly: true }); },
      selectByName: function (name) {
        var f = FEATURES.find(function (x) { return x.name === name || x.nameEn === name; });
        if (f) selectFeature(f.id, { fly: true });
        return f ? f.id : null;
      },
      view: function (lat, lon, r) { flyTo(lat, lon, r, 0); },
      reset: function () { clearSelection(); flyTo(5, 4, homeRadius(), 0); },
      setLayer: function (g, on) {
        state.layers[g] = !!on;
        var chip = chipsEl.querySelector('.chip[data-group="' + g + '"]');
        if (chip) chip.classList.toggle('on', !!on);
        renderList();
      },
      setLight: function (mode) { setLightMode(mode); },
      setLightTime: function (value) {
        var d = value ? new Date(value) : new Date();
        if (isNaN(d.getTime())) return null;
        var p = subsolarPoint(d);
        state.sunLon = p.lon;
        state.sunLat = p.lat;
        updateLights();
        return { lon: p.lon, lat: p.lat, phase: p.phase };
      },
      toggleGrid: function () { $('btnGrid').click(); },
      screenshotMode: function () {
        $('loader').classList.add('done');
        if (coachEl) coachEl.classList.add('hide');
      }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
