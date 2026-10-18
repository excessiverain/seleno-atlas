#!/usr/bin/env node
/**
 * shoot.mjs —— 真实浏览器验收脚本（headless Edge + CDP）
 * 打开单文件 moon_atlas.html，等待 __READY__，抓取多组视角截图与 DOM/控制台证据。
 * 需要较宽的执行权限：headless Chromium 在 DSH workspace-write 沙箱下无法启动。
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const htmlPath = path.join(root, 'moon_atlas.html')
const outDir = path.join(root, 'shots')
fs.mkdirSync(outDir, { recursive: true })
const profile = path.join(root, '.edge-shot-profile-' + Date.now().toString(36))
fs.mkdirSync(profile, { recursive: true })
const port = 9347

const edgeCandidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
]
const edge = edgeCandidates.find(p => { try { return fs.existsSync(p) } catch { return false } })
if (!edge) { console.error('NO BROWSER'); process.exit(2) }

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const child = spawn(edge, [
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-sync',
  '--mute-audio',
  '--hide-scrollbars',
  '--ignore-gpu-blocklist',
  '--enable-unsafe-swiftshader',
  '--use-angle=swiftshader',
  '--allow-file-access-from-files',
  '--remote-debugging-port=' + port,
  '--user-data-dir=' + profile,
  '--window-size=1600,1000',
  'about:blank',
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
  try {
    const r = await fetch('http://127.0.0.1:' + port + '/json/version')
    if (r.ok) { version = await r.json(); break }
  } catch {}
  await sleep(150)
}
if (!version) { console.error('CDP NOT READY'); cleanup(2) }
console.log('browser', version['Browser'])

const target = await (await fetch('http://127.0.0.1:' + port + '/json/new?' + encodeURIComponent('file:///' + htmlPath.replace(/\\/g, '/')), { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

let nextId = 0
const pending = new Map()
const events = []
ws.onmessage = (ev) => {
  let msg
  try { msg = JSON.parse(ev.data) } catch { return }
  if (msg.id != null && pending.has(msg.id)) {
    const p = pending.get(msg.id); pending.delete(msg.id)
    if (msg.error) p.reject(new Error(JSON.stringify(msg.error)))
    else p.resolve(msg.result)
  } else if (msg.method) {
    events.push(msg)
  }
}
function send(method, params = {}) {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('CDP timeout: ' + method)) } }, 30000)
  })
}
const consoleErrors = []
const exceptions = []
async function main() {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'file:///' + htmlPath.replace(/\\/g, '/') })

  // 等待就绪
  let ready = false
  let evalResult = null
  for (let i = 0; i < 160; i++) {
    await sleep(250)
    try {
      const r = await send('Runtime.evaluate', { expression: '({ready: !!window.__READY__, err: window.__FATAL__ || null, loader: document.getElementById("loader")?.className || "", labels: document.querySelectorAll(".lbl").length})', returnByValue: true })
      evalResult = r.result?.value
      if (evalResult?.ready) { ready = true; break }
    } catch {}
  }
  console.log('ready', ready, JSON.stringify(evalResult))
  if (!ready) {
    const html = await send('Runtime.evaluate', { expression: 'document.body.innerText.slice(0,2000)', returnByValue: true })
    console.log('BODY', html.result?.value)
  }

  // 收集控制台错误
  for (const ev of events) {
    if (ev.method === 'Runtime.consoleAPICalled' && ev.params.type === 'error') {
      consoleErrors.push(ev.params.args.map(a => a.value || a.description || '').join(' '))
    }
    if (ev.method === 'Runtime.exceptionThrown') {
      exceptions.push(ev.params.exceptionDetails?.exception?.description || ev.params.exceptionDetails?.text)
    }
    if (ev.method === 'Log.entryAdded' && ev.params.entry.level === 'error') {
      consoleErrors.push(ev.params.entry.text)
    }
  }

  async function evaluate(expression, awaitPromise = false) {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
    return r.result?.value
  }
  async function shot(name, wait = 900) {
    await sleep(wait)
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    const f = path.join(outDir, name + '.png')
    fs.writeFileSync(f, Buffer.from(r.data, 'base64'))
    console.log('shot', f, fs.statSync(f).size)
  }
  async function setView(lat, lon, r) {
    await evaluate(`window.__LUNAR__ && window.__LUNAR__.view(${lat}, ${lon}, ${r})`)
    await sleep(250)
  }

  await evaluate('window.__LUNAR__.state.autoRotate = false; window.__LUNAR__.screenshotMode();')
  await shot('01_near_default', 1300)

  await evaluate('window.__LUNAR__.selectByName("第谷")')
  await sleep(1600)
  await shot('02_tycho_selected', 600)

  await evaluate('window.__LUNAR__.state.autoRotate = false; document.querySelector(".view-btn[data-view=far]").click()')
  await sleep(1300)
  await shot('03_far_side', 500)
  const farLabels = await evaluate(`[...document.querySelectorAll('.lbl')].filter(e => e.style.display !== 'none').map(e => e.innerText.replace(/\\n/g,' / '))`)
  console.log('FAR_LABELS', JSON.stringify(farLabels))

  await evaluate('window.__LUNAR__.selectByName("嫦娥五号")')
  await sleep(1700)
  await shot('04_change5', 700)

  await evaluate('window.__LUNAR__.state.autoRotate = false; window.__LUNAR__.view(12, 31, 2.0); window.__LUNAR__.toggleGrid()')
  await sleep(1100)
  await evaluate('window.__LUNAR__.setLight("sun")')
  await sleep(900)
  await shot('05_grid_sun', 400)

  // 搜索 / 关于 / 移动端
  await evaluate('window.__LUNAR__.reset(); window.__LUNAR__.setLight("soft"); document.getElementById("btnGrid").classList.contains("on") && window.__LUNAR__.toggleGrid();')
  await sleep(1200)
  await shot('06_near_clean', 300)
  await evaluate(`(() => { const i = document.getElementById('searchInput'); i.focus(); i.value = '嫦娥'; i.dispatchEvent(new Event('input', {bubbles:true})); })()`)
  await sleep(450)
  await shot('07_search', 200)
  const searchInfo = await evaluate(`(() => ({
    open: !document.getElementById('searchResults').hidden,
    count: document.querySelectorAll('#searchResults .result').length,
    first: document.querySelector('#searchResults .result')?.innerText || ''
  }))()`)
  await evaluate(`document.querySelector('#searchResults .result')?.click()`)
  await sleep(1500)
  await shot('08_search_selected', 300)
  await evaluate(`document.getElementById('btnHelp').click()`)
  await sleep(400)
  await shot('09_about', 200)
  const aboutOpen = await evaluate(`document.getElementById('modal').classList.contains('open')`)
  await evaluate(`document.getElementById('modalClose').click()`)

  // 移动端
  await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 860, deviceScaleFactor: 1, mobile: true })
  await send('Page.navigate', { url: 'file:///' + htmlPath.replace(/\\/g, '/') })
  let mready = false
  for (let i = 0; i < 120; i++) {
    await sleep(250)
    try {
      const r = await evaluate('!!window.__READY__')
      if (r) { mready = true; break }
    } catch {}
  }
  await evaluate('window.__LUNAR__ && (window.__LUNAR__.state.autoRotate = false, window.__LUNAR__.screenshotMode())')
  await sleep(1000)
  await shot('10_mobile', 200)
  const mobileUI = await evaluate(`(() => {
    const a = document.querySelector('.top-actions');
    return {
      win: [innerWidth, innerHeight],
      actionsRect: a && {x:a.getBoundingClientRect().x,w:a.getBoundingClientRect().width},
      actions: [...a.children].map(e => ({id:e.id, text:e.title, display:getComputedStyle(e).display, rect:{x:e.getBoundingClientRect().x,w:e.getBoundingClientRect().width}})),
      dock: getComputedStyle(document.getElementById('dock')).display,
      cam: {lat:window.__LUNAR__.state.camLat, lon:window.__LUNAR__.state.camLon, r:window.__LUNAR__.state.camRadius}
    };
  })()`)
  await evaluate('window.__LUNAR__ && window.__LUNAR__.selectByName("嫦娥四号")')
  await sleep(1700)
  await shot('11_mobile_selected', 300)

  // 1280×800 笔记本布局
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'file:///' + htmlPath.replace(/\\/g, '/') })
  for (let i = 0; i < 120; i++) {
    await sleep(250)
    try { if (await evaluate('!!window.__READY__')) break } catch {}
  }
  await evaluate('window.__LUNAR__ && (window.__LUNAR__.state.autoRotate = false, window.__LUNAR__.screenshotMode())')
  await sleep(900)
  await shot('15_1280x800', 200)
  const laptopUI = await evaluate(`(() => ({
    camR: window.__LUNAR__.state.camRadius,
    canvas: [document.getElementById('webgl').clientWidth, document.getElementById('webgl').clientHeight],
    labels: [...document.querySelectorAll('.lbl')].filter(e => e.style.display !== 'none').length
  }))()`)

  // 恢复桌面
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'file:///' + htmlPath.replace(/\\/g, '/') })
  for (let i = 0; i < 120; i++) {
    await sleep(250)
    try { if (await evaluate('!!window.__READY__')) break } catch {}
  }
  await evaluate('window.__LUNAR__ && (window.__LUNAR__.state.autoRotate = false, window.__LUNAR__.screenshotMode(), window.__LUNAR__.selectByName("嫦娥五号"))')
  await sleep(1500)

  // DOM 证据
  const dom = await evaluate(`(() => ({
    title: document.title,
    labelsTotal: document.querySelectorAll('.lbl').length,
    labelsVisible: [...document.querySelectorAll('.lbl')].filter(e => e.style.display !== 'none' && parseFloat(e.style.opacity) > .1).length,
    labelSamples: [...document.querySelectorAll('.lbl')].filter(e => e.style.display !== 'none').slice(0, 15).map(e => e.innerText.replace(/\\n/g, ' / ')),
    chips: [...document.querySelectorAll('.chip')].map(e => e.innerText.replace(/\\s+/g, ' ').trim()),
    listCount: document.getElementById('listCount').textContent,
    infoTitle: document.querySelector('.detail-name')?.textContent || '',
    loaderClass: document.getElementById('loader').className,
    canvas: (() => { const c = document.getElementById('webgl'); return { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight }; })(),
    selected: window.__LUNAR__.state.selectedId,
    cam: { lat: window.__LUNAR__.state.camLat, lon: window.__LUNAR__.state.camLon, r: window.__LUNAR__.state.camRadius },
    features: window.__LUNAR__.features.length
  }))()`)
  const errors = await evaluate('window.__errors || null')
  console.log('DOM', JSON.stringify(dom, null, 2))
  console.log('CONSOLE_ERRORS', JSON.stringify(consoleErrors.slice(0, 20), null, 2))
  console.log('EXCEPTIONS', JSON.stringify(exceptions.slice(0, 20), null, 2))
  const extra = { searchInfo, aboutOpen, mobileReady: mready, mobileUI, laptopUI }
  console.log('EXTRA', JSON.stringify(extra, null, 2))
  fs.writeFileSync(path.join(outDir, 'acceptance.json'), JSON.stringify({ ready, dom, consoleErrors, exceptions, extra, events: events.length }, null, 2))
  ws.close()
  cleanup(0)
}
main().catch(e => { console.error('FATAL', e); cleanup(1) })
