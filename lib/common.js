const EventEmitter = require('events').EventEmitter
const ini = require('ini')
const fs = require('fs')
const crypto = require('crypto')

const DEFAULTS = {
  user: process.env.MAPTOOL_USER || 'admin',
  pass: process.env.MAPTOOL_PASS || ''
}

module.exports = function (config) {
  config.maptool = new EventEmitter()
  let screepsrc = {}
  try {
    screepsrc = ini.parse(fs.readFileSync('./.screepsrc', { encoding: 'utf8' }))
  } catch (e) { }
  let conf = Object.assign({}, DEFAULTS, screepsrc.maptool || {})
  if (!conf.pass) {
    conf.pass = crypto.randomBytes(16).toString('hex')
    console.log(`[Maptool] No password was set, the password for ${conf.user} has been set to ${conf.pass}`)
  }
  Object.assign(config.maptool, {
    config: conf
  })
}
