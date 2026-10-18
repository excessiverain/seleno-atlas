import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const b64 = (p) => fs.readFileSync(path.join(root, p)).toString('base64')

const template = read('src/template.html')
const css = read('src/style.css')
const app = read('src/app.js')
const three = read('vendor/three.min.js')
const data = read('data/moon_atlas_data.json')
const texColor = b64('textures/moon_color_4k.jpg')
const texBump = b64('textures/moon_bump_4k.jpg')

const safeScript = (s) => s.replace(/<\/script/gi, '<\\/script')
const safeJson = (s) => s.replace(/<\/script/gi, '<\\/script')

let out = template
out = out.replace('/*__INLINE_CSS__*/', () => css)
out = out.replace('<!--__INLINE_THREE__-->', () => '<script>\n' + safeScript(three) + '\n</script>')
out = out.replace('<!--__INLINE_DATA__-->', () => '<script>\nwindow.__ATLAS__ = ' + safeJson(data) + ';\n' +
  'window.__TEX_COLOR__ = "data:image/jpeg;base64,' + texColor + '";\n' +
  'window.__TEX_BUMP__ = "data:image/jpeg;base64,' + texBump + '";\n' +
  '</script>')
out = out.replace('<!--__INLINE_APP__-->', () => '<script>\n' + safeScript(app) + '\n</script>')

if (/<!--__INLINE_|__INLINE_CSS__/.test(out)) throw new Error('未替换的占位符：' + out.match(/__INLINE_[A-Z_]+/g))
fs.writeFileSync(path.join(root, 'moon_atlas.html'), out)
const kb = (n) => (n / 1024).toFixed(0) + ' KB'
console.log('moon_atlas.html', kb(Buffer.byteLength(out)))
console.log('  css', kb(Buffer.byteLength(css)), 'app', kb(Buffer.byteLength(app)), 'three', kb(Buffer.byteLength(three)))
console.log('  data', kb(Buffer.byteLength(data)), 'tex color', kb(texColor.length), 'tex bump', kb(texBump.length))
