import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'))
const cratersRaw = read('data/reference/ref_craters.json')
const mountainsRaw = read('data/reference/ref_mountains.json')
const waterRaw = read('data/reference/ref_water.json')
const artificialRaw = read('data/reference/ref_artificial.json')

const clean = (s) => String(s == null ? '' : s).replace(/^[\s"'“”]+|[\s"'“”]+$/g, '').replace(/\s+/g, ' ').trim()
const num = (v) => {
  if (v === null || v === undefined || v === '') return NaN
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.+-]/g, ''))
  return Number.isFinite(n) ? n : NaN
}
const slug = (s) => clean(s).toLowerCase()
  .replace(/[öø]/g, 'o').replace(/[ü]/g, 'u').replace(/[ä]/g, 'a').replace(/[éèêë]/g, 'e')
  .replace(/[áàâ]/g, 'a').replace(/[íì]/g, 'i').replace(/[óò]/g, 'o').replace(/[úù]/g, 'u')
  .replace(/[š]/g, 's').replace(/[č]/g, 'c').replace(/[ř]/g, 'r').replace(/[ž]/g, 'z')
  .replace(/[’'ʹ`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const normLon = (lon) => {
  let x = lon
  while (x > 180) x -= 360
  while (x < -180) x += 360
  return x
}
const parsePos = (pos) => {
  if (!pos) return null
  const s = String(pos)
  const latM = s.match(/([0-9]+(?:\.[0-9]+)?)\s*°\s*([NS])/i)
  const lonM = s.match(/([0-9]+(?:\.[0-9]+)?)\s*°\s*([EW])/i)
  if (!latM || !lonM) return null
  let lat = parseFloat(latM[1]) * (latM[2].toUpperCase() === 'S' ? -1 : 1)
  let lon = parseFloat(lonM[1]) * (lonM[2].toUpperCase() === 'W' ? -1 : 1)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (Math.abs(lat) > 90) return null
  return { lat, lon: normLon(lon) }
}

const features = []
const seen = new Set()
const usedIds = new Set()
function addFeature(f) {
  if (!f || !Number.isFinite(f.lat) || !Number.isFinite(f.lon)) return false
  if (Math.abs(f.lat) > 90.001) return false
  f.lon = normLon(f.lon)
  let id = f.id || slug(f.nameEn || f.name)
  if (!id) id = 'f'
  let base = id
  let i = 2
  while (usedIds.has(id)) id = base + '-' + i++
  usedIds.add(id)
  f.id = id
  f.featured = !!f.featured
  f.priority = Number.isFinite(f.priority) ? f.priority : 50
  if (f.aliases && !Array.isArray(f.aliases)) f.aliases = [f.aliases]
  f.diameter = Number.isFinite(f.diameter) ? Math.round(f.diameter * 100) / 100 : null
  if (f.origin) f.origin = clean(f.origin)
  features.push(f)
  return true
}

/* ---------------- 环形山 ---------------- */
const craterByEn = new Map()
for (const c of cratersRaw) {
  let lat = num(c.latitude)
  let lon = num(c.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    // try the degree strings
    const p = parseCoordStrings(c.latitude_deg, c.longitude_deg)
    if (p) { lat = p.lat; lon = p.lon }
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue
  const nameEn = clean(c.name_en).replace(/[，,]+$/, '')
  if (!nameEn) continue
  const key = nameEn.toLowerCase()
  const rec = {
    name: clean(c.name) || nameEn,
    nameEn,
    lat,
    lon: normLon(lon),
    diameter: num(c.diameter_km),
    origin: clean(c.name_origin),
  }
  if (!Number.isFinite(rec.diameter)) rec.diameter = null
  if (!rec.name) rec.name = nameEn
  const old = craterByEn.get(key)
  if (!old || (rec.diameter || 0) > (old.diameter || 0)) craterByEn.set(key, rec)
}
function parseCoordStrings(latS, lonS) {
  if (latS == null || lonS == null) return null
  const a = String(latS).match(/([0-9]+(?:\.[0-9]+)?)\s*([NS])/i)
  const b = String(lonS).match(/([0-9]+(?:\.[0-9]+)?)\s*([EW])/i)
  if (!a || !b) return null
  return {
    lat: parseFloat(a[1]) * (a[2].toUpperCase() === 'S' ? -1 : 1),
    lon: parseFloat(b[1]) * (b[2].toUpperCase() === 'W' ? -1 : 1),
  }
}

const FEATURED_CRATERS = {
  Tycho: 99, Copernicus: 98, Aristarchus: 96, Plato: 94, Clavius: 92, Kepler: 90,
  Eratosthenes: 88, Archimedes: 86, Ptolemaeus: 87, Alphonsus: 84, Arzachel: 80,
  Gassendi: 85, Grimaldi: 82, Schickard: 78, Bailly: 82, Theophilus: 88, Cyrillus: 80,
  Catharina: 78, Piccolomini: 76, Langrenus: 84, Petavius: 82, Vendelinus: 74,
  Furnerius: 70, Metius: 68, Fabricius: 66, Janssen: 76, Maurolycus: 72,
  Stöfler: 66, Regiomontanus: 68, Purbach: 68, Walther: 74, Albategnius: 70,
  Hipparchus: 74, Flammarion: 66, Herschel: 64, Aristillus: 66, Autolycus: 64,
  Timocharis: 60, Manilius: 62, Menelaus: 60, Plinius: 64, Ross: 54, Arago: 56,
  Ritter: 54, Sabine: 54, Moltke: 58, Bessel: 56, 'Sulpicius Gallus': 54,
  Posidonius: 74, Atlas: 70, Hercules: 68, Bürg: 62, Eudoxus: 64, Aristoteles: 76,
  Cassini: 66, Bullialdus: 68, 'Jules Verne': 72,
  Tsiolkovskiy: 96, Gagarin: 88, Korolev: 94, Apollo: 97, Hertzsprung: 92,
  Mendeleev: 88, 'Poincaré': 82, Planck: 80, 'Schrödinger': 86, 'Van de Graaff': 76,
  Fermi: 78, Milne: 74, Birkhoff: 76, Harkhebi: 74, Lorentz: 78, Aitken: 80,
  Jackson: 70, Das: 64, Finsen: 68, Drygalski: 76, Zeeman: 74, Wiener: 66,
  Fizeau: 68, Hopmann: 66, Antoniadi: 70, Minnaert: 68, Shackleton: 98,
  Peary: 88, Byrd: 78, Amundsen: 76, Scott: 76, Cabeus: 78, Malapert: 70,
  Boussingault: 68,
}

const MANUAL_CRATERS = [
  { nameEn: 'Shackleton', name: '沙克尔顿', lat: -89.9, lon: 0, diameter: 20.9, origin: '欧内斯特·沙克尔顿（Ernest Shackleton，1874—1922），英国南极探险家。' },
  { nameEn: 'Bürg', name: '比格', lat: 45.0, lon: 28.2, diameter: 40.0, origin: '约翰·托比亚斯·比格（Johann Tobias Bürg，1766—1834），奥地利天文学家。' },
  { nameEn: 'Stöfler', name: '施特夫勒', lat: -41.2, lon: 6.0, diameter: 126.0, origin: '约翰内斯·施特夫勒（Johannes Stöffler，1452—1531），德国数学家、天文学家。' },
]
// 对少数流传较广的中文译名做规范化，原参考站译名保留为别名以便检索。
const NAME_ZH = {
  Langrenus: ['朗格伦', '朗伦'],
  Petavius: ['佩塔维乌斯', '培特威物斯'],
  Janssen: ['让森', '让桑'],
  Aristillus: ['阿里斯提鲁斯', '阿里斯基尔'],
  Autolycus: ['奥托吕库斯', '奥托里库斯'],
  Timocharis: ['提莫恰里斯', '梯摩恰里斯'],
  Manilius: ['马尼利乌斯', '曼尼里乌斯'],
  Menelaus: ['墨涅拉俄斯', '门纳劳斯'],
  Ritter: ['里特', '李特尔'],
  Posidonius: ['波西多尼乌斯', '波希多尼'],
  Schickard: ['席卡德', '施卡德'],
  Theophilus: ['狄奥菲勒斯', '西奥菲勒斯'],
  Catharina: ['凯瑟琳娜', '凯瑟琳'],
  Clavius: ['克拉维乌斯', '克拉维斯'],
  Eratosthenes: ['埃拉托色尼', '厄拉多塞'],
  Maurolycus: ['毛罗利科', '马若利科'],
  Flammarion: ['弗拉马里翁', '弗拉马利翁'],
  Walther: ['瓦尔特', '沃尔瑟'],
  Vendelinus: ['文德林', '文德利努斯'],
  Furnerius: ['弗内留斯', '弗内留斯'],
  Bullialdus: ['布利亚尔杜斯', '布利奥'],
  Metius: ['梅修斯', '梅修斯'],
  Fabricius: ['法布里修斯', '法布里休斯'],
  Stöfler: ['施特夫勒', '施特夫勒'],
  Bürg: ['比格', '比格'],
}
for (const m of MANUAL_CRATERS) {
  const key = m.nameEn.toLowerCase()
  const found = craterByEn.get(key)
  craterByEn.set(key, { ...(found || {}), ...m, origin: m.origin || found?.origin })
}
for (const [en, [zh, alt]] of Object.entries(NAME_ZH)) {
  const cur = craterByEn.get(en.toLowerCase())
  if (cur) { cur.name = zh; cur.altName = alt !== zh ? alt : undefined }
}

// Add craters: featured first (with overrides), then all others
const featuredKeys = new Set(Object.keys(FEATURED_CRATERS).map(k => k.toLowerCase()))
for (const [key, priority] of Object.entries(FEATURED_CRATERS)) {
  const rec = craterByEn.get(key.toLowerCase())
  if (!rec) { console.warn('MISSING FEATURED CRATER', key); continue }
  addFeature({
    name: rec.name,
    nameEn: rec.nameEn,
    type: 'crater',
    group: 'crater',
    lat: rec.lat,
    lon: rec.lon,
    diameter: rec.diameter,
    origin: rec.nameEn === 'Apollo'
      ? '直径约 524 km 的巨型撞击构造，也称阿波罗盆地，位于南极-艾特肯盆地内。嫦娥六号于 2024 年在其南部着陆并完成人类首次月背采样返回。'
      : rec.origin,
    priority,
    featured: true,
    altName: rec.altName,
    aliases: rec.nameEn,
  })
}
let addedCraters = 0
for (const [key, rec] of craterByEn) {
  if (featuredKeys.has(key)) continue
  if (rec.nameEn.toLowerCase() === 'walter') continue
  const d = rec.diameter || 0
  const priority = Math.max(20, Math.min(58, 20 + Math.log2(Math.max(2, d)) * 5))
  const ok = addFeature({
    name: rec.name,
    nameEn: rec.nameEn,
    type: 'crater',
    group: 'crater',
    lat: rec.lat,
    lon: rec.lon,
    diameter: rec.diameter,
    origin: rec.origin,
    priority,
    featured: false,
    altName: rec.altName,
  })
  if (ok) addedCraters++
}
console.log('craters featured', Object.keys(FEATURED_CRATERS).length, 'total records', craterByEn.size, 'all added', addedCraters)

/* ---------------- 月海 / 湖 / 月溪 / 月谷 ---------------- */
const FEATURED_WATER = {
  'Oceanus Procellarum': 100, 'Mare Imbrium': 99, 'Mare Serenitatis': 98,
  'Mare Tranquillitatis': 98, 'Mare Crisium': 97, 'Mare Fecunditatis': 93,
  'Mare Nectaris': 93, 'Mare Nubium': 90, 'Mare Humorum': 88, 'Mare Vaporum': 88,
  'Mare Frigoris': 88, 'Mare Orientale': 94, 'Mare Cognitum': 82,
  'Mare Insularum': 82, 'Mare Ingenii': 86, 'Mare Moscoviense': 88,
  'Mare Marginis': 80, 'Mare Smythii': 80, 'Mare Australe': 84,
  'Mare Humboldtianum': 80, 'Mare Anguis': 62, 'Mare Spumans': 62,
  'Mare Undarum': 60,
  'Lacus Mortis': 68, 'Lacus Aestatis': 62, 'Lacus Autumni': 62,
  'Lacus Doloris': 60, 'Lacus Felicitatis': 60, 'Lacus Gaudii': 60,
  'Lacus Hiemalis': 58, 'Lacus Lenitatis': 58, 'Lacus Oblivionis': 58,
  'Lacus Perseverantiae': 58, 'Lacus Excellentiae': 58, 'Lacus Bonitatis': 58,
  'Lacus Luxuriae': 56, 'Lacus Odii': 56, 'Lacus Somniorum': 82,
  'Palus Nebularum': 58, 'Palus Putredinis': 78, 'Palus Somni': 62,
  'Sinus Aestuum': 67, 'Sinus Amoris': 70, 'Sinus Asperitatis': 70,
  'Sinus Concordiae': 62, 'Sinus Fidei': 60, 'Sinus Honoris': 60,
  'Sinus Iridum': 92, 'Sinus Lunicus': 60, 'Sinus Medii': 70,
  'Sinus Roris': 74, 'Sinus Successus': 60,
}
const FEATURED_VALLEY = {
  'Vallis Alpes': 90, 'Vallis Schröteri': 86, 'Vallis Rheita': 78,
  'Vallis Schrödinger': 80, 'Vallis Baade': 66, 'Vallis Palitzsch': 62,
  'Vallis Snellius': 60, 'Vallis Planck': 58, 'Vallis Bouvard': 60,
  'Vallis Capella': 58, 'Vallis Inghirami': 58,
}
const FEATURED_RILLES = {
  'Rima Hadley': 92, 'Rima Hyginus': 86, 'Rima Ariadaeus': 80,
  'Rimae Triesnecker': 78, 'Rimae Sirsalis': 72, 'Rimae Prinz': 70,
  'Rima Schröter': 66, 'Rimae Sulpicius Gallus': 64, 'Rimae Littrow': 64,
  'Rima Marius': 60, 'Rima Sharp': 60, 'Rima Brayley': 58,
  'Rimae Archimedes': 66, 'Rimae Alphonsus': 62, 'Rimae Gassendi': 60,
  'Rimae Darcy': 58, 'Rimae Petavius': 60, 'Rimae Ramsden': 58,
}
for (const f of waterRaw) {
  const p = parsePos(f.position)
  if (!p) continue
  const name = clean(f.name)
  const nameEn = clean(f.name_en)
  if (!name || !nameEn) continue
  if (seen.has('water:' + nameEn.toLowerCase())) continue
  seen.add('water:' + nameEn.toLowerCase())
  let type = 'mare', group = 'water'
  if (/月溪$|溪$/.test(name)) { type = 'rille'; group = 'tectonic' }
  else if (/月谷$|谷$/.test(name)) { type = 'valley'; group = 'tectonic' }
  else if (/湖$|湾$|沼$/.test(name)) { type = 'lake'; group = 'water' }
  else if (!/海$|洋$/.test(name)) { type = 'water'; group = 'water' }
  const key = nameEn.toLowerCase()
  let priority = 52
  let featured = false
  if (FEATURED_WATER[clean(f.name_en)]) { priority = FEATURED_WATER[clean(f.name_en)]; featured = true }
  else if (FEATURED_VALLEY[clean(f.name_en)]) { priority = FEATURED_VALLEY[clean(f.name_en)]; featured = true }
  else if (FEATURED_RILLES[clean(f.name_en)]) { priority = FEATURED_RILLES[clean(f.name_en)]; featured = true }
  addFeature({
    name, nameEn, type, group, lat: p.lat, lon: p.lon,
    diameter: num(f.diameter_km), origin: clean(f.name_origins),
    priority, featured,
  })
}

/* ---------------- 山脉 / 断崖 / 山脊 / 岬 / 链坑 ---------------- */
const FEATURED_MOUNT = {
  'Montes Apenninus': 94, 'Montes Alpes': 88, 'Montes Caucasus': 84,
  'Montes Carpatus': 80, 'Montes Haemus': 80, 'Montes Jura': 84,
  'Montes Taurus': 82, 'Montes Riphaeus': 78, 'Montes Recti': 74,
  'Montes Teneriffe': 72, 'Montes Rook': 80, 'Montes Cordillera': 84,
  'Montes Agricola': 72, 'Montes Secchi': 70, 'Montes Spitzbergen': 70,
  'Montes Pyrenaeus': 68, 'Montes Harbinger': 66, 'Montes Archimedes': 66,
  'Mons Rümker': 90, 'Mons Pico': 80, 'Mons Piton': 76, 'Mons Hadley': 86,
  'Mons Huygens': 78, 'Mons Vitruvius': 74, 'Mons Gruithuisen Gamma': 72,
  'Mons Gruithuisen Delta': 68, 'Mons Argaeus': 64, 'Mons Wolff': 62,
  'Rupes Recta': 88, 'Rupes Altai': 82, 'Rupes Cauchy': 74,
  'Rupes Mercator': 70, 'Rupes Toscanelli': 64, 'Rupes Liebig': 62,
  'Reiner Gamma': 90,
  'Promontorium Heraclides': 68, 'Promontorium Laplace': 66,
  'Promontorium Agassiz': 62, 'Promontorium Fresnel': 60,
}
for (const f of mountainsRaw) {
  const p = parsePos(f.position)
  if (!p) continue
  const name = clean(f.name)
  const nameEn = clean(f.name_en)
  if (!name || !nameEn) continue
  if (seen.has('mount:' + nameEn.toLowerCase())) continue
  seen.add('mount:' + nameEn.toLowerCase())
  let type = 'mons', group = 'mountain'
  if (/山脉$/.test(name)) type = 'montes'
  else if (/山$/.test(name)) type = 'mons'
  else if (/断崖$|直壁$/.test(name)) { type = 'rupes'; group = 'tectonic' }
  else if (/山脊$/.test(name)) { type = 'dorsum'; group = 'tectonic' }
  else if (/岬$/.test(name)) { type = 'promontorium'; group = 'tectonic' }
  else if (/链坑$/.test(name)) { type = 'catena'; group = 'tectonic' }
  else if (/Gamma$/.test(nameEn)) { type = 'swirl'; group = 'tectonic' }
  else { type = 'tectonic'; group = 'tectonic' }
  const key = clean(f.name_en)
  const featured = !!FEATURED_MOUNT[key]
  const priority = FEATURED_MOUNT[key] || Math.max(30, Math.min(58, 32 + Math.log2(Math.max(2, num(f.diameter_km) || 2)) * 4))
  addFeature({
    name, nameEn, type, group, lat: p.lat, lon: p.lon,
    diameter: num(f.diameter_km), elevation: num(f.elevation_km),
    origin: clean(f.name_origins), priority, featured,
  })
}

/* ---------------- 人类探测点 ---------------- */
const LANDINGS = [
  { id: 'luna-2', name: '月球2号', nameEn: 'Luna 2', country: '苏联', year: 1959, lat: 29.1, lon: 0, kind: '撞击', priority: 70, note: '人类首个抵达月球表面的人造物体。' },
  { id: 'ranger-9', name: '游骑兵9号', nameEn: 'Ranger 9', country: '美国', year: 1965, lat: -12.79, lon: -2.36, kind: '撞击', priority: 64, note: '撞击前传回 5,814 张月球电视图像。' },
  { id: 'luna-9', name: '月球9号', nameEn: 'Luna 9', country: '苏联', year: 1966, lat: 7.13, lon: -64.37, kind: '软着陆', priority: 88, note: '人类首次实现月面软着陆并传回月面照片。' },
  { id: 'surveyor-1', name: '测量员1号', nameEn: 'Surveyor 1', country: '美国', year: 1966, lat: -2.45, lon: -43.22, kind: '软着陆', priority: 78, note: '美国首个成功月面软着陆探测器。' },
  { id: 'surveyor-3', name: '测量员3号', nameEn: 'Surveyor 3', country: '美国', year: 1967, lat: -2.99, lon: -23.34, kind: '软着陆', priority: 74, note: '阿波罗12号宇航员后来访问了该探测器。' },
  { id: 'surveyor-5', name: '测量员5号', nameEn: 'Surveyor 5', country: '美国', year: 1967, lat: 1.42, lon: 23.2, kind: '软着陆', priority: 64 },
  { id: 'surveyor-6', name: '测量员6号', nameEn: 'Surveyor 6', country: '美国', year: 1967, lat: 0.53, lon: -1.4, kind: '软着陆', priority: 64, note: '首次在月面点火起飞并移动位置。' },
  { id: 'surveyor-7', name: '测量员7号', nameEn: 'Surveyor 7', country: '美国', year: 1968, lat: -40.86, lon: -11.47, kind: '软着陆', priority: 70 },
  { id: 'apollo-11', name: '阿波罗11号', nameEn: 'Apollo 11', country: '美国', year: 1969, lat: 0.674, lon: 23.473, kind: '载人着陆', priority: 100, aliases: ['静海基地', 'Tranquility Base'], note: '1969年7月20日，人类首次登月。着陆点被称为“静海基地”（Tranquility Base）；阿姆斯特朗留下第一个脚印。' },
  { id: 'apollo-12', name: '阿波罗12号', nameEn: 'Apollo 12', country: '美国', year: 1969, lat: -3.012, lon: -23.422, kind: '载人着陆', priority: 86, note: '精确着陆在测量员3号附近，并取回其部件。' },
  { id: 'apollo-14', name: '阿波罗14号', nameEn: 'Apollo 14', country: '美国', year: 1971, lat: -3.645, lon: -17.471, kind: '载人着陆', priority: 84 },
  { id: 'apollo-15', name: '阿波罗15号', nameEn: 'Apollo 15', country: '美国', year: 1971, lat: 26.132, lon: 3.634, kind: '载人着陆', priority: 92, note: '首次使用月球车，在哈德利月溪与亚平宁山脉附近考察。' },
  { id: 'apollo-16', name: '阿波罗16号', nameEn: 'Apollo 16', country: '美国', year: 1972, lat: -8.973, lon: 15.501, kind: '载人着陆', priority: 86 },
  { id: 'apollo-17', name: '阿波罗17号', nameEn: 'Apollo 17', country: '美国', year: 1972, lat: 20.191, lon: 30.772, kind: '载人着陆', priority: 94, note: '迄今最后一次载人登月，着陆于陶拉斯-利特罗峡谷。' },
  { id: 'luna-16', name: '月球16号', nameEn: 'Luna 16', country: '苏联', year: 1970, lat: -0.68, lon: 56.3, kind: '采样返回', priority: 78, note: '人类首次无人月面采样返回。' },
  { id: 'luna-17', name: '月球17号 / 月球车1号', nameEn: 'Luna 17 / Lunokhod 1', country: '苏联', year: 1970, lat: 38.28, lon: -35.0, kind: '巡视', priority: 82, note: '搭载人类第一辆月面遥控巡视器“月球车1号”。' },
  { id: 'luna-20', name: '月球20号', nameEn: 'Luna 20', country: '苏联', year: 1972, lat: 3.53, lon: 56.55, kind: '采样返回', priority: 68 },
  { id: 'luna-21', name: '月球21号 / 月球车2号', nameEn: 'Luna 21 / Lunokhod 2', country: '苏联', year: 1973, lat: 25.85, lon: 30.45, kind: '巡视', priority: 74, note: '月球车2号在月面行驶约 39 km。' },
  { id: 'luna-24', name: '月球24号', nameEn: 'Luna 24', country: '苏联', year: 1976, lat: 12.75, lon: 62.2, kind: '采样返回', priority: 72, note: '苏联最后一次月面采样返回任务。' },
  { id: 'change-1', name: '嫦娥一号', nameEn: "Chang'e 1", country: '中国', year: 2009, lat: -1.5, lon: 52.36, kind: '受控撞击', priority: 70, note: '中国首个月球探测器，任务末期受控撞击月面。' },
  { id: 'change-3', name: '嫦娥三号', nameEn: "Chang'e 3", country: '中国', year: 2013, lat: 44.12, lon: -19.51, kind: '软着陆 / 巡视', priority: 96, note: '中国首次月面软着陆，搭载“玉兔号”月球车。' },
  { id: 'change-4', name: '嫦娥四号', nameEn: "Chang'e 4", country: '中国', year: 2019, lat: -45.5, lon: 177.6, kind: '软着陆 / 巡视', priority: 100, note: '人类首次在月球背面软着陆，搭载“玉兔二号”月球车；依靠“鹊桥”中继星通信。' },
  { id: 'change-5', name: '嫦娥五号', nameEn: "Chang'e 5", country: '中国', year: 2020, lat: 43.058, lon: -51.916, kind: '采样返回', priority: 100, note: '在吕姆克山附近采集 1,731 g 月壤并返回地球。' },
  { id: 'change-6', name: '嫦娥六号', nameEn: "Chang'e 6", country: '中国', year: 2024, lat: -41.64, lon: -153.99, kind: '采样返回', priority: 100, note: '人类首次月球背面采样返回，着陆于南极-艾特肯盆地内的阿波罗盆地。' },
  { id: 'chandrayaan-3', name: '月船3号', nameEn: 'Chandrayaan-3', country: '印度', year: 2023, lat: -69.373, lon: 32.319, kind: '软着陆 / 巡视', priority: 94, note: '印度首次月面软着陆，着陆器“维克拉姆”与巡视器“普拉吉安”在月球南极附近工作。' },
  { id: 'slim', name: 'SLIM', nameEn: 'Smart Lander for Investigating Moon', country: '日本', year: 2024, lat: -13.316, lon: 25.251, kind: '软着陆', priority: 88, note: '日本“小型月着陆验证机”，实现高精度月面着陆。' },
  { id: 'luna-25', name: '月球25号', nameEn: 'Luna 25', country: '俄罗斯', year: 2023, lat: -57.865, lon: 61.36, kind: '撞击', priority: 64, note: '俄罗斯后苏联时代首个月球任务，着陆前坠毁。' },
  { id: 'beresheet', name: '创世纪号', nameEn: 'Beresheet', country: '以色列', year: 2019, lat: 32.6, lon: -19.5, kind: '撞击', priority: 62, note: '以色列首个月球任务，着陆失败撞月。' },
  { id: 'lunar-prospector', name: '月球探勘者', nameEn: 'Lunar Prospector', country: '美国', year: 1999, lat: -87.7, lon: 42.1, kind: '受控撞击', priority: 58 },
  { id: 'smart-1', name: 'SMART-1', nameEn: 'SMART-1', country: '欧洲', year: 2006, lat: -34.24, lon: -46.12, kind: '受控撞击', priority: 58 },
  { id: 'hiten', name: '飞天号', nameEn: 'Hiten', country: '日本', year: 1993, lat: -34.3, lon: 55.6, kind: '受控撞击', priority: 52 },
  { id: 'lcross', name: 'LCROSS', nameEn: 'LCROSS', country: '美国', year: 2009, lat: -84.675, lon: -48.725, kind: '受控撞击', priority: 66, note: '撞击卡比厄斯坑附近，探测到水冰证据。' },
  { id: 'chandrayaan-1-mip', name: '月船撞击探测器', nameEn: 'Chandrayaan-1 Moon Impact Probe', country: '印度', year: 2008, lat: -89.9, lon: 0, kind: '撞击', priority: 60 },
]
for (const l of LANDINGS) {
  addFeature({
    name: l.name, nameEn: l.nameEn, type: 'landing', group: 'landing',
    lat: l.lat, lon: l.lon, diameter: null, priority: l.priority,
    featured: true, country: l.country, year: l.year, kind: l.kind,
    origin: l.note || '', aliases: [l.nameEn, l.country + ' ' + l.year],
  })
}

/* ---------------- 手动补充地貌 ---------------- */
addFeature({
  id: 'south-pole-aitken',
  name: '南极-艾特肯盆地', nameEn: 'South Pole–Aitken Basin', type: 'basin', group: 'crater',
  lat: -53, lon: 169, diameter: 2500, priority: 100, featured: true,
  origin: '月球上最大、最古老的撞击盆地之一，直径约 2,500 km，位于月球背面南极附近。嫦娥六号采样区位于其内部的阿波罗盆地。',
})
// 阿波罗坑（Apollo）本身也被称为阿波罗盆地，是嫦娥六号着陆区所在的
// 南极-艾特肯盆地内的大型撞击构造，因此不再重复添加同位置的“阿波罗盆地”点。

/* ---------------- 审校修正（2026-10-18，独立地名审计） ---------------- */
// 参考站原始表沿用 IAU 的经典 UNKNOWN 控制网；对差异显著的大型地貌
// 以及 7 处明确的录入错误，按 IAU 当前 LOLA 2011 控制网校正。
// 其余要素的经典控制网差异 <0.3°，视觉上可忽略，保留并与参考站一致。
const COORD_FIX = {
  'Mare Moscoviense': { lat: 27.28, lon: 148.12 },
  'Mare Marginis': { lat: 12.70, lon: 86.52 },
  'Mare Spumans': { lat: 1.30, lon: 65.30 },
  'Lacus Odii': { lat: 19.22, lon: 7.27 },
  'South Pole–Aitken Basin': { lat: -53, lon: -169 },
  'Montes Cordillera': { lat: -19.44, lon: -94.93, diameter: 963.5 },
  'Mons Gruithuisen Delta': { lat: 36.07, lon: -39.59, diameter: 27.24 },
  'Stöfler': { lat: -41.10, lon: 6.0 },
  'Oceanus Procellarum': { lat: 20.67, lon: -56.68, diameter: 2592.24 },
  'Mare Imbrium': { lat: 34.72, lon: -14.91, diameter: 1145.53 },
  'Mare Fecunditatis': { lat: -7.83, lon: 53.67, diameter: 840.35 },
  'Mare Frigoris': { lat: 57.59, lon: -0.01, diameter: 1446.41 },
  'Mare Orientale': { lat: -19.87, lon: -94.67, diameter: 294.16 },
  'Mare Ingenii': { lat: -33.25, lon: 164.83, diameter: 282.2 },
  'Mare Smythii': { lat: -1.71, lon: 87.05, diameter: 373.97 },
  'Mare Australe': { lat: -47.77, lon: 91.99, diameter: 996.84 },
  'Mare Crisium': { diameter: 555.92 },
  'Clavius': { lat: -58.62, lon: -14.73 },
  'Alphonsus': { lat: -13.39, lon: -2.85 },
  'Bailly': { lat: -66.82, lon: -68.9 },
  'Petavius': { lat: -25.39, lon: 60.78 },
  'Tsiolkovskiy': { lat: -20.38, lon: 128.97 },
  'Apollo': { lat: -35.69, lon: -151.48 },
  'Hertzsprung': { lat: 1.37, lon: -128.66 },
  'Mendeleev': { lat: 5.38, lon: 141.17 },
  'Gagarin': { lat: -19.66, lon: 149.35 },
  'Montes Apenninus': { lat: 19.87, lon: 0.03, diameter: 599.67 },
  'Montes Alpes': { lat: 48.36, lon: -0.58, diameter: 334.48 },
  'Montes Caucasus': { lat: 37.52, lon: 9.93, diameter: 443.51 },
  'Mons Hadley': { lat: 26.69, lon: 4.12, diameter: 26.4 },
  'Vallis Alpes': { lat: 49.21, lon: 3.63, diameter: 155.42 },
  'Vallis Schröteri': { lat: 26.16, lon: -51.58, diameter: 185.32 },
  'Rima Hadley': { lat: 25.72, lon: 3.15, diameter: 116.09 },
  'Rupes Recta': { lat: -21.67, lon: -7.7, diameter: 115.95 }
}
const NAME_FIX = {
  'Mare Nectaris': ['酒海', '神酒海'],
  'Mare Orientale': ['东方海', '东海'],
  'Aristarchus': ['阿利斯塔克', '阿里斯塔克斯'],
  'Ptolemaeus': ['托勒玫', '托勒密'],
  'Theophilus': ['西奥菲勒斯', '狄奥菲勒斯'],
  'Vallis Alpes': ['阿尔卑斯月谷', '阿尔卑斯大峡谷'],
  'Vallis Schröteri': ['施洛特月谷', '施勒特尔月谷'],
  'Rima Hadley': ['哈德利月溪', '哈德利溪'],
  'Lunar Prospector': ['月球勘探者', '月球探勘者'],
  'Ranger 9': ['徘徊者9号', '游骑兵9号'],
  'Montes Carpatus': ['喀尔巴阡山脉', '喀尔巴仟山脉'],
  'Rimae Alphonsus': ['阿方索溪', '阿方索斯月溪'],
  'Rima Hyginus': ['希吉努斯溪', '许癸努斯月溪'],
  'Montes Haemus': ['海玛斯山脉', '海摩斯山脉'],
  'Rimae Triesnecker': ['特里斯内克尔月溪', '特里斯纳凯尔月溪'],
  'Janssen': ['让桑', '让森'],
  'Antoniadi': ['安东尼亚迪', '安东尼亚第'],
  'Montes Spitzbergen': ['施皮茨贝尔根山脉', '斯匹次卑尔根山脉'],
  'Fizeau': ['菲佐', '斐索'],
  'Promontorium Heraclides': ['赫拉克利德海角', '赫拉克利德岬'],
  'Fabricius': ['法布里休斯', '法布里修斯'],
  'Montes Harbinger': ['前锋山脉', '哈宾杰山脉'],
  'Rimae Littrow': ['利特罗夫溪', '利特罗月溪'],
  'Promontorium Agassiz': ['阿加西海角', '阿加西斯岬'],
  'Vallis Palitzsch': ['帕利奇谷', '帕雷泽西月谷'],
  'Palus Somni': ['梦沼', '睡沼'],
  'Promontorium Fresnel': ['菲涅尔海角', '菲涅耳岬'],
  'Rima Marius': ['马里乌斯溪', '马利厄斯月溪'],
  'Vallis Snellius': ['斯涅尔谷', '斯内利厄斯月谷'],
  'Lacus Luxuriae': ['华贵湖', '奢湖'],
  'Aitken': ['艾特肯', '艾托肯'],
  'Eratosthenes': ['厄拉多塞', '埃拉托色尼'],
  'Hipparchus': ['喜帕恰斯', '依巴谷'],
  'Surveyor 1': ['测量员1号', '探测者1号'],
  'Surveyor 3': ['测量员3号', '探测者3号'],
  'Surveyor 5': ['测量员5号', '探测者5号'],
  'Surveyor 6': ['测量员6号', '探测者6号'],
  'Surveyor 7': ['测量员7号', '探测者7号']
}
const EN_FIX = {
  'Smart Lander for Investigating Moon': { nameEn: 'SLIM', altName: 'Smart Lander for Investigating Moon' }
}
for (const f of features) {
  const cf = COORD_FIX[f.nameEn]
  if (cf) {
    if (typeof cf.lat === 'number') f.lat = cf.lat
    if (typeof cf.lon === 'number') f.lon = cf.lon
    if (typeof cf.diameter === 'number') f.diameter = cf.diameter
  }
  const nf = NAME_FIX[f.nameEn]
  if (nf) {
    const prevName = f.name
    const prevAlt = f.altName
    if (prevName !== nf[0]) {
      const oldAliases = Array.isArray(f.aliases) ? f.aliases : (f.aliases ? [f.aliases] : [])
      f.altName = prevName
      f.aliases = oldAliases.concat(prevAlt && prevAlt !== prevName ? [prevAlt] : [])
      f.name = nf[0]
    }
    if (nf[1] && nf[1] !== f.name) {
      const oldAliases = Array.isArray(f.aliases) ? f.aliases : (f.aliases ? [f.aliases] : [])
      f.aliases = oldAliases.concat([nf[1]])
    }
  }
  const ef = EN_FIX[f.nameEn]
  if (ef) {
    const oldAliases = Array.isArray(f.aliases) ? f.aliases : (f.aliases ? [f.aliases] : [])
    f.altName = f.altName || f.nameEn
    f.aliases = oldAliases.concat([f.nameEn])
    f.nameEn = ef.nameEn
    if (ef.altName) f.aliases = f.aliases.concat([ef.altName])
  }
}

/* ---------------- 输出 ---------------- */
for (const f of features) {
  if (Array.isArray(f.aliases)) {
    f.aliases = Array.from(new Set(f.aliases.filter(function (x) { return x && x !== f.name && x !== f.nameEn && x !== f.altName })))
  }
}
features.sort(function (a, b) { return (b.priority - a.priority) || String(a.name).localeCompare(String(b.name), 'zh'); })
const groupCounts = {}
const typeCounts = {}
for (const f of features) {
  groupCounts[f.group] = (groupCounts[f.group] || 0) + 1
  typeCounts[f.type] = (typeCounts[f.type] || 0) + 1
}
const data = {
  meta: {
    title: '月面三维地名图',
    subtitle: 'LUNAR 3D ATLAS · 三维可视化月球地图',
    generated: '2026-10-18',
    counts: { total: features.length, featured: features.filter(f => f.featured).length, groups: groupCounts, types: typeCounts },
    notes: {
      coordSystem: 'IAU 月球经纬度，东经为正（E+），单位：度。',
      coordinateBasis: '主体沿用嫦娥二号参考站的 IAU 经典（UNKNOWN）控制网；对差异显著的大型地貌与 7 处录入错误，已按 IAU 当前 LOLA 2011 控制网校正。',
      review: '2026-10-18 独立地名审计：核对任务指定 69 条 + 精选地名全量扫描；修正莫斯科海、界海、南极-艾特肯盆地、科迪勒拉山脉、格罗特胡森·德尔塔山、泡沫海、怨恨湖等 7 处显著错误，并规范部分中文译名。详见 qa_label_audit.md。',
      moonRadiusKm: 1737.4,
      sources: [
        { label: '嫦娥二号月球地图（地名与检索交互参考）', url: 'https://ce2.greensea.org/' },
        { label: 'IAU / USGS Gazetteer of Planetary Nomenclature', url: 'https://planetarynames.wr.usgs.gov/' },
        { label: '中文译名校核：中国天文学会天文学名词数据库', url: 'https://nadc.china-vo.org/astrodict/' },
        { label: 'NASA LRO 月球影像（Solar System Scope 纹理）', url: 'https://www.solarsystemscope.com/textures/' },
        { label: 'LRO LOLA/WAC GLD100 高程（Jaanga 镜像）', url: 'https://jaanga.github.io/moon/heightmaps/' },
        { label: 'Three.js', url: 'https://threejs.org/' },
      ],
    },
  },
  features,
}
fs.writeFileSync(path.join(ROOT, 'data/moon_atlas_data.json'), JSON.stringify(data))
fs.writeFileSync(path.join(ROOT, 'data/moon_atlas_data_pretty.json'), JSON.stringify(data, null, 2))
console.log('features', features.length, 'featured', data.meta.counts.featured)
console.log(groupCounts, typeCounts)
console.log('size', fs.statSync(path.join(ROOT, 'data/moon_atlas_data.json')).size)

// sanity: list featured by group
for (const g of Object.keys(groupCounts)) {
  console.log('\n==', g)
  console.log(features.filter(f => f.group === g && f.featured).map(f => `${f.name}(${f.nameEn}) ${f.priority}`).join(' · '))
}
