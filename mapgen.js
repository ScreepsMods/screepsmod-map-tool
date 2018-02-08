const express = require('express')
module.exports = function(opts){ 
  const app = new express.Router()
  app.get('/terrain.png',(req,res)=>{
    let { terrain, zoomIn } = req.query
    res.type('image/png')
    let colors = utils.createTerrainColorsMap(terrain, zoomIn);
    return writePngToStream(colors, 50*(zoomIn?3:1), 50*(zoomIn?3:1), res);
  })
  return app 
} 

const utils = require("@screeps/backend/lib/utils")

function writePngToStream(colors, width, height, stream) {

    var image = new png({width, height});

    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            var idx = (width*y + x) << 2;

            image.data[idx] = colors[y][x][0];
            image.data[idx+1] = colors[y][x][1];
            image.data[idx+2] = colors[y][x][2];
            image.data[idx+3] = colors[y][x][3] === undefined ? 255 : colors[y][x][3];
        }
    }

    var defer = q.defer();
    image.pack().pipe(stream).on('finish', () => defer.resolve());
    return defer.promise;
};

