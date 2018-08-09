import { C, common, utils, getTerrain, setTerrain, generateRoom } from './generator'

// async function getAllTerrain () {
//   const res = await fetch(`${server}/api/maptool/rooms`, { credentials: 'same-origin' })
//   const { rooms } = await res.json()
//   rooms.forEach(r => {
//     terrainCache[r.room] = r
//   })
//   return rooms
// }

addEventListener('message', async ({ data: { method, params, id } = {} }) => {
  try {
    const result = await this[methods](...params)
    if (id) {
      postMessage({ id, success: true, result })
    }
  } catch (e) {
    if (id) {
      postMessage({ id, success: false, error: { code: e.code, message: e.message, stack: e.stack } })
    }
  }
})

const methods = {
  async generate (room, opts) {
    return generateRoom(room, opts)
  },
  async generatePNG(terrain, zoom = false) {
    return utils.writeTerrainToPng(terrain, zoom)
  },
  async terrain (terrainData) {
    for(let k in terrainData) {
      setTerrain(k, terrainData)
    }
  }
}
