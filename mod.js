const path = require('path')
module.exports = function (config) {
  if (!config.backend) return
  const map = require(path.join(path.dirname(require.main.filename), '../lib/cli/map'))
  let { db, env } = config.common.storage
  config.backend.router.post('/maptool/set', (req, res) => {
    let rooms = req.body
    let ps = rooms.map(r => {
      let { terrain, room, objects } = r
      return Promise.all([
        db.rooms.update({ _id: r.room }, { $set: { name: r.room, status: r.status || 'out of bounds', active: true, bus: r.bus, openTime: r.openTime, sourceKeepers: r.sourceKeepers, novice: r.novice, respawnArea: r.respawnArea }}, { upsert: true }),
        db['rooms.terrain'].update({ room }, { $set: { terrain }}, { upsert: true })
      .then(() => map.updateRoomImageAssets(room)),
        db['rooms.objects'].remove({ room })
      .then(() => objects.map(o => db['rooms.objects'].insert(o)))
      ])
    })
    Promise.all(ps)
          .then(ret => res.json(ret))
    .then(() => map.updateTerrainData())
  })
  config.backend.router.get('/maptool/room', (req, res) => {
    let { room } = req.query
    return Promise.all([
      db.rooms.findOne({ _id: room }, { status: 1, active: 1, sourceKeepers: 1, bus: 1, respawnArea: 1, novice: 1, lastPvpTime: 1 }),
      db['rooms.terrain'].findOne({ room }, { room: 1, terrain: 1 }),
      db['rooms.objects'].find({ room }),
      env.get('gameTime').then(t => parseInt(t))
    ])
    .then(([room, terrain, objects, tick]) => Object.assign(room, { tick, objects }, terrain, { _id: undefined, ok: 1 }))
    .then(ret => res.json(ret))
    .catch(err => res.json({ error: 'room not found' }))
  })
  config.backend.router.get('/maptool/rooms', (req, res) => {
    let { rooms } = req.query
    return Promise.all(rooms.split(',').map(getRoom))
      .then(ret => res.json(ret))

    function getRoom (room) {
      return Promise.all([
        db.rooms.findOne({ _id: room }, { status: 1, active: 1, sourceKeepers: 1, bus: 1, respawnArea: 1, novice: 1, lastPvpTime: 1 }),
        db['rooms.terrain'].findOne({ room }, { room: 1, terrain: 1 }),
        db['rooms.objects'].find({ room }),
        env.get('gameTime').then(t => parseInt(t))
      ])
      .then(([room, terrain, objects, tick]) => Object.assign(room, { tick, objects }, terrain, { _id: undefined, ok: 1 }))
      .catch(() => null)
    }
  })
}
