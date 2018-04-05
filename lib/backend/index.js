const fs = require('fs')
const util = require('util')
const path = require('path')
const { run } = require('micro')
const match = require('fs-router')(path.join(__dirname, '/routes'))
const auth = require('basic-auth')
const express = require('express')


module.exports = function (config) {
  config.backend.on('expressPreConfig', app => {
    app.use('/maptool', doAuth(config.maptool.config), express.static(path.join(__dirname, '../../public')))
    app.use('/api/maptool', doAuth(config.maptool.config), (req, res, next) => run(req, res, async (req, res) => {
      req.config = config
      let url = req.url
      req.url = req.url.replace('/api/maptool', '')
      let matched = match(req)
      req.url = url
      if (matched) return matched(req, res)
      next()
    }))
  })
}

function doAuth (config) {
  return (req, res, next) => {
    let data = auth(req)
    if (data && data.name === config.user && data.pass === config.pass) {
      next()
    } else {
      res.statusCode = 401
      res.setHeader('WWW-Authenticate', 'Basic realm="Map Tool"')
      res.end('Unauthorized')
    }
  }
}

function staticServe (dir, fn) {
  const access = util.promisify(fs.access)
  return async (req, res) => {
    let url = req.url.slice(1).replace(/\.+/g, '')
    let tgt = path.resolve(dir, url)
    try {
      await access(tgt)
      return fs.createReadStream(tgt)
    } catch (e) {
      return fn(req, res)
    }
  }
}
