# screepsmod-map-tool

> Screeps Private Server map tool

WIP!

URL: http://yourServerIP:21025/maptool/ 

## Build Setup

``` bash
# install dependencies
$ yarn install

# serve with hot reload at localhost:3000
$ yarn run dev

# build for production and launch server
$ yarn run build
$ yarn start

# generate static project
$ yarn run generate
```

The default username is admin,
password is auto-generated at each server launch if not set in `.screepsrc`

Room types/features are automatic based on room position. (IE: bus, sk, controllers, etc)
Generate walls will generate solid rooms surrounding the generated ones, this prevents pathfinding that result from exits leading to the 'void'
On that note, don't leave any room open to the 'void', doing so _will_ cause pathfinding errors

# Config

Edit `.screepsrc` to configure

```ini
[maptool]
user = admin
pass = password
# generate static project
$ yarn run generate
```
