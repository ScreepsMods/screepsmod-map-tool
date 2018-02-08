const express = require('express')
const app = new express.Router()

module.exports = function(config){
  app.use(express.static('public'))
  return app
}
