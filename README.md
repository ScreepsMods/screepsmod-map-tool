# screepsmod-map-tool

# Usage: 

URL: http://yourServerIP:21025/maptool/ 

The default username is admin,
password is auto-generated at each server launch if not set in `.screepsrc`

Right click to remove a room
Left click to generate a room
Middle clicking will flood fill from the cursor's position, 
this is useful to find isolated rooms

`Save` saves the generated rooms as `out of bounds`
`Save Active` is the same as save, except rooms are set to `normal`

The slider controls the solid wall chances, show walls will show solid walls for 
newly generated rooms _only_

Room types/features are automatic based on room position. (IE: bus, sk, controllers, etc)

In devtools, you can run `generateSector('E5S5')` to generate a sector around `E5S5`

Generate walls is currently hardcoded for a 2 sector layout, 
I hope to improve this in the future

Don't leave any room open to the 'void', doing so _will_ cause pathfinding errors

# Config

Edit `.screepsrc` to configure

```ini
[maptool]
user = admin
pass = password
```
