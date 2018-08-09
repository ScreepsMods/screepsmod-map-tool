<template>
  <div class="fillArea fill-height">
    <canvas ref="mapCanvas" class="fillCanvas" @contextmenu.prevent="cmenu" @wheel="wheel" @mousedown="mousedown" @mouseup="mouseup" @mousemove="mousemove"></canvas>
  </div>
</template>
<script>
import { mapState } from 'vuex'
import { C, common } from '~/assets/generator'

const imageCache = new WeakMap()

export default {
  props: ['selected'],
  data () {
    return  {
      run: false,
      scale: 1,
      offset: {
        x: 0, y: 0, moved: false
      },
      mouse: {
        left: false,
        right: false,
        middle: false,
        drag: false,
        x: 0,
        y: 0
      },
      tools: [
        { type: 'sectorgen' },
        { type: 'roomgenerate' }
      ]
    }
  },
  created () {
    if (!this.run) {
      requestAnimationFrame(() => this.tick())
    }
    this.run = true
  },
  mounted () {
    if (!this.run) {
      requestAnimationFrame(() => this.tick())
    }
    this.run = true
  },
  unmounted () {
    this.run = false
  },
  destroyed () {
    this.run = false
  },
  beforeDestroy () {
    this.run = false
  },
  computed: {
    ...mapState({ rooms: state => state.api.rooms })
  },
  methods: {
    mousedown (e) {
      if (e.button === 2) {
        this.mouse.right = true
        this.mouse.drag = false
        this.mouse.x = e.clientX
        this.mouse.y = e.clientY
      }
    },
    mouseup (e) {
      if (e.button === 0) {
        const x = -this.offset.x + (e.offsetX * this.scale)
        const y = -this.offset.y + (e.offsetY * this.scale)
        const room = this.XYToRoom(x,y)
        this.$emit('roomClicked', room)
      }
      if (e.button === 2) {
        this.mouse.right = false
      }
      if (this.mouse.drag) {
        e.preventDefault()
        e.stopPropagation()
        this.mouse.drag = false
      }
    },
    mousemove (e) {
      if (!this.mouse.right) return
      const { x: ox, y: oy } = this.mouse
      const [nx, ny] = [e.clientX, e.clientY]
      const [dx, dy] = [nx - ox, ny - oy]
      const d = Math.max(dx, dy)
      if (Math.abs(d) > 5) this.mouse.drag = true
      if (this.mouse.drag) {
        this.offset.x += (dx / this.scale)
        this.offset.y += (dy / this.scale)
        this.offset.moved = true
        this.mouse.x = nx
        this.mouse.y = ny
      }
    },
    wheel(event) {
      const delta = Math.min(1, Math.max(-1, event.wheelDelta)) * 0.5
      const mx = event.offsetX
      const my = event.offsetY
      const scale = this.scale
      this.scale = Math.min(10, Math.max(0.5, this.scale + delta/(this.scale/2)))
      this.offset.x += (mx / this.scale) - (mx / scale)
      this.offset.y += (my / this.scale) - (my / scale)
      this.offset.moved = true
    },
    tick () {
      if (!this.$refs.mapCanvas) return
      if(this.run) requestAnimationFrame(() => this.tick())
      try {
        const canvas = this.$refs.mapCanvas
        if (canvas.width != canvas.offsetWidth) {
          canvas.width = canvas.offsetWidth
        }
        if (canvas.height != canvas.offsetHeight) {
          canvas.height = canvas.offsetHeight
        }
        const { width, height } = canvas
        const ctx = canvas.getContext('2d')
        // ctx.save()
        // ctx.translate(50,50)
        // ctx.rotate((Math.PI * 2) * ((Date.now() % 5000) / 5000))
        // ctx.fillRect(-10,-10,20,20)
        // ctx.restore()
        // if(!this.offset.moved) {
        //   return
        // }
        this.offset.moved = false
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.save()
        ctx.scale(this.scale, this.scale)
        ctx.translate(this.offset.x, this.offset.y)
        // ctx.beginPath()
        // let cnt = 0


        for(let room of this.rooms) {
          if(!this.roomVisible(room)) continue
          this.renderRoom(ctx, room)
        }
        // Object Layer

        // let y = 10
        // for(let layer in layers) {
        //   ctx.save()
        //   for (let color in layers.fill) {
        //     ctx.beginPath()
        //     ctx.fillStyle = color
        //     layers.fill[color].forEach(([x,y]) => ctx.fillRect(x, y, 1, 1))
        //     ctx.fillText(`${color}: ${layers.fill[color].length}`, 10, y)
        //     y += 10
        //   }
        //   for (let color in layers.stroke) {
        //     ctx.beginPath()
        //     ctx.strokeStyle = color
        //     layers.stroke[color].forEach(([x,y]) => ctx.strokeRect(x, y, 1, 1))
        //     ctx.fillText(`${color}: ${layers.fill[color].length}`, 10, y)
        //     y += 10
        //   }
        //   ctx.restore()
        // }



        ctx.restore()
        ctx.save()
        // ctx.fillStyle = 'white'
        // ctx.fillText(`cnt: ${cnt} offset: ${this.offset.x},${this.offset.y}  scale: ${this.scale}`, 100, 10)
        ctx.restore()
      } catch(e) {
        console.error(e)
      }
    },
    cmenu(){},
    renderRoom (ctx, room) {
      if (!imageCache.has(room)) {
        imageCache.set(room, this.generateRoomCanvas(room))
      }
      const img = imageCache.get(room)
      const [x,y] = this.roomXY(room)
      ctx.drawImage(img, x, y, 50, 50)

      if (room.status !== 'normal') {
        ctx.save()
        ctx.beginPath()
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(x, y, 50, 50)
        ctx.restore()
      }
    },
    generateRoomCanvas({ terrain, objects }) {
      const canvas = document.createElement('canvas')
      canvas.width = 50// * 3 //this.scale
      canvas.height = 50// * 3 //this.scale
      const ctx = canvas.getContext('2d')
      const layers = {
        wall: [],
        swamp: [],
        edge: [],
        plain: [],
        source: [],
        keeperLair: [],
        mineral: [],
        other: []
      }
      const colors = {
        walls: 'rgb(0, 0, 0)',
        swamp: 'rgb(35, 37, 19)',
        edge: 'rgb(50, 50, 50)',
        plain: 'rgb(43, 43, 43)',
        source: 'yellow',
        keeperLair: 'red',
        mineral: 'gray',
        controller: 'lightGray',
        other: 'blue'
      }
      // console.log('terrain', terrain)
      for(let y = 0; y < 50; y++) {
        for(let x = 0; x < 50; x++) {
          let type = 'plain'
          if (common.checkTerrain(terrain, x, y, C.TERRAIN_MASK_WALL)) {
            type = 'wall'
          } else if (common.checkTerrain(terrain, x, y, C.TERRAIN_MASK_SWAMP)) {
            type = 'swamp'
          } else if (x == 0 || y == 0 || x == 49 || y == 49) {
            type = 'edge'
          }
          layers[type].push([x,y])
        }
      }
      objects.forEach(o => {
        const { x, y } = o
        if (!layers[o.type]) o.type = 'other'
        layers[o.type].push([x, y])
      })
      // ctx.scale(3, 3)
      for(const layer in layers) {
        const color = colors[layer]
        ctx.beginPath()
        ctx.fillStyle = color
        for(const [x,y] of layers[layer]) {
          ctx.moveTo(x,y)
          // ctx.arc(x, y, 0.8, 0, Math.PI * 2)
          ctx.rect(x,y,1,1)
        }
        ctx.fill()
      }
      // ctx.scale(1/3,1/3)
      const mineral = objects.find(o => o.type === 'mineral')
      if (mineral) {
        const colors = {
          L: ['#3F6147', '#89F4A5'],
          U: ['#1B617F', '#88D6F7'],
          K: ['#331A80', '#9370FF'],
          Z: ['#594D33', '#F2D28B'],
          X: ['#4F2626', '#FF7A7A'],
          H: ['#4D4D4D', '#CCCCCC'],
          O: ['#4D4D4D', '#CCCCCC']
        }
        const [primary, secondary] = colors[mineral.mineralType].map(c => hexToRGB(c, 0.6))
        ctx.beginPath()
        ctx.arc(25, 25, 10, 0, Math.PI * 2)
        ctx.fillStyle = primary
        ctx.fill()
        ctx.strokeStyle = secondary
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.font = `14px Roboto`
        const off = ctx.measureText(mineral.mineralType)
        ctx.fillStyle = secondary
        ctx.fillText(mineral.mineralType, 25 - (off.width / 2), 25 + 6)
      }
      return canvas
    },
    roomXY (room) {
      if (!room.vx && !room.vy) {
        const [,xd,x,yd,y] = room.room.match(/([EW])(\d+)([NS])(\d+)/)
        // console.log(x,y,xd,yd)
        room.vx = (xd === 'W' ? -parseInt(x) - 1 : parseInt(x)) * 50
        room.vy = (yd === 'N' ? -parseInt(y) - 1 : parseInt(y)) * 50
      }
      return [room.vx, room.vy]
    },
    XYToRoom (x, y) {
      x = Math.floor(x / 50)
      y = Math.floor(y / 50)
      let xd = 'E'
      let yd = 'S'
      if(x < 0) {
        x = -x - 1
        xd = 'W'
      }
      if(y < 0) {
        y = -y - 1
        yd = 'N'
      }
      const name = [xd,x,yd,y].join('')
      return this.rooms.find(r => r.room === name || r._id === name)
    },
    roomVisible (room) {
      const canvas = this.$refs.mapCanvas
      const [x,y] = this.roomXY(room)
      const vx = -this.offset.x
      const vy = -this.offset.y
      const vw = canvas.width / this.scale
      const vh = canvas.height / this.scale
      return x + 50 > vx
      && y + 50 > vy
      && x < vx + vw
      && y < vy + vh
    }
  }
}


function hexToRGB (hex, opacity = 1) {
  let v = parseInt(hex.slice(1), 16)
  let r = (v & 0xFF0000) >> 16
  let g = (v & 0x00FF00) >> 8
  let b = (v & 0x0000FF) >> 0
  return `rgba(${r},${g},${b},${opacity})`
}
</script>
<style>
.fillArea {
  display:  flex;
  max-width: 100%;
  padding: 0;
  width: 100%;
  flex: 1 1 100%;
}
.fillCanvas {
  width: 100%;
  height: 100%;
  /* pointer-events: none; */
  user-select: none;
  user-drag: none;
  --webkit-user-drag: none;
}
</style>

