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
  let rooms = req.body
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
      respawnArea
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
            respawnArea
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
      await objects.map(o => db['rooms.objects'].insert(o))
      return true
    }
  )
  let ret = await Promise.all(ps)
  map.updateTerrainData()
  pubsub.publish(pubsub.keys.RUNTIME_RESTART)
  return ret
}
