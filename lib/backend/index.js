const path = require('path')
const bodyParser = require('body-parser')
const auth = require('basic-auth')
const express = require('express')

module.exports = function (config) {
  const apiRouter = new express.Router()
  const wrap = fn => async (req, res, next) => {
    try {
      const ret = await fn(req, res)
      if (typeof ret === 'object') {
        res.json(ret)
      }
    } catch (err) {
      next(err)
    }
  }

  apiRouter.use((req, res, next) => {
    req.config = config
    req.success = (data) => {
      data.ok = 1
      res.json(data)
    }
    req.error = (err, code = 500) => {
      res.statusCode(code)
      res.json({
        error: err.stack || err.message || err.msg || err.toString()
      })
    }
    next()
  })
  apiRouter.get('/rooms', wrap(require('./routes/rooms').GET))
  apiRouter.post('/set', bodyParser.json({ limit: '100mb' }), wrap(require('./routes/set').POST))

  config.backend.on('expressPreConfig', app => {
    app.use('/maptool', doAuth(config.maptool.config), express.static(path.join(__dirname, '../../public')))
    app.use('/api/maptool', doAuth(config.maptool.config), apiRouter)
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
