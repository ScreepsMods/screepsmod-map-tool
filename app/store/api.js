import axios from 'axios'
import rooms from './tmp'
const http = axios.create({

})

export const store = () => ({
  rooms: [],
  terrain: []
})

export const mutations = {
  UPDATE_ROOMS(store, rooms) {
    store.rooms = rooms
  }
}

export const actions = {
  async getRooms({ commit }) {
    // const { data } = await http.get('/api/maptool/rooms')
    // commit('UPDATE_ROOMS', data)
    commit('UPDATE_ROOMS', rooms.rooms)
  }
}
