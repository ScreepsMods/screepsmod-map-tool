window.terrain = []
window.q = window.Q
const mapSize = { x: 20, y: 10 }

let floodTolerance = 37

let generateOptions = {

}

let mp = { x: 0, y: 0 }
let mb = { left: false, right: false }
let md = { x: 0, y: 0 }
let vp = { x: 0, y: 0 }

let scale = 1
let flood = false

prefetch()
function prefetch () {
  let rooms = []
  getAllTerrain(true)
    .then(ts => {
      ts.map(t => {
        console.log(t)
        let { room } = t
        let [ x, y ] = utils.roomNameToXY(room)
        window.terrainCache[room] = Object.assign(t, {
          room,
          x,
          y,
          remote: true
        })
        window.terrain.push(window.terrainCache[room])
      })
    })
}

function previewTypes () {
  let queue = []
  for (let y = 0; y < 12; y++) {
    for (let x = 1; x <= 28; x++) {
      let room = utils.roomNameFromXY(x, y)
      queue.push({ room, terrainType: x })
      window.terrainCache[room] = null
    }
  }
  let proc = function () {
    let { room, terrainType } = queue.pop()
    gen(room, { terrainType })
    if (queue.length) setTimeout(proc, 100)
  }
  proc()
}

canvas.addEventListener('mousemove', e => {
  mp = { x: e.clientX, y: e.clientY }
  if (mb.left) {
    let { x, y, ovp } = mb.left
    let dx = mp.x - x
    let dy = mp.y - y
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      vp.x = ovp.x + dx
      vp.y = ovp.y + dy
      mb.left.drag = true
    }
  }
})

canvas.addEventListener('mousedown', e => {
  let btns = ['left', 'middle', 'right']
  let btn = btns[e.button] || 'right'
  let x = e.clientX
  let y = e.clientY
  mb[btn] = { x, y, ovp: Object.assign({}, vp) }
})

canvas.addEventListener('mouseup', e => {
  let room = utils.roomNameFromXY(cell.x, cell.y)
  let btns = ['left', 'middle', 'right']
  let btn = btns[e.button] || 'right'
  let { ctrlKey, shiftKey, altKey, metaKey } = e
  let { drag } = mb[btn]
  mb[btn] = {}
  if (drag) return
  if (btn == 'left') {
    if(ctrlKey) {
      generateSector(room)
    } else {
      gen(room)
    }
  }
  if (btn == 'middle') {
    flood = flood ? false : { x: e.clientX, y: e.clientY }
    console.log('flood', flood)
  }
  if (btn == 'right') {
    if (ctrlKey) {
      deleteSector(room)
    } else {
      terrainCache[room] = null
      let ind = terrain.findIndex(r => r.room == room)
      if (~ind) terrain.splice(ind, 1)
    }
  }
  e.preventDefault()
  return true
})

window.oncontextmenu = function (event) {
  event.preventDefault()
  event.stopPropagation()
  return false
}

let cell = {}

function render () {
  let canvas = document.getElementById('canvas')
  let ctx = canvas.getContext('2d')
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#555'
  ctx.fill()
  ctx.translate(vp.x, vp.y)
  // terrain.forEach(room => {
  //   renderTerrain(ctx, room)
  // })
  terrain.forEach(room => {
    renderRoom(ctx, room)
  })
  if (flood) {
    ctx.save()
    // console.log('fill', flood)
    ctx.fillStyle = 'rgba(0,255,0,1)'
    ctx.fillFlood(flood.x, flood.y, floodTolerance)
    ctx.restore()
  }
  {
    let { x, y } = mp
    x -= vp.x
    y -= vp.y
    if (x < 0) x -= 50 * scale
    if (y < 0) y -= 50 * scale
    let rx = x - x % (50 * scale)
    let ry = y - y % (50 * scale)
    cell = { x: rx / (50 * scale), y: ry / (50 * scale) }
    cell.room = utils.roomNameFromXY(cell.x, cell.y)
    ctx.beginPath()
    ctx.rect(rx, ry, (50 * scale), (50 * scale))
    ctx.strokeStyle = 'red'
    ctx.stroke()

    let { start, end } = getSectorBounds(cell.room)
    let s = 50 * scale
    ctx.beginPath()
    let w = Math.abs(end.x - start.x)
    let h = Math.abs(end.y - start.y)
    ctx.rect(start.x * s, start.y * s, w * s, h * s)
    ctx.strokeStyle = 'yellow'
    ctx.stroke()
  }
  ctx.restore()
  {
    ctx.save()
    ctx.translate(mp.x, mp.y)
    ctx.beginPath()
    ctx.rect(0, 0, 75, 60)
    ctx.fillStyle = '#333333'
    ctx.fill()
    ctx.font = '20px Roboto'
    ctx.fillStyle = 'white'
    ctx.fillText(cell.room, 5, 25)
    ctx.fillText(`(${cell.x},${cell.y})`, 5, 45)
    let room = terrain.find(t => t.room == cell.room)
    ctx.restore()
  }
}

let imageCache = {}
function renderRoom (ctx, room) {
  if (!room.terrain) return
  let img = imageCache[room.terrain + scale] = imageCache[room.terrain + scale] || utils.writeTerrainToPng(room.terrain, scale >= 3)
  let rx = room.x * 50 * scale
  let ry = room.y * 50 * scale
  ctx.putImageData(img, vp.x + rx, vp.y + ry)
  if (flood) return
  if (room.status !== 'normal') {
    ctx.save()
    ctx.beginPath()
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(rx, ry, 50 * scale, 50 * scale)
    ctx.restore()
  }
  if (showWalls.checked && room.exits) {
    ctx.save()
    ctx.beginPath()
    let x2 = rx + (50 * scale)
    let y2 = ry + (50 * scale)
    ctx.moveTo(rx, ry)
    ctx[room.exits.top ? 'moveTo' : 'lineTo'](x2, ry)
    ctx[room.exits.right ? 'moveTo' : 'lineTo'](x2, y2)
    ctx[room.exits.bottom ? 'moveTo' : 'lineTo'](rx, y2)
    ctx[room.exits.left ? 'moveTo' : 'lineTo'](rx, ry)
    ctx.strokeStyle = 'red'
    ctx.stroke()
    ctx.restore()
    return
  }
  room.objects.forEach(o => {
    ctx.save()
    let colors = {
      source: 'yellow',
      keeperLair: 'red',
      mineral: 'gray',
      controller: 'lightGray',
      L: ['#3F6147', '#89F4A5'],
      U: ['#1B617F', '#88D6F7'],
      K: ['#331A80', '#9370FF'],
      Z: ['#594D33', '#F2D28B'],
      X: ['#4F2626', '#FF7A7A'],
      H: ['#4D4D4D', '#CCCCCC'],
      O: ['#4D4D4D', '#CCCCCC']
    }
    let x = rx + (o.x * scale)
    let y = ry + (o.y * scale)
    ctx.beginPath()
    ctx.rect(x, y, scale, scale)
    ctx.fillStyle = colors[o.type] || 'blue'
    ctx.fill()
    if (o.type === 'mineral') {
      let [primary, secondary] = colors[o.mineralType].map(c => hexToRGB(c, 0.6))
      ctx.beginPath()
      ctx.arc(rx + (25 * scale), ry + (25 * scale), 10 * scale, 0, Math.PI * 2)
      ctx.fillStyle = primary
      ctx.fill()
      ctx.strokeStyle = secondary
      ctx.lineWidth = 2 * scale
      ctx.stroke()
      ctx.font = `${scale * 16}px Roboto`
      let off = ctx.measureText(o.mineralType)
      ctx.fillStyle = secondary
      ctx.fillText(o.mineralType, rx + (25 * scale) - (off.width / 2), ry + (25 * scale) + (scale * 6))
    }
    ctx.restore()
  })
}
function hexToRGB (hex, opacity = 1) {
  let v = parseInt(hex.slice(1), 16)
  let r = (v & 0xFF0000) >> 16
  let g = (v & 0x00FF00) >> 8
  let b = (v & 0x0000FF) >> 0
  return `rgba(${r},${g},${b},${opacity})`
}
function loop () {
  requestAnimationFrame(loop)
  render()
}
loop()

function resize () {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}
resize()
window.addEventListener('resize', resize)

let pool = {
  count: 5,
  workers: [],
  idle: [],
  active: [],
  queue: [],
  cbs: {}
}
setInterval(() => {
  while (pool.idle.length && pool.queue.length) {
    let worker = pool.idle.pop()
    let job = pool.queue.pop()
    worker.postMessage(job)
  }
}, 100)

function gen (room) {
  let ind = window.terrain.findIndex(r => r.room === room)
  if (~ind) {
    window.terrain.splice(ind, 1)
  }
  let opts = generateOptions
  // worker.postMessage({ action: 'generate', room, terrainCache, opts })
  let id = Math.random().toString(36).slice(2)
  pool.queue.unshift({ action: 'generate', room, terrainCache, opts, id, wallChance: parseInt(document.querySelector('[name=wallChance]').value) / 100 })
  return new Promise((resolve, reject) => {
    pool.cbs[id] = { resolve, reject }
  })
}

for (let i = 0; i < pool.count; i++) {
  let worker = new Worker('worker.js')
  worker.addEventListener('message', msg => {
    if (pool.idle.indexOf(worker) === -1) {
      pool.idle.push(worker)
    }
    console.log(msg)
    if (msg.data.action === 'generate') {
      let r = msg.data.room
      if (r.opts) {
        let { exits } = r.opts
        delete r.opts
        r.exits = {}
        for (let dir in exits) {
          r.exits[dir] = !!exits[dir].length
        }
      }
      window.terrain.push(r)
      window.terrainCache[r.room] = r
      console.log(r)
      output.value = JSON.stringify(terrain.filter(r => !r.remote))
    }
    let { id } = msg.data
    if (id && pool.cbs[id]) {
      pool.cbs[id].resolve(msg)
      delete pool.cbs[id]
    }
  })
  pool.workers.push(worker)
  worker.postMessage({ action: 'ping' })
}

function save (active) {
  if (!prompt('Are you sure you want to save?')) return
  terrain.forEach(r => r.status = r.status || (active ? 'normal' : 'out of borders'))
  let json = JSON.stringify(terrain.filter(r => !r.remote))
  fetch(`${server}/api/maptool/set`, {
    method: 'POST',
    body: json,
    headers: {
      'content-type': 'application/json'
    },
    credentials: 'same-origin'
  })
}

function makeNovice () {
  let t = Date.now() + 1 * 60 * 60 * 1000
  let d = new Date()
  d.setMonth(7)
  d.setDate(1)
  d = d.getTime()
  terrain.forEach((r) => {
    let { room, objects } = r
    r.objects = r.objects.filter(o => o.type != 'constructedWall')
    if (room.match(/0S/) || room.match(/0$/)) {
      r.bus = true
      let x, y
      for (let i = 0; i < 50; i++) {
        if (room.match(/^E0S1[1-9]$/)) {
          x = 49
          y = i
        }
        if (room.match(/^E10S1[1-9]$/)) {
          x = 0
          y = i
        }
        if (room.match(/^E[1-9]S10$/)) {
          x = i
          y = 49
        }
        if (room.match(/^E[1-9]S20$/)) {
          x = i
          y = 0
        }
        r.objects.push({ type: 'constructedWall', room, x, y, decayTime: { timestamp: d }})
      }
    }
    if (!r.bus) {
      r.novice = d
    }
    delete r.remote
    r.openTime = t
  })
}

function findBounds () {
  const solidTerrain = '1'.repeat(2500)
  let start = { x: 100, y: 100 }
  let end = { x: -100, y: -100 }
  terrain.forEach(r => {
    if (r.terrain === solidTerrain) return // Skip solid rooms
    start.x = Math.min(start.x, r.x)
    start.y = Math.min(start.y, r.y)
    end.x = Math.max(end.x, r.x)
    end.y = Math.max(end.y, r.y)
  })
  return { start, end }
}

function generateSolidWall () {
  let { start, end } = findBounds ()
  for (let x = start.x - 1; x <= end.x + 1; x++) {
    for (let y = start.y - 1; y <= end.y + 1; y++) {
      let room = terrain.find(r => r.x === x && r.y === y)
      if (!room) {
        makeSolidRoom(x, y)
      }
    }
  }
  
  // let start = { x: 0, y: 0 }
  // let end = mapSize

  // for (let x = start.x - 1; x <= end.x + 1; x++) {
  //   makeSolidRoom(x, start.y - 1)
  //   makeSolidRoom(x, end.y + 1)
  // }
  // for (let y = start.y; y <= end.y; y++) {
  //   makeSolidRoom(start.x - 1, y)
  //   makeSolidRoom(end.x + 1, y)
  // }
}

function makeSolidRoom (x, y) {
  let room = utils.roomNameFromXY(x, y)
  let terrain = '1'.repeat(2500)
  let objects = []
  let status = 'out of borders'
  let obj = { room, x, y, terrain, objects, status }
  let data = window.terrain.find(r => r.x === x && r.y === y)
  if (data) Object.assign(data, obj)
  else window.terrain.push(obj)
}

function getSectorBounds(room) {
  let [x, y] = utils.roomNameToXY(room)
  let sx = x - (x % 10) + 1
  let sy = y - (y % 10) + 1
  if(x < 0) sx -= 11
  if(y < 0) sy -= 11
  let start = { x: sx, y: sy }
  let end = { x: sx + 9, y: sy + 9 }
  return { start, end }
}

async function generateSector (room) {
  let p1 = []
  let p2 = []
  let { start, end } = getSectorBounds(room)
  for (let x = start.x - 1; x < end.x + 1; x++) {
    for (let y = start.y - 1; y < end.y + 1; y++) {
      let room = utils.roomNameFromXY(x, y)
      if (x % 2 === y % 2) {
        p1.push(room)
      } else {
        p2.push(room)
      }
      let ind = terrain.findIndex(r => r.room === room)
      if (~ind) terrain.splice(ind, 1)
    }
  }
  console.log(sx, sy, start, end, p1, p2)
  await Promise.all(p1.map(room => gen(room)))
  await Promise.all(p2.map(room => gen(room)))
}


function deleteSector (room) {
  let p1 = []
  let p2 = []
  let { start, end } = getSectorBounds(room)
  for (let x = start.x; x < end.x; x++) {
    for (let y = start.y; y < end.y; y++) {
      makeSolidRoom(x, y)
    }
  }
}

function createGrid () {
  let nodes = []
  let edges = []
  let rooms = []
  let xyToInd = (x, y) => ((y - 1) * 9) + x
  for (let y = 1; y < 10; y++) {
    for (let x = 1; x < 10; x++) {
      nodes.push({ x, y })
      if (x < 9) {
        edges.push([
          xyToInd(x + 0, y + 0),
          xyToInd(x + 1, y + 0)
        ])
      }
      if (y < 9) {
        edges.push([
          xyToInd(x + 0, y + 0),
          xyToInd(x + 0, y + 1)
        ])
      }
      rooms.push([
        xyToInd(x + 0, y + 0),
        xyToInd(x + 1, y + 0),
        xyToInd(x + 1, y + 1),
        xyToInd(x + 0, y + 1)
      ])
    }
  }
}

// terrain.forEach(t => {
//   t.remote = true
//   t.objects = t.objects.map((o, i) => {
//     if (o.type === 'controller') {
//       let { type, room, x, y } = o
//       t.remote = false
//       return { type, room, x, y, level: 0 }
//     }
//     if (o.type === 'spawn') {
//       t.remote = false
//       return null
//     }
//     return o
//   }).filter(o => o)
// })
