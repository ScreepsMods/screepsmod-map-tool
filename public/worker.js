importScripts('index.js')
importScripts('lodash.min.js')
importScripts('q.js')
self.q = self.Q

addEventListener('message', msg => {
  console.log('worker', msg)
  if (msg.data && msg.data.action == 'generate') {
    self.terrainCache = msg.data.terrainCache
    let [x, y] = utils.roomNameToXY(msg.data.room)
    let rx = x % 10
    let ry = y % 10
    if (rx < 0) rx++
    if (ry < 0) ry++
    let hall = !rx || !ry
    let center = rx == 5 && ry == 5
    let sk = !center && rx >= 4 && rx <= 6 && ry >= 4 && ry <= 6
    let normal = !sk && !center && !hall
    let type = normal ? 'normal' : (sk ? 'sk' : (center ? 'center' : 'hall'))
    let opts = {}
    let map = {
      normal: {
        controller: true
      },
      sk: {
        controller: false,
        sources: 3,
        keeperLairs: true
      },
      center: {
        controller: false,
        sources: 3
      },
      hall: {
        controller: false,
        mineral: false,
        terrainType: Math.floor(Math.random() * 2) + 1,
        swampType: 0,
        sources: 0
      }
    }
    opts = map[type]
    opts.wallChance = msg.data.wallChance
    generateRoom(msg.data.room, opts).then(room => {
      console.log(room)
      if (sk || center) {
        let min = room.objects.find(o => o.type == 'mineral')
        let {x, y} = min
        if (!room.objects.find(o => o.type == 'extractor')) {
          room.objects.push({ room: room.room, type: 'extractor', x, y, cooldown: 0 })
        }
      }
      postMessage({ action: 'generate', room, id: msg.data.id })
    }).catch(e => console.error(e))
  } else { postMessage({ test: '123' }) }
})

// terrain.forEach(r => {
//   if(r.objects.filter(o => o.type === 'extractor').length === 2) {
//     let ind =  r.objects.findIndex(o => o.type === 'extractor')
//     r.objects.splice(ind, 1)
//   }
// })
