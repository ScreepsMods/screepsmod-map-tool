import Generator from './generator.worker.js'

export default {
  count: 5,
  workers: [],
  idle: [],
  active: [],
  queue: [],
  cbs: {},
  async broadcast (method, params) {
    this.workers.forEach(w => w.postMessage({ method, params }))
  },
  call (method, ...params) {
    let id = Math.random().toString(36).slice(4)
    this.queue.unshift({ method, params, id })
    this.check()
    return new Promise((resolve, reject) => {
      this.cbs[id] = { resolve, reject }
    })
  },
  check() {
    while (this.workers.length < this.count) {
      const worker = new Generator()
      this.workers.push(worker)
      this.idle.push(worker)
      worker.addEventListener('message', ({ data: { success, result, error, id } }) => {
        if (!this.idle.contains(worker)) {
          this.idle.push(worker)
        }
        const { resolve, reject } = this.cbs[id] || {}
        delete this.cbs[id]
        if (success && resolve) resolve(result)
        if (!success && reject) reject(error)
      })
    }
    while (this.idle.length && this.queue.length) {
      let worker = this.idle.pop()
      let job = this.queue.pop()
      worker.postMessage(job)
    }
  }
}
