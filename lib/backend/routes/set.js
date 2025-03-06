const path = require('path')
const map = require(path.join(
  path.dirname(require.main.filename),
  '../lib/cli/map'
))

module.exports.POST = async function (req, res) {
  const {
    config: {
      common: {
        storage: { db, pubsub }
      }
    }
  } = req
  let { rooms, clean } = req.body
  const received = rooms.length
  const known = new Set((await db['rooms.terrain'].find({}, { _id: false, room: true })).map(r => r.room))
  const total = known.size
  clean.forEach(r => known.delete(r))
  let ps = rooms.map(
    async ({
      terrain,
      room,
      objects,
      status = 'out of bounds',
      bus,
      openTime,
      sourceKeepers,
      novice,
      respawnArea,
      depositType
    }) => {
      await db.rooms.update(
        { _id: room },
        {
          $set: {
            name: room,
            active: true,
            status,
            bus,
            openTime,
            sourceKeepers,
            novice,
            respawnArea,
            depositType
          }
        },
        { upsert: true }
      )
      await db['rooms.terrain'].update(
        { room },
        { $set: { terrain } },
        { upsert: true }
      )
      await map.updateRoomImageAssets(room)
      await db['rooms.objects'].removeWhere({ room })
      await objects.map(o => {
        o.room = room
        return db['rooms.objects'].insert(o)
      })
      known.delete(room)
      return true
    }
  )
  let ret = await Promise.all(ps)
  await map.updateTerrainData()
  await Promise.all(
    [...known.values()].map(r => map.removeRoom(r))
  )
  pubsub.publish(pubsub.keys.RUNTIME_RESTART, '1')
  return ret
}
