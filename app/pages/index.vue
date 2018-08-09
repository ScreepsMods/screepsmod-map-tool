<template>
  <map-canvas @roomClicked="roomClicked"></map-canvas>
</template>

<script>
import MapCanvas from '~/components/MapCanvas.vue'

export default {
  components: {
    MapCanvas
  },
  async fetch({ store }) {
    await store.dispatch('api/getRooms')
  },
  data() {
    return {
      selectedRoom: null
    }
  },
  methods: {
    roomClicked (room) {
      this.selectedRoom = room
    }
  }
}
</script>
