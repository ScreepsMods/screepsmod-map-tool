self.terrainCache = {}

const server = ``
const wallChance = 0.25
function getTerrain (room, remote) {
  return self.terrainCache[room] || null
}

function refreshSlidersOnPageLoad() {  
  document.getElementById('wallChanceInput').value = 25;
  document.getElementById('sourceChanceInput').value = 75;
  document.getElementById('wallChance').innerHTML = 'Walls Chance[25%]';
  document.getElementById('sourceChance').innerHTML = '2 Source chance[75%]';
}

function updateSliderText(id, newText) {
    document.getElementById(id).innerHTML = newText;
}

async function getAllTerrain () {
  const res = await fetch(`${server}/api/maptool/rooms`, { credentials: 'same-origin' })
  const { rooms } = await res.json()
  rooms.forEach(r => {
    self.terrainCache[r.room] = r
  })
  return rooms
}

const C = {
  MINERAL_DENSITY: {
    1: 15000,
    2: 35000,
    3: 70000,
    4: 100000
  },
  MINERAL_DENSITY_PROBABILITY: {
    1: 0.1,
    2: 0.5,
    3: 0.9,
    4: 1.0
  },
  TERRAIN_MASK_WALL: 1,
  TERRAIN_MASK_SWAMP: 2,
  TERRAIN_MASK_LAVA: 4,
  SOURCE_ENERGY_NEUTRAL_CAPACITY: 1500,
  ENERGY_REGEN_TIME: 300,

  RESOURCE_SILICON: 'silicon',
  RESOURCE_METAL: 'metal',
  RESOURCE_BIOMASS: 'biomass',
  RESOURCE_MIST: 'mist'
}

const common = {
  encodeTerrain (terrain) {
    var result = ''
    for (var y = 0; y < 50; y++) {
      for (var x = 0; x < 50; x++) {
        var objects = _.filter(terrain, { x, y })

        var code = 0
        if (_.some(objects, { type: 'wall' })) {
          code = code | 1
        }
        if (_.some(objects, { type: 'swamp' })) {
          code = code | 2
        }
        result = result + code
      }
    }
    return result
  },
  decodeTerrain (str, room) {
    var result = []
    for (var y = 0; y < 50; y++) {
      for (var x = 0; x < 50; x++) {
        var code = str.charAt(y * 50 + x)
        if (code & 1) {
          result.push({ room, x, y, type: 'wall' })
        }
        if (code & 2) {
          result.push({ room, x, y, type: 'swamp' })
        }
      }
    }
    return result
  },
  checkTerrain (terrain, x, y, mask) {
    return (parseInt(terrain.charAt(y * 50 + x)) & mask) > 0
  }
}

const utils = {
  roomNameFromXY (x, y) {
    if (x < 0) {
      x = 'W' + (-x - 1)
    } else {
      x = 'E' + (x)
    }
    if (y < 0) {
      y = 'N' + (-y - 1)
    } else {
      y = 'S' + (y)
    }
    return '' + x + y
  },
  roomNameToXY (name) {
    var [match, hor, x, ver, y] = name.match(/^(\w)(\d+)(\w)(\d+)$/)
    if (hor == 'W') {
      x = -x - 1
    } else {
      x = +x
      // x--;
    }
    if (ver == 'N') {
      y = -y - 1
    } else {
      y = +y
      // y--;
    }
    return [x, y]
  },
  writePng (colors, width, height) {
    let image = new ImageData(width, height)
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var idx = (width * y + x) << 2

        image.data[idx] = colors[y][x][0]
        image.data[idx + 1] = colors[y][x][1]
        image.data[idx + 2] = colors[y][x][2]
        image.data[idx + 3] = colors[y][x][3] === undefined ? 255 : colors[y][x][3]
      }
    }
    return image
  },
  createTerrainColorsMap (terrain, zoomIn) {
    var colors = {}

    var width = 50; var height = 50

    for (var y = 0; y < height; y++) {
      if (zoomIn) {
        for (let i = 0; i < zoomIn; i++) {
          colors[y * zoomIn + i] = {}
        }
      } else {
        colors[y] = {}
      }
      for (var x = 0; x < width; x++) {
        var color
        if (common.checkTerrain(terrain, x, y, C.TERRAIN_MASK_WALL)) {
          color = [0, 0, 0]
        } else if (common.checkTerrain(terrain, x, y, C.TERRAIN_MASK_SWAMP)) {
          color = [35, 37, 19]
        } else if (x == 0 || y == 0 || x == 49 || y == 49) {
          color = [50, 50, 50]
        } else {
          color = [43, 43, 43]
        }
        if (zoomIn) {
          for (var dx = 0; dx < zoomIn; dx++) {
            for (var dy = 0; dy < zoomIn; dy++) {
              colors[y * zoomIn + dy][x * zoomIn + dx] = color
            }
          }
        } else {
          colors[y][x] = color
        }
      }
    }

    return colors
  },
  writeTerrainToPng (terrain, zoomIn) {
    var colors = this.createTerrainColorsMap(terrain, zoomIn)
    return this.writePng(colors, 50 * zoomIn, 50 * zoomIn)
  }
}

/** /
`generateRoom(roomName, [opts]) - Generate a new room at the specified location. 'opts' is an object with the following optional properties:\r
* exits - an object with exit coordinates arrays, e.g. {top: [20,21,23], right: [], bottom: [27,28,29,40,41]}, default is random\r
* terrainType - the type of generated landscape, a number from 1 to 28, default is random\r
* swampType - the type of generated swamp configuration, a number from 0 to 14, default is random\r
* sources - the amount of sources in the room, default is random from 1 to 2\r
* mineral - the type of the mineral deposit in this room or false if no mineral, default is random type\r
* controller - whether this room should have the controller, default is true\r
* keeperLairs - whether this room should have source keeper lairs, default is false`,
/**/
function generateRoom (roomName, opts) {
  opts = opts || {}

  opts.exits = opts.exits || {}

  if (!/^[WE]\d+[NS]\d+$/.test(roomName)) {
    return q.reject('Invalid room name')
  }

  function _exitsArray (terrain, x, y) {
    var exits = []
    for (var i = 0; i < 50; i++) {
      if (!common.checkTerrain(terrain, x === undefined ? i : x, y === undefined ? i : y, C.TERRAIN_MASK_WALL)) {
        exits.push(i)
      }
    }
    return exits
  }

  function _genExit () {
    var exitLength = Math.floor(Math.random() * 43) + 1
    if (opts.hall) exitLength = Math.ceil(Math.random() * 33) + 30
    var intervalsCnt = [0, 0, 1, 1, 2][Math.floor(Math.random() * 5)]
    var exit = []

    var exitStart = Math.floor(Math.random() * (46 - exitLength)) + 2

    var intervals = {}

    var curStart = exitStart

    for (var j = 0; j < intervalsCnt; j++) {
      curStart += Math.floor(Math.random() * (exitLength / (intervalsCnt * 2))) + 5
      var length = Math.floor(Math.random() * (exitLength / (intervalsCnt * 2))) + 5
      if (length + curStart >= exitStart + exitLength - 5) {
        length = exitStart + exitLength - curStart - 5
      }
      intervals[j] = {
        start: curStart,
        length
      }
      curStart += length + 1
    }

    for (var x = exitStart; x <= exitStart + exitLength; x++) {
      if (intervalsCnt > 0) {
        if (intervals[0].length > 0 && x >= intervals[0].start && x <= intervals[0].start + intervals[0].length) {
          continue
        }
        if (intervalsCnt > 1 && intervals[1].length > 0 && x >= intervals[1].start && x <= intervals[1].start + intervals[1].length) {
          continue
        }
      }
      if (x < 2 || x > 47) {
        continue
      }
      exit.push(x)
    }

    return exit
  }

  function _matchExitWithNeighbors (exits, dir, neighbor, wallChance) {
    var x, y
    if (dir == 'top') {
      y = 49
    }
    if (dir == 'right') {
      x = 0
    }
    if (dir == 'bottom') {
      y = 0
    }
    if (dir == 'left') {
      x = 49
    }
    if (exits[dir]) {
      if (neighbor) {
        var neighborExits = _exitsArray(neighbor.terrain, x, y)
        return neighborExits.length == exits[dir].length && _.intersection(neighborExits, exits[dir]).length == neighborExits.length
      } else {
        return true
      }
    } else {
      if (neighbor) {
        exits[dir] = _exitsArray(neighbor.terrain, x, y)
      } else {
        let sk = !!roomName.match(/^[EW]\d*[4-6][NS]\d*[4-6]$/)        
        let [_x, _y] = utils.roomNameToXY(roomName)
        let hallx = !!roomName.match(/^[EW]\d*[NS]\d*0$/)
        let hally = !!roomName.match(/^[EW]\d*0[NS]\d*$/)        
        let val = Math.random() > (wallChance == undefined ?  0.3 : wallChance)
        val |= sk
        val |= (dir == 'bottom') && !!utils.roomNameFromXY(_x, _y + 1).match(/^[EW]\d*[4-6][NS]\d*[4-6]$/)
        val |= (dir == 'top') && !!utils.roomNameFromXY(_x, _y - 1).match(/^[EW]\d*[4-6][NS]\d*[4-6]$/)
        val |= (dir == 'right') && !!utils.roomNameFromXY(_x + 1, _y).match(/^[EW]\d*[4-6][NS]\d*[4-6]$/)
        val |= (dir == 'left') && !!utils.roomNameFromXY(_x - 1, _y).match(/^[EW]\d*[4-6][NS]\d*[4-6]$/)        
        val |= (dir == 'left' || dir == 'right') && hallx
        val |= (dir == 'top' || dir == 'bottom') && hally
        exits[dir] = val ? _genExit() : []        
      }
      return true
    }
  }

  function _checkFlood (terrain) {
    var startX, startY

    for (var x = 0; x < 50; x++) {
      for (var y = 0; y < 50; y++) {
        if (!terrain[y][x].wall) {
          startX = x
          startY = y
          break
        }
      }
      if (startX && startY) {
        break
      }
    }

    var visited = {}
    for (var y = 0; y < 50; y++) {
      visited[y] = {}
      for (var x = 0; x < 50; x++) {
        visited[y][x] = false
      }
    }

    var list = [[startX, startY]]
    do {
      var i = list.pop()

      var x = i[0]; var y = i[1]

      visited[y][x] = true
      for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
          if (!dx && !dy) {
            continue
          }
          if (x + dx >= 0 && x + dx <= 49 && y + dy >= 0 && y + dy <= 49 && !terrain[y + dy][x + dx].wall && !visited[y + dy][x + dx]) {
            visited[y + dy][x + dx] = true
            list.push([x + dx, y + dy])
          }
        }
      }
    }
    while (list.length > 0)

    for (var y = 0; y < 50; y++) {
      for (var x = 0; x < 50; x++) {
        if (!terrain[y][x].wall && !visited[y][x]) {
          return false
        }
      }
    }

    return true
  }

  function _smoothTerrain (terrain, factor, key) {
    var newTerrain = {}

    for (var y = 0; y < 50; y++) {
      newTerrain[y] = {}
      for (var x = 0; x < 50; x++) {
        newTerrain[y][x] = _.clone(terrain[y][x])
        var cnt = 0
        for (var dx = -1; dx <= 1; dx++) {
          for (var dy = -1; dy <= 1; dy++) {
            if (key == 'wall' && (x + dx < 0 || y + dy < 0 || x + dx > 49 || y + dy > 49) ||
                          x + dx >= 0 && x + dx <= 49 && y + dy >= 0 && y + dy <= 49 && terrain[y + dy][x + dx][key]) {
              cnt++
            }
          }
        }
        newTerrain[y][x][key] = cnt >= factor
        if (key == 'wall') {
          if (x == 0 || x == 49 || y == 0 || y == 49) {
            newTerrain[y][x].wall = true
          }
          if (terrain[y][x].forceOpen) {
            newTerrain[y][x].wall = false
          }
        }
      }
    }

    return newTerrain
  }

  function _findSourceSpot (terrain, availablePlacements) {
    var x, y
    var tries = 0
    var randomIndex

    do {
      tries++

      randomIndex = Math.floor(Math.random() * availablePlacements.length);
      x = Math.floor(Math.random() * (availablePlacements[randomIndex].xMax - availablePlacements[randomIndex].xMin)) + availablePlacements[randomIndex].xMin
      y = Math.floor(Math.random() * (availablePlacements[randomIndex].yMax - availablePlacements[randomIndex].yMin)) + availablePlacements[randomIndex].yMin

      var passNearby = false
      for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
          if (x + dx < 0 || y + dy < 0 || x + dx > 49 || y + dy > 49) {
            continue
          }
          if (!terrain[y + dy][x + dx].wall) {
            passNearby = true
            break
          }
        }
      }

      if (tries > 1000) {
        return [-1, -1]
      }
    }
    while (!terrain[y][x].wall || terrain[y][x].source || !passNearby)

    
    if (availablePlacements.length > 1) {
      availablePlacements.splice(randomIndex, 1);
    }
    return [x, y]
  }

  function _findKeeperLairSpot (terrain, x, y) {
    var lairSpots = []

    var list = [[x, y]]

    var visited = { [`${x},${y}`]: 0 }

    do {
      var [cx, cy] = list.pop()
      for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
          if (!dx && !dy || !_.isUndefined(visited[`${cx + dx},${cy + dy}`])) {
            continue
          }
          if (cx + dx < 0 || cy + dy < 0 || cx + dx > 49 || cy + dy > 49) {
            continue
          }
          var distance = visited[`${cx},${cy}`] + 1
          visited[`${cx + dx},${cy + dy}`] = distance
          if (distance >= 3 && distance <= 5 && terrain[cy + dy][cx + dx].wall && !terrain[cy + dy][cx + dx].source &&
                          (cx + dx > 0 && cx + dx < 49 && cy + dy > 0 && cy + dy < 49)) {
            lairSpots.push([cx + dx, cy + dy])
          }
          if (!terrain[cy + dy][cx + dx].wall && distance < 5) {
            list.push([cx + dx, cy + dy])
          }
        }
      }
    }
    while (list.length > 0)

    if (lairSpots.length > 0) {
      lairSpots = _.shuffle(lairSpots)
      for (let i = 0; i < lairSpots.length; i++) {
        var foundSource = false
        for (var dx = -5; dx <= 5; dx++) {
          for (var dy = -5; dy <= 5; dy++) {
            if (lairSpots[i][0] + dx < 0 || lairSpots[i][1] + dy < 0 || lairSpots[i][0] + dx > 49 || lairSpots[i][1] + dy > 49) {
              continue
            }
            if (lairSpots[i][0] + dx == x && lairSpots[i][1] + dy == y) {
              continue
            }
            if (terrain[lairSpots[i][0] + dx][lairSpots[i][1] + dy].source) {
              foundSource = true
            }
          }
        }

        if (!foundSource) {
          return [lairSpots[i][0], lairSpots[i][1]]
        }
      }
    }

    return [-1, -1]
  }

  function _genTerrain (wallType, swampType, exits, sources, controller, keeperLair, mineral, type) {
    var types = {
      1: { fill: 0.4, smooth: 10, factor: 5 },
      2: { fill: 0.2, smooth: 20, factor: 4 },
      3: { fill: 0.2, smooth: 20, factor: 4 },
      4: { fill: 0.3, smooth: 18, factor: 4 },
      5: { fill: 0.3, smooth: 10, factor: 4 },
      6: { fill: 0.3, smooth: 10, factor: 4 },
      7: { fill: 0.3, smooth: 10, factor: 4 },
      8: { fill: 0.35, smooth: 15, factor: 4 },
      9: { fill: 0.3, smooth: 2, factor: 4 },
      10: { fill: 0.35, smooth: 2, factor: 4 },
      11: { fill: 0.35, smooth: 5, factor: 4 },
      12: { fill: 0.35, smooth: 5, factor: 4 },
      13: { fill: 0.25, smooth: 5, factor: 4 },

      14: { fill: 0.4, smooth: 3, factor: 5 },
      15: { fill: 0.5, smooth: 3, factor: 5 },
      16: { fill: 0.45, smooth: 4, factor: 5 },
      17: { fill: 0.45, smooth: 6, factor: 5 },
      18: { fill: 0.45, smooth: 10, factor: 5 },
      19: { fill: 0.5, smooth: 10, factor: 5 },

      20: { fill: 0.4, smooth: 3, factor: 5 },
      21: { fill: 0.5, smooth: 2, factor: 5 },
      22: { fill: 0.45, smooth: 4, factor: 5 },
      23: { fill: 0.45, smooth: 6, factor: 5 },
      24: { fill: 0.45, smooth: 10, factor: 5 },
      25: { fill: 0.5, smooth: 10, factor: 5 },

      26: { fill: 0.45, smooth: 10, factor: 5 },
      27: { fill: 0.45, smooth: 6, factor: 5 },
      28: { fill: 0.2, smooth: 20, factor: 4 }
    }

    var swampTypes = {
      1: { fill: 0.3, smooth: 3, factor: 5 },
      2: { fill: 0.35, smooth: 3, factor: 5 },
      3: { fill: 0.45, smooth: 3, factor: 5 },
      4: { fill: 0.25, smooth: 1, factor: 5 },
      5: { fill: 0.25, smooth: 30, factor: 4 },
      6: { fill: 0.52, smooth: 30, factor: 5 },
      7: { fill: 0.45, smooth: 3, factor: 5 },
      // 7: {fill: 0.60, smooth: 3, factor: 5},
      8: { fill: 0.3, smooth: 1, factor: 5 },
      9: { fill: 0.3, smooth: 1, factor: 4 },
      10: { fill: 0.3, smooth: 3, factor: 5 },
      11: { fill: 0.3, smooth: 3, factor: 5 },
      12: { fill: 0.3, smooth: 1, factor: 5 },
      13: { fill: 0.25, smooth: 1, factor: 5 },
      14: { fill: 0.35, smooth: 3, factor: 5 }
    }

    var terrain; var tries = 0

    do {
      terrain = {}
      tries++

      if (tries > 100) {
        wallType = Math.floor(Math.random() * 27) + 1
        tries = 0
      }

      for (var y = 0; y < 50; y++) {
        terrain[y] = {}
        for (var x = 0; x < 50; x++) {
          terrain[y][x] = {}
        }
      }
      for (var y = 0; y < 50; y++) {
        for (var x = 0; x < 50; x++) {
          if (y == 0 && _.isArray(exits.top) && _.includes(exits.top, x)) {
            terrain[y][x].forceOpen = true
            terrain[y + 1][x].forceOpen = true
            terrain[y][x].exit = true
            continue
          }
          if (y == 49 && _.isArray(exits.bottom) && _.includes(exits.bottom, x)) {
            terrain[y][x].forceOpen = true
            terrain[y - 1][x].forceOpen = true
            terrain[y][x].exit = true
            continue
          }
          if (x == 0 && _.isArray(exits.left) && _.includes(exits.left, y)) {
            terrain[y][x].forceOpen = true
            terrain[y][x + 1].forceOpen = true
            terrain[y][x].exit = true
            continue
          }

          if (x == 49 && _.isArray(exits.right) && _.includes(exits.right, y)) {
            terrain[y][x].forceOpen = true
            terrain[y][x - 1].forceOpen = true
            terrain[y][x].exit = true
            continue
          }
          terrain[y][x].wall = Math.random() < types[wallType].fill
          terrain[y][x].swamp = swampType ? Math.random() < swampTypes[swampType].fill : false
        }
      }

      for (var i = 0; i < types[wallType].smooth; i++) {
        terrain = _smoothTerrain(terrain, types[wallType].factor, 'wall')
      }
    }
    while (!_checkFlood(terrain))

    if (swampType) {
      for (var i = 0; i < swampTypes[swampType].smooth; i++) {
        terrain = _smoothTerrain(terrain, swampTypes[swampType].factor, 'swamp')
      }
    }
    
    var availablePlacements = [];
    if (type == 'sk' || type == 'center') {
      availablePlacements.push({xMin: 2, xMax: 19, yMin: 2, yMax: 19})
      availablePlacements.push({xMin: 29, xMax: 47, yMin: 2, yMax: 19})
      availablePlacements.push({xMin: 2, xMax: 19, yMin: 29, yMax: 47})
      availablePlacements.push({xMin: 29, xMax: 47, yMin: 29, yMax: 47})      
    } else {
      availablePlacements.push({xMin: 2, xMax: 47, yMin: 2, yMax: 47}) 
    }

    for (var i = 0; i < sources; i++) {
      let [x, y] = _findSourceSpot(terrain, availablePlacements)

      if (x == -1 && y == -1) {
        return _genTerrain(Math.floor(Math.random() * 27) + 1, swampType, exits, sources, controller, keeperLair, mineral, type)
      }

      terrain[y][x].source = true

      if (keeperLair) {
        [x, y] = _findKeeperLairSpot(terrain, x, y)

        if (x == -1 && y == -1) {
          return _genTerrain(Math.floor(Math.random() * 27) + 1, swampType, exits, sources, controller, keeperLair, mineral, type)
        }

        terrain[y][x].keeperLair = true
      }
    }

    if (true) { // mineral
      let [x, y] = _findSourceSpot(terrain, availablePlacements)

      if (x == -1 && y == -1) {
        return _genTerrain(Math.floor(Math.random() * 27) + 1, swampType, exits, sources, controller, keeperLair, mineral, type)
      }

      terrain[y][x].mineral = true

      if (keeperLair) {
        [x, y] = _findKeeperLairSpot(terrain, x, y)

        if (x == -1 && y == -1) {
          return _genTerrain(Math.floor(Math.random() * 27) + 1, swampType, exits, sources, controller, keeperLair, mineral, type)
        }

        terrain[y][x].keeperLair = true
      }
    }

    if (controller) {
      var x, y
      do {
        x = Math.floor(Math.random() * 40) + 5
        y = Math.floor(Math.random() * 40) + 5
        var passNearby = false
        for (var dx = -1; dx <= 1; dx++) {
          for (var dy = -1; dy <= 1; dy++) {
            if (x + dx < 0 || y + dy < 0 || x + dx > 49 || y + dy > 49) {
              continue
            }
            if (!terrain[y + dy][x + dx].wall) {
              passNearby = true
              break
            }
          }
        }
      }
      while (!terrain[y][x].wall || !passNearby || terrain[y][x].source || terrain[y][x].mineral || terrain[y][x].keeperLair)
      terrain[y][x].controller = true
    }

    return terrain
  }

  var [x, y] = utils.roomNameToXY(roomName)
  return q.all([
    getTerrain(utils.roomNameFromXY(x, y - 1)),
    getTerrain(utils.roomNameFromXY(x + 1, y)),
    getTerrain(utils.roomNameFromXY(x, y + 1)),
    getTerrain(utils.roomNameFromXY(x - 1, y))
  ])
    .then(neighborRooms => {
      if (!_matchExitWithNeighbors(opts.exits, 'top', neighborRooms[0], opts.wallChance)) {
        opts.exits.top = []
        // return q.reject(`Exits in room ${neighborRooms[0].room} don't match`);
      }
      if (!_matchExitWithNeighbors(opts.exits, 'right', neighborRooms[1], opts.wallChance)) {
        opts.exits.right = []
        // return q.reject(`Exits in room ${neighborRooms[1].room} don't match`);
      }
      if (!_matchExitWithNeighbors(opts.exits, 'bottom', neighborRooms[2], opts.wallChance)) {
        opts.exits.bottom = []
        // return q.reject(`Exits in room ${neighborRooms[2].room} don't match`);
      }
      if (!_matchExitWithNeighbors(opts.exits, 'left', neighborRooms[3], opts.wallChance)) {
        opts.exits.left = []
        // return q.reject(`Exits in room ${neighborRooms[3].room} don't match`);
      }

      opts.exits.top = opts.exits.top || []
      opts.exits.left = opts.exits.left || []
      opts.exits.bottom = opts.exits.bottom || []
      opts.exits.right = opts.exits.right || []

      if (opts.terrainType === undefined) {
        opts.terrainType = Math.floor(Math.random() * 27) + 1
      }
      if (opts.swampType === undefined) {
        opts.swampType = Math.floor(Math.random() * 14)
      }
      if (opts.sources === undefined) {
        opts.sources = Math.random() > 0.5 ? 1 : 2
      }
      if (opts.controller === undefined) {
        opts.controller = true
      }
      if (opts.keeperLairs === undefined) {
        opts.keeperLairs = false
      }

      var roomData = _genTerrain(opts.terrainType, opts.swampType, opts.exits, opts.sources, opts.controller, opts.keeperLairs, opts.mineral, opts.type)

      var objects = []; var terrain = []; var x; var y; var sourceKeepers = false

      for (var y in roomData) {
        y = parseInt(y)
        for (var x in roomData[y]) {
          x = parseInt(x)
          if (roomData[y][x].wall) {
            terrain.push({ type: 'wall', x, y })
          }
          if (roomData[y][x].source) {
            objects.push({
              room: roomName,
              type: 'source',
              x,
              y,
              'energy': C.SOURCE_ENERGY_NEUTRAL_CAPACITY,
              'energyCapacity': C.SOURCE_ENERGY_NEUTRAL_CAPACITY,
              'ticksToRegeneration': C.ENERGY_REGEN_TIME
            })
          }
          if (roomData[y][x].controller) {
            objects.push({ room: roomName, type: 'controller', x, y, level: 0 })
          }
          if (roomData[y][x].keeperLair) {
            objects.push({ room: roomName, type: 'keeperLair', x, y })
            sourceKeepers = true
          }
          if (roomData[y][x].swamp) {
            var flag = false
            for (var dx = -1; dx <= 1; dx++) {
              for (var dy = -1; dy <= 1; dy++) {
                if (x + dx >= 0 && y + dy >= 0 && x + dx <= 49 && y + dy <= 49 && !roomData[y + dy][x + dx].wall) {
                  flag = true
                  break
                }
              }
              if (flag) {
                break
              }
            }
            if (flag) {
              terrain.push({ type: 'swamp', x, y })
            }
          }

          if (roomData[y][x].mineral) {
            if (opts.mineral === undefined) {
              var types = ['H', 'H', 'H', 'H', 'H', 'H', 'O', 'O', 'O', 'O', 'O', 'O', 'Z', 'Z', 'Z', 'K', 'K', 'K', 'U', 'U', 'U', 'L', 'L', 'L', 'X']
              opts.mineral = types[Math.floor(Math.random() * types.length)]
            }

            if (opts.mineral) {
              var random = Math.random(); var density
              for (var d in C.MINERAL_DENSITY_PROBABILITY) {
                if (random <= C.MINERAL_DENSITY_PROBABILITY[d]) {
                  density = +d
                  break
                }
              }

              objects.push({ room: roomName, type: 'mineral', x, y, mineralType: opts.mineral, density: density, mineralAmount: C.MINERAL_DENSITY[density] })
              if (!opts.controller || opts.keeperLairs) {
                objects.push({
                  type: 'extractor',
                  x: x,
                  y: y,
                  room: roomName
                })
              }
            }
          }
        }
      }

      terrain = common.encodeTerrain(terrain)

      /*
    if (opts.mineral) {
      var mx, my, isWall, hasSpot, hasObjects
      do {
        mx = 4 + Math.floor(Math.random() * 42)
        my = 4 + Math.floor(Math.random() * 42)
        isWall = common.checkTerrain(terrain, mx, my, C.TERRAIN_MASK_WALL)
        hasSpot = false
        for (var dx = -1; dx <= 1; dx++) {
          for (var dy = -1; dy <= 1; dy++) {
            if (!common.checkTerrain(terrain, mx + dx, my + dy, C.TERRAIN_MASK_WALL)) {
              hasSpot = true
            }
          }
        }
        hasObjects = _.some(objects, i => (i.type == 'source' || i.type == 'controller') && Math.abs(i.x - mx) < 5 && Math.abs(i.y - my) < 5)
      }
      while (!isWall || !hasSpot || hasObjects)

      objects.push({
        type: 'mineral',
        mineralType: opts.mineral,
        density,
        mineralAmount: C.MINERAL_DENSITY[density],
        x: mx,
        y: my,
        room: roomName
      })
      if (!opts.controller || opts.keeperLairs) {
        objects.push({
          type: 'extractor',
          x: mx,
          y: my,
          room: roomName
        })
      }
    } */
      {
        let [x, y] = utils.roomNameToXY(roomName)
        return {
          room: roomName,
          x,
          y,
          terrain,
          objects,
          opts,
          sourceKeepers: opts.keeperLairs,
          depositType: opts.depositType,
          bus: !opts.sources && !opts.mineral
        }
      }
    })
}
