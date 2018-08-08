# screepsmod-map-tool

# Important Note
## This mod MUST be before other mods in the mod list, some other mods (One of mine most likely) pollute the server request and break this one, loading it first solves that issue.

# Usage: 

URL: http://yourServerIP:21025/maptool/ 

The default username is admin,
password is auto-generated at each server launch if not set in `.screepsrc`

Left click to generate a room
Right click to remove a room

Ctrl+Left Click to generate a sector
Ctrl+Right Click to remove a sector (Fills with solid rooms)

Middle clicking will flood fill from the cursor's position, 
this is useful to find isolated rooms

`Save` saves the generated rooms as `out of bounds`
`Save Active` is the same as save, except rooms are set to `normal`

The slider controls the solid wall chances, show walls will show solid walls for 
newly generated rooms _only_

Room types/features are automatic based on room position. (IE: bus, sk, controllers, etc)

In devtools, you can run `generateSector('E5S5')` to generate a sector around `E5S5`

Generate walls will generate solid rooms surrounding the generated ones, this prevents pathfinding that result from exits leading to the 'void'
On that note, don't leave any room open to the 'void', doing so _will_ cause pathfinding errors

# Config

Edit `.screepsrc` to configure

```ini
[maptool]
user = admin
pass = password
```
