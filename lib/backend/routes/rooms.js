module.exports.GET = async function (req, res) {
  const { config: { common: { storage: { db, env } } } } = req
  const tick = env.get('gameTime').then(t => parseInt(t))
  let rooms = await db.rooms.find()
  rooms = Promise.all(rooms.map(async (room) => {
    try {
      let [{ terrain }, objects] = await Promise.all([
        db['rooms.terrain'].findOne({ room: room._id }, { room: 1, terrain: 1 }),
        db['rooms.objects'].find({ room: room._id })
      ])
      room.objects = objects
      room.terrain = terrain
      room.room = room._id
      room._id = undefined
      return room
    } catch (e) {
      return null
    }
  }))
  return { ok: 1, tick: await tick, rooms: await rooms }
}

// module.exports.GET = async function (req, res) {
//   const { query: { rooms: roomNames }, config: { common: { storage: { db, env } } } } = req
//   let rooms = await Promise.all(roomNames.split(',').map(async (roomName) => {
//     try {
//       let [room, terrain, objects, tick] = await Promise.all([
//         db.rooms.findOne({ _id: roomName }, { status: 1, active: 1, sourceKeepers: 1, bus: 1, respawnArea: 1, novice: 1, lastPvpTime: 1 }),
//         db['rooms.terrain'].findOne({ room: roomName }, { room: 1, terrain: 1 }),
//         db['rooms.objects'].find({ room: roomName }),
//         env.get('gameTime').then(t => parseInt(t))
//       ])
//       return Object.assign(room, { tick, objects }, terrain, { _id: undefined })
//     } catch (e) {
//       return null
//     }
//   }))
//   return { ok: 1, rooms }
// }
