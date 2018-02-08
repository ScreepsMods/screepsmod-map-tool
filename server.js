const express = require('express')

const app = express()

app.use('/maptools/',require('./lib/maptools')({}))
app.get('/',(req,res)=>res.redirect('/maptools/'))

app.listen(process.env.PORT || 8080)