const EventEmitter = require('events').EventEmitter
module.exports = function(config){
  config.maptools = new EventEmitter()
  Object.assign(config.maptools,{
    ///  
  })
}