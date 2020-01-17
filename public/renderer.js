window.terrain = []
window.q = window.Q

let floodTolerance = 37

let generateOptions = {}

let mp = {x: 0, y: 0}
let mb = {left: false, right: false}
let vp = {x: 0, y: 0, z: 1}

let scale = 1
let flood = false

let overlay = ''
let currentTool = 'gen'

function getTool () {
  return tools[currentTool]
}

prefetch()

function prefetch () {
  getAllTerrain(true)
    .then(ts => {
      ts.map(t => {
        let {room} = t
        let [x, y] = utils.roomNameToXY(room)
        window.terrainCache[room] = Object.assign(t, {
          room,
          x,
          y,
          remote: true
        })
        window.terrain.push(window.terrainCache[room])
      })
      console.log('Rooms loaded')
    })
}

function previewTypes () {
  let queue = []
  for (let y = 0; y < 12; y++) {
    for (let x = 1; x <= 28; x++) {
      let room = utils.roomNameFromXY(x, y)
      queue.push({room, terrainType: x})
      window.terrainCache[room] = null
    }
  }
  let proc = function () {
    let {room, terrainType} = queue.pop()
    gen(room, {terrainType})
    if (queue.length) setTimeout(proc, 100)
  }
  proc()
}

canvas.addEventListener('mousewheel', e => {
  const oldScale = scale
  if (e.deltaY > 0 && scale > 1) scale--
  if (e.deltaY < 0 && scale < 8) scale++
  if (oldScale !== scale) {
    mp = {x: e.clientX, y: e.clientY}
    let [x, y] = [-vp.x, -vp.y]
    x += mp.x
    y += mp.y
    x /= oldScale
    y /= oldScale
    x *= scale
    y *= scale
    x -= mp.x
    y -= mp.y
    vp.x = -x
    vp.y = -y
  }
  // if (mb.left) {
  //   let { x, y, ovp } = mb.left
  //   let dx = mp.x - x
  //   let dy = mp.y - y
  //   if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
  //     vp.x = ovp.x + dx
  //     vp.y = ovp.y + dy
  //     mb.left.drag = true
  //   }
  // }
})

canvas.addEventListener('mousemove', e => {
  let [x, y] = [e.clientX, e.clientY]
  x -= vp.x
  y -= vp.y
  if (x < 0) x -= 50 * scale
  if (y < 0) y -= 50 * scale
  let rx = Math.floor((x / scale) % 50)
  let ry = Math.floor((y / scale) % 50)
  mp = {x: e.clientX, y: e.clientY, rx, ry}
  if (mb.left) {
    let {x, y, ovp} = mb.left
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
  mb[btn] = {x, y, ovp: Object.assign({}, vp)}
})

const tools = {
  gen: [
    {key: 'left', action: ({room}) => gen(room)},
    {key: 'ctrl+left', action: ({room}) => generateSector(room)},
    {
      key: 'middle',
      action: ({e}) => {
        flood = flood ? false : {x: e.clientX, y: e.clientY}
      }
    },
    {
      key: 'right',
      action: ({room}) => {
        terrainCache[room] = null
        let ind = terrain.findIndex(r => r.room === room)
        if (~ind) terrain.splice(ind, 1)
      }
    },
    {key: 'ctrl+right', action: ({room}) => deleteSector(room)}
  ],
  edit: [
    {key: 'left', action: ({room, x, y}) => editTerrain(room, x, y, 'wall')},
    {key: 'middle', action: ({room, x, y}) => editTerrain(room, x, y, 'swamp')},
    {key: 'right', action: ({room, x, y}) => editTerrain(room, x, y, 'plain')}
  ]
}

function editTerrain (room, x, y, type) {
  const map = ['plain', 'wall', 'swamp']
  type = map.indexOf(type)
  const r = terrain.find(r => r.name === room)
  const ind = x + (y * 50)
  const part1 = r.terrain.slice(0, ind)
  const part2 = r.terrain.slice(ind + 1)
  r.terrain = terrainCache[room].terrain = part1 + type + part2
  r.remote = false
}

canvas.addEventListener('mouseup', e => {
  let room = utils.roomNameFromXY(cell.x, cell.y)
  let btns = ['left', 'middle', 'right']
  let btn = btns[e.button] || 'right'
  let {ctrlKey, shiftKey, altKey, metaKey} = e
  let {drag} = mb[btn]
  mb[btn] = {}
  if (drag) return
  const keys = []
  if (ctrlKey) keys.unshift('ctrl')
  if (shiftKey) keys.unshift('shift')
  if (altKey) keys.unshift('alt')
  if (metaKey) keys.unshift('meta')
  keys.push(btn)
  const key = keys.join('+')
  const tool = getTool()
  if (tool) {
    const {action} = tool.find(t => t.key === key) || {}
    if (action) {
      action({
        room,
        x: mp.rx,
        y: mp.ry,
        e
      })
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

function isInView (x, y, w, h) {
  const canvas = document.getElementById('canvas')
  const l1 = {x, y}
  const r1 = {x: x + w, y: y + h}
  const l2 = {x: -vp.x, y: -vp.y}
  const r2 = {x: -vp.x + canvas.width, y: -vp.y + canvas.height}
  if (l1.x > r2.x || l2.x > r1.x) return false
  if (l1.y > r2.y || l2.y > r1.y) return false
  return true
}

function render () {
  let canvas = document.getElementById('canvas')
  let ctx = canvas.getContext('2d')
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#555'
  ctx.fill()
  ctx.translate(vp.x, vp.y)
  terrain.forEach(room => {
    if (!isInView(room.x * 50 * scale, room.y * 50 * scale, 50 * scale, 50 * scale)) {
      return // console.log('skipped', room)
    }
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
    let {x, y} = mp
    x -= vp.x
    y -= vp.y
    if (x < 0) x -= 50 * scale
    if (y < 0) y -= 50 * scale
    let rx = x - x % (50 * scale)
    let ry = y - y % (50 * scale)
    cell = {x: rx / (50 * scale), y: ry / (50 * scale)}
    cell.room = utils.roomNameFromXY(cell.x, cell.y)
    ctx.beginPath()
    ctx.rect(rx, ry, (50 * scale), (50 * scale))
    ctx.strokeStyle = 'red'
    ctx.stroke()

    let {start, end} = getSectorBounds(cell.room)
    let s = 50 * scale
    ctx.beginPath()
    let w = Math.abs(end.x - start.x)
    let h = Math.abs(end.y - start.y)
    // if (start.x >= 0) start.x += 1
    // if (start.y >= 0) start.y += 1
    ctx.rect(start.x * s, start.y * s, w * s, h * s)
    ctx.strokeStyle = 'yellow'
    ctx.stroke()
  }
  ctx.restore()
  {
    ctx.save()
    ctx.translate(mp.x, mp.y)
    ctx.beginPath()
    ctx.rect(0, 0, 75, 80)
    ctx.fillStyle = '#333333'
    ctx.fill()
    ctx.font = '20px Roboto'
    ctx.fillStyle = 'white'
    ctx.fillText(cell.room, 5, 25)
    ctx.fillText(`(${cell.x},${cell.y})`, 5, 45)
    let {x, y} = mp
    x -= vp.x
    y -= vp.y
    if (x < 0) x -= 50 * scale
    if (y < 0) y -= 50 * scale
    let rx = (50 + Math.floor((x / scale) % 50)) % 50
    let ry = (50 + Math.floor((y / scale) % 50)) % 50
    ctx.fillText(`(${rx},${ry})`, 5, 65)
    ctx.restore()
  }
  if (currentTool === 'edit') {
    ctx.save()
    ctx.translate(vp.x, vp.y)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    let [xo, yo] = [
      Math.floor(Math.abs(vp.x % scale)),
      Math.floor(Math.abs(vp.y % scale))
    ]

    let x = (mp.rx * scale) + (cell.x * scale) // (mp.x + xo)
    let y = (mp.ry * scale) + (cell.y * scale) // (mp.y + yo)
    ctx.beginPath()
    ctx.rect(x, y, scale, scale)
    ctx.fill()
    ctx.restore()
  }
  if (overlay) {
    ctx.save()
    ctx.font = `32px Roboto`
    ctx.fillStyle = 'red'
    ctx.fillText(overlay, 10, 50)
    // const { width } = ctx.measureText(overlay)
    ctx.restore()
  }
}

let imageCache = {}

function renderRoom (ctx, room) {
  if (!room.terrain) return
  let img = imageCache[room.terrain + scale] = imageCache[room.terrain + scale] || utils.writeTerrainToPng(room.terrain, scale)
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
  let mineral = ''
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
  room.objects.forEach(o => {
    ctx.save()
    let x = rx + (o.x * scale)
    let y = ry + (o.y * scale)
    ctx.beginPath()
    ctx.rect(x, y, scale, scale)
    ctx.fillStyle = colors[o.type] || 'blue'
    ctx.fill()
    if (o.type === 'mineral') {
      mineral = o.mineralType
    }
    ctx.restore()
  })
  if (mineral) {
    if (!imageCache[mineral + scale]) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = 50 * scale
      canvas.height = 50 * scale
      let [primary, secondary] = colors[mineral].map(c => hexToRGB(c, 0.6))
      ctx.beginPath()
      ctx.arc(25 * scale, 25 * scale, 10 * scale, 0, Math.PI * 2)
      ctx.fillStyle = primary
      ctx.fill()
      ctx.strokeStyle = secondary
      ctx.lineWidth = 2 * scale
      ctx.stroke()
      ctx.font = `${scale * 16}px Roboto`
      let off = ctx.measureText(mineral)
      ctx.fillStyle = secondary
      ctx.fillText(mineral, (25 * scale) - (off.width / 2), (25 * scale) + (scale * 6))
      imageCache[mineral + scale] = canvas
    }
    ctx.drawImage(imageCache[mineral + scale], rx, ry)
  }
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
  delete terrainCache[room]
  let opts = generateOptions
  // worker.postMessage({ action: 'generate', room, terrainCache, opts })
  let id = Math.random().toString(36).slice(2)
  pool.queue.unshift({
    action: 'generate',
    room,
    terrainCache,
    opts,
    id,
    wallChance: parseInt(document.querySelector('[name=wallChance]').value) / 100
  })
  return new Promise((resolve, reject) => {
    pool.cbs[id] = {resolve, reject}
  })
}

for (let i = 0; i < pool.count; i++) {
  let worker = new Worker('worker.js')
  worker.addEventListener('message', msg => {
    if (pool.idle.indexOf(worker) === -1) {
      pool.idle.push(worker)
    }
    //console.log(msg)
    if (msg.data.action === 'generate') {
      let r = msg.data.room
      if (r.opts) {
        let {exits} = r.opts
        delete r.opts
        r.exits = {}
        for (let dir in exits) {
          r.exits[dir] = !!exits[dir].length
        }
      }
      window.terrain.push(r)
      window.terrainCache[r.room] = r
      //console.log(r)
      output.value = JSON.stringify(terrain.filter(r => !r.remote))
    }
    let {id} = msg.data
    if (id && pool.cbs[id]) {
      pool.cbs[id].resolve(msg)
      delete pool.cbs[id]
    }
  })
  pool.workers.push(worker)
  worker.postMessage({action: 'ping'})
}

function save (active) {
  if (!confirm('Are you sure you want to save?')) return
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
    let {room, objects} = r
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
        r.objects.push({type: 'constructedWall', room, x, y, decayTime: {timestamp: d}})
      }
    }
    if (!r.bus) {
      r.novice = d
    }
    delete r.remote
    r.openTime = t
  })
}

function getSectorBoundsAllBus (roomInSector) {
  let [x, y] = utils.roomNameToXY(roomInSector)
  if (x < 0) x -= 9
  if (y < 0) y -= 9
  let sx = x - (x % 10)
  let sy = y - (y % 10)
  let start = {x: sx, y: sy}
  let end = {x: sx + 10, y: sy + 10}
  if (x < 0 && y > -1) {
    //wxsx
    start.x -= 1
    end.y += 1
  } else if (x < 0 && y < 0) {
    //wxnx
    start.x -= 1
    start.y -= 1
  } else if (x > -1 && y < 0) {
    //exnx
    start.y -= 1
    end.x += 1
  } else {
    //exsx
    end.x += 1
    end.y += 1
  }
  return {start, end}
}

function makeRespawnSectorWall (room, borderSide, decayTime) {
  let x, y
  for (let i = 0; i < 50; i++) {
    switch (borderSide) {
      //borderSide is related to the sector side not the room side
      case 'left':
        x = 49
        y = i
        break
      case 'right':
        x = 0
        y = i
        break
      case 'top':
        x = i
        y = 49
        break
      case 'bottom':
        x = i
        y = 0
        break
    }
    if (x !== undefined && y !== undefined) {
      room.objects.push({type: 'constructedWall', room: room.room, x, y, decayTime: {timestamp: decayTime}})
    }
  }
}

function makeRespawnSector (roomInSector, openTime, decayTime) {
  //default to opening in 1 minute
  if (openTime === undefined) { openTime = Date.now() + (1 * 1000 * 60) }
  //default to decaying in 7 days
  if (decayTime === undefined) {
    decayTime = new Date()
    decayTime.setDate(decayTime.getDate() + 7)
    decayTime = decayTime.getTime()
  }

  let {start, end} = getSectorBoundsAllBus(roomInSector)

  for (let x = start.x; x < end.x; x++) {
    for (let y = start.y; y < end.y; y++) {

      let room = terrain.find(r => r.x == x && r.y == y)
      room.remote = false
      room.status = 'normal'

      let [, hor, horx, ver, very] = room.name.match(/^(\w)(\d+)(\w)(\d+)$/)

      if (horx % 10 == 0 || very % 10 == 0) {
        room.bus = true
        if (x == start.x && y > start.y && y < (start.y + 10)) {
          makeRespawnSectorWall(room, 'left', decayTime)
        } else if (x == (start.x + 10) && y > start.y && y < (start.y + 10)) {
          makeRespawnSectorWall(room, 'right', decayTime)
        } else if ((y == start.y && x > start.x && x < (start.x + 10))) {
          makeRespawnSectorWall(room, 'top', decayTime)
        } else if ((y == (start.y + 10) && x > start.x && x < (start.x + 10))) {
          makeRespawnSectorWall(room, 'bottom', decayTime)
        }
      } else {
        room.respawnArea = decayTime
        room.openTime = openTime
      }

    }
  }
}

function findBounds () {
  const solidTerrain = '1'.repeat(2500)
  let start = {x: 100, y: 100}
  let end = {x: -100, y: -100}
  terrain.forEach(r => {
    if (r.terrain === solidTerrain) return // Skip solid rooms
    start.x = Math.min(start.x, r.x)
    start.y = Math.min(start.y, r.y)
    end.x = Math.max(end.x, r.x)
    end.y = Math.max(end.y, r.y)
  })
  return {start, end}
}

function generateSolidWall () {
  let {start, end} = findBounds()
  for (let x = start.x - 1; x <= end.x + 1; x++) {
    for (let y = start.y - 1; y <= end.y + 1; y++) {
      let room = terrain.find(r => r.x === x && r.y === y)
      if (!room) {
        makeSolidRoom(x, y)
      }
    }
  }

  // let start = { x: 

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
  let obj = {room, x, y, terrain, objects, status}
  let data = window.terrain.find(r => r.x === x && r.y === y)
  if (data) Object.assign(data, obj)
  else window.terrain.push(obj)
}

function getSectorBounds (room) {
  let [x, y] = utils.roomNameToXY(room)
  if (x < 0) x -= 9
  if (y < 0) y -= 9
  let sx = x - (x % 10)
  let sy = y - (y % 10)
  let start = {x: sx, y: sy}
  let end = {x: sx + 10, y: sy + 10}
  return {start, end}
}

async function generateSector (room) {
  let p1 = []
  let p2 = []
  let {start, end} = getSectorBounds(room)
  if (start.x < 0) {
    start.x -= 1
    end.x -= 1
  }
  if (start.y < 0) {
    start.y -= 1
    end.y -= 1
  }
  for (let x = start.x; x < end.x + 1; x++) {
    for (let y = start.y; y < end.y + 1; y++) {
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
  // console.log(sx, sy, start, end, p1, p2)
  await Promise.all(p1.map(room => gen(room)))
  await Promise.all(p2.map(room => gen(room)))
}

function deleteSector (room) {
  let p1 = []
  let p2 = []
  let {start, end} = getSectorBounds(room)
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
      nodes.push({x, y})
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

async function autoGen (sizex, sizey) {
  if (sizex % 2 !== 0 || sizey % 2 !== 0) {
    alert(`autoGen aborted!\nautoGen requires even numbers for width and height`)
    return
  }
  if (!confirm('Warning: Auto Gen erases all current rooms, are you sure?')) return
  terrain.splice(0, Number.MAX_VALUE)
  for (const k of Object.keys(terrainCache)) {
    delete terrainCache[k]
  }
  const hw = sizex / 2
  const hh = sizey / 2
  const rooms = new Set()
  for (let sy = -hh - 1; sy <= hh; sy++) {
    const startx = (-hw * 10) - 1
    const endx = (hw * 10)
    let y = sy * 10
    if (y < 0) y += 9
    for (let x = startx; x < endx; x++) {
      rooms.add(utils.roomNameFromXY(x, y))
    }
  }
  for (let sx = -hw - 1; sx <= hw; sx++) {
    const starty = (-hh * 10) - 1
    const endy = (hh * 10) + 1
    let x = sx * 10
    if (x < 0) x += 9
    for (let y = starty; y < endy; y++) {
      rooms.add(utils.roomNameFromXY(x, y))
    }
  }

  for (let ry = -hh * 10; ry <= hh * 10; ry++) {
    const startx = (-hw * 10) - 1
    const endx = (hw * 10)
    let y = ry
    for (let x = startx; x < endx; x++) {
      const r = utils.roomNameFromXY(x, y)
      if (!rooms.has(r)) {
        rooms.add(r)
      }
    }
  }

  const q1 = []
  const q2 = []
  for (const roomName of rooms) {
    const [x, y] = utils.roomNameToXY(roomName)
    // makeSolidRoom(x, y)
    if (q1.length === q2.length) {
      q1.push(roomName)
    } else {
      q2.push(roomName)
    }
  }
  let complete = 0
  let total = q1.length + q2.length
  let stage = 'rooms'
  let update = () => {
    complete++
    overlay = `Generating ${stage} ${complete} of ${total} completed`
    console.log(overlay)
  }
  const ps = []
  for (const roomName of q1) {
    ps.push(gen(roomName).then(update))
  }
  await Promise.all(ps)
  ps.splice(0, Number.MAX_VALUE)
  for (const roomName of q2) {
    ps.push(gen(roomName).then(update))
  }
  await Promise.all(ps)

  generateSolidWall()
  overlay = ''
  alert('autoGen completed successfully')
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

function getExits (room) {
  const ret = {
    top: '',
    bottom: '',
    left: '',
    right: ''
  }
  const t = room.length === 2500 ? room : terrain.find(r => r.room === room).terrain
  for (let i = 0; i < 50; i++) {
    ret.top += t[i]
    ret.bottom += t[(50 * 49) + i]
    ret.left += t[i * 50]
    ret.right += t[(i * 50) + 49]
  }
  ret.top = ret.top.replace(/2/g, '0').replace(/3/g, '1')
  ret.bottom = ret.bottom.replace(/2/g, '0').replace(/3/g, '1')
  ret.left = ret.left.replace(/2/g, '0').replace(/3/g, '1')
  ret.right = ret.right.replace(/2/g, '0').replace(/3/g, '1')
  return ret
}

async function fixExits () {
  const found = new Set()
  const wall = '1'.repeat(2500)
  const ps = []
  for (const room of terrain) {
    if (room.terrain === wall) continue
    if (found.has(room.room)) continue
    const exits = getExits(room.terrain)
    const {x, y} = room
    const offs = [
      ['left', 'right', -1, 0],
      ['right', 'left', 1, 0],
      ['top', 'bottom', 0, -1],
      ['bottom', 'top', 0, 1]
    ]
    const forceGen = new Set()
    for (const [dir, rdir, xo, yo] of offs) {
      const r = terrain.find(r => r.x === (x + xo) && r.y === (y + yo))
      if (r && r.terrain !== wall && !found.has(r)) {
        const nexits = getExits(r.terrain)
        if (exits[dir] !== nexits[rdir]) {
          console.log(`Found mismatch:\n  ${dir} ${room.room} ${exits[dir]}\n  ${rdir} ${r.room} ${nexits[rdir]}`)
          // forceGen.add(room.room)
          forceGen.add(r.room)
          found.add(room.room)
          found.add(r.room)
        }
      }
    }
    for (const r of forceGen) {
      delete terrainCache[r]
    }
    ps.push((async () => {
      for (const r of forceGen) {
        await gen(r)
      }
    })())
  }
  console.log(`Found ${found.size} rooms with mismatched exits`)
  await Promise.all(ps)
  if (found.size) await fixExits()
}

async function fixFloating () {
  const rooms = terrain.filter(r => {
    const obj = r.objects.find(o => r.terrain[o.x + (o.y * 50)] != '1' && ['controller', 'mineral', 'source', 'keeperLair'].includes(o.type))
    return !!obj
  })
  console.log(`Found ${rooms.length} rooms with unsupported structures`)
  await Promise.all(rooms.map(r => gen(r.room)))
}

async function fixDups () {
  const rooms = terrain
    .filter(r => {
      const types = _.groupBy(r.objects, 'type')
      if (types.controller && types.controller.length > 1) return true
      if (types.mineral && types.mineral.length > 1) return true
      if (types.source && types.source.length > (types.controller ? 2 : 3)) return true
      if (types.keeperLair && types.keeperLair.length > 4) return true
      return false
    })
  await Promise.all(rooms.map(r => gen(r.room)))
  console.log(`Found ${rooms.length} rooms with too many objects`)
}

async function fixAll () {
  if (!confirm('Warning: Fix All is a destructive process. Rooms will be forcibly regenerated. Are you sure you want to continue?')) return
  for (const room of terrain) {
    room.terrain = room.terrain.replace(/3/g, '1')
  }
  await fixFloating()
  await fixDups()
  await fixExits()
  console.log(`All rooms fixed. Run save to apply.`)
  alert(`All rooms fixed. Run save to apply.`)
}
