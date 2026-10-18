#!/usr/bin/env node
/**
 * verify.mjs —— 交互验收（headless Edge + CDP）
 * 检查离线加载、搜索、标签点击、图层切换、光照/经纬网、小地图、关于弹窗、移动端抽屉与底部详情。
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const htmlPath = path.join(root, 'moon_atlas.html')
const outDir = path.join(root, 'shots')
fs.mkdirSync(outDir, { recursive: true })
const profile = path.join(root, '.edge-verify-profile-' + Date.now().toString(36))
fs.mkdirSync(profile, { recursive: true })
const port = 9351
const edgeCandidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
]
const edge = edgeCandidates.find(p => fs.existsSync(p))
if (!edge) { console.error('NO BROWSER'); process.exit(2) }
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const child = spawn(edge, [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--disable-sync', '--mute-audio', '--hide-scrollbars', '--ignore-gpu-blocklist',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--allow-file-access-from-files',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--window-size=1600,1000', 'about:blank',
], { stdio: 'ignore', windowsHide: true })
function cleanup(code) {
  try { child.kill() } catch {}
  setTimeout(() => {
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } catch {}
    process.exit(code)
  }, 900)
}
let version = null
for (let i = 0; i < 100; i++) {
  try { const r = await fetch('http://127.0.0.1:' + port + '/json/version'); if (r.ok) { version = await r.json(); break } } catch {}
  await sleep(150)
}
if (!version) { console.error('CDP NOT READY'); cleanup(2) }
const target = await (await fetch('http://127.0.0.1:' + port + '/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let nextId = 0
const pending = new Map()
const events = []
ws.onmessage = (ev) => {
  let msg; try { msg = JSON.parse(ev.data) } catch { return }
  if (msg.id != null && pending.has(msg.id)) {
    const p = pending.get(msg.id); pending.delete(msg.id)
    msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result)
  } else if (msg.method) events.push(msg)
}
function send(method, params = {}) {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('CDP timeout ' + method)) } }, 30000)
  })
}
async function ev(expression, awaitPromise = false) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
  return r.result?.value
}
const results = {}
const errors = []
async function waitReady() {
  for (let i = 0; i < 160; i++) {
    await sleep(250)
    try { if (await ev('!!window.__READY__')) return true } catch {}
  }
  return false
}
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'file:///' + htmlPath.replace(/\\/g, '/') })
  results.ready = await waitReady()
  await sleep(800)
  await ev('window.__LUNAR__.state.autoRotate = false; window.__LUNAR__.screenshotMode();')
  await sleep(500)

  results.initial = await ev(`(() => ({
    features: window.__LUNAR__.features.length,
    labels: document.querySelectorAll('.lbl').length,
    visible: [...document.querySelectorAll('.lbl')].filter(e => e.style.display !== 'none' && parseFloat(e.style.opacity) > .1).length,
    chips: [...document.querySelectorAll('.chip')].length,
    dock: getComputedStyle(document.getElementById('dock')).display,
    loader: document.getElementById('loader').className,
    canvas: [document.getElementById('webgl').width, document.getElementById('webgl').height]
  }))()`)

  // 1) 搜索“第谷”并点击第一条结果
  await ev(`(() => { const i=document.getElementById('searchInput'); i.value='第谷'; i.dispatchEvent(new Event('input',{bubbles:true})); })()`)
  await sleep(350)
  results.search = await ev(`(() => ({
    open: !document.getElementById('searchResults').hidden,
    count: document.querySelectorAll('#searchResults .result').length,
    first: document.querySelector('#searchResults .result')?.innerText.replace(/\\n/g,' / ') || ''
  }))()`)
  await ev(`document.querySelector('#searchResults .result')?.click()`)
  await sleep(1400)
  results.searchSelect = await ev(`({selected: window.__LUNAR__.state.selectedId, title: document.querySelector('.detail-name')?.textContent || ''})`)

  // 2) 回到默认视角，点击地图标签“阿波罗11号”
  await ev(`document.getElementById('infoClose').click(); document.getElementById('btnReset').click();`)
  await sleep(1300)
  results.labelClick = await ev(`(() => {
    let el = document.querySelector('.lbl[data-id="apollo-11"]');
    if (!el || el.style.display === 'none') el = [...document.querySelectorAll('.lbl')].find(e => e.style.display !== 'none');
    if (!el) return {found:false};
    el.click();
    return {found:true, id:el.dataset.id};
  })()`)
  await sleep(1400)
  results.labelSelect = await ev(`({selected: window.__LUNAR__.state.selectedId, title: document.querySelector('.detail-name')?.textContent || ''})`)

  // 3) 图层 / 经纬网 / 光照
  await ev(`document.querySelector('.chip[data-group=water]').click()`)
  await sleep(450)
  results.layerToggle = await ev(`({water: window.__LUNAR__.state.layers.water, chipOn: document.querySelector('.chip[data-group=water]').classList.contains('on')})`)
  await ev(`document.querySelector('.chip[data-group=water]').click()`)
  await ev(`document.getElementById('btnGrid').click(); document.getElementById('btnLight').click();`)
  await sleep(700)
  results.toggles = await ev(`({grid: window.__LUNAR__.state.grid, gridOn: document.getElementById('btnGrid').classList.contains('on'), light: window.__LUNAR__.state.lightMode, lightOn: document.getElementById('btnLight').classList.contains('on'), lightLabel: document.getElementById('lightLabel').textContent})`)
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  fs.writeFileSync(path.join(outDir, '12_grid_sun_ui.png'), Buffer.from(shot.data, 'base64'))

  // 4) 小地图点击
  const before = await ev(`({lon:window.__LUNAR__.state.camLon, lat:window.__LUNAR__.state.camLat})`)
  await ev(`(() => { const c=document.getElementById('minimap'); const r=c.getBoundingClientRect(); c.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+r.width*0.25,clientY:r.top+r.height*0.5})); })()`)
  await sleep(900)
  const after = await ev(`({lon:window.__LUNAR__.state.camLon, lat:window.__LUNAR__.state.camLat})`)
  results.minimap = { before, after, moved: Math.abs(after.lon - before.lon) > 0.5 }

  // 5) 关于弹窗
  await ev(`document.getElementById('btnHelp').click()`)
  await sleep(300)
  const aboutOpen = await ev(`document.getElementById('modal').classList.contains('open')`)
  await ev(`document.getElementById('modalClose').click()`)
  results.about = { open: aboutOpen, close: await ev(`!document.getElementById('modal').classList.contains('open')`) }

  // 6) 重置
  await ev(`document.getElementById('btnReset').click()`)
  await sleep(1100)
  results.reset = await ev(`({selected: window.__LUNAR__.state.selectedId, radius: window.__LUNAR__.state.camRadius})`)

  // 7) 移动端
  await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 860, deviceScaleFactor: 1, mobile: true })
  await send('Page.navigate', { url: 'file:///' + htmlPath.replace(/\\/g, '/') })
  results.mobileReady = await waitReady()
  await ev('window.__LUNAR__.state.autoRotate = false; window.__LUNAR__.screenshotMode();')
  await sleep(700)
  results.mobileLayout = await ev(`(() => {
    const a=document.querySelector('.top-actions');
    return {
      camR: window.__LUNAR__.state.camRadius,
      dock: getComputedStyle(document.getElementById('dock')).display,
      topActionsRight: Math.max(...[...a.children].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect().right)),
      width: innerWidth
    };
  })()`)
  await ev(`document.getElementById('btnLayers').click()`)
  await sleep(400)
  results.mobileDrawer = await ev(`({open: document.getElementById('leftPanel').classList.contains('open'), items: document.querySelectorAll('#featureList .feat-item').length})`)
  const shot2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  fs.writeFileSync(path.join(outDir, '13_mobile_layers.png'), Buffer.from(shot2.data, 'base64'))
  await ev(`document.querySelector('#featureList .feat-item')?.click()`)
  await sleep(1500)
  results.mobileSelect = await ev(`({selected: window.__LUNAR__.state.selectedId, infoOpen: document.getElementById('infoPanel').classList.contains('open'), title: document.querySelector('.detail-name')?.textContent || ''})`)
  const shot3 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  fs.writeFileSync(path.join(outDir, '14_mobile_detail.png'), Buffer.from(shot3.data, 'base64'))
  await ev(`document.getElementById('infoClose').click()`)
  await sleep(400)
  results.mobileClose = await ev(`({selected: window.__LUNAR__.state.selectedId, infoOpen: document.getElementById('infoPanel').classList.contains('open')})`)

  // 网络请求（离线检查）
  const reqs = events.filter(e => e.method === 'Network.requestWillBeSent').map(e => e.params.request.url)
  results.requests = {
    total: reqs.length,
    external: reqs.filter(u => /^https?:/i.test(u)),
    sample: reqs.slice(0, 6)
  }

  // 控制台错误
  for (const e of events) {
    if (e.method === 'Runtime.exceptionThrown') errors.push(e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text)
    if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') errors.push(e.params.entry.text)
    if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') errors.push(e.params.args.map(a => a.value || a.description || '').join(' '))
  }
  results.consoleErrors = errors
  fs.writeFileSync(path.join(outDir, 'interaction_report.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  ws.close(); cleanup(0)
} catch (e) {
  console.error('VERIFY FATAL', e)
  try { fs.writeFileSync(path.join(outDir, 'interaction_report.json'), JSON.stringify({ error: String(e), results, errors }, null, 2)) } catch {}
  cleanup(1)
}
