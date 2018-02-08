const express = require('express')
module.exports = function(config){
  let router = config.maptools.router = require('./maptools.js')(config)
  config.on('expressPreRouter',app=>{
    app.use('/maptools',router)
  })
}