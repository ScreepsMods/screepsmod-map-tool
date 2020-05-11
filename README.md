# screepsmod-map-tool

# Usage: 

URL: http://yourServerIP:21025/maptool/ 

The default username is admin,
password is auto-generated at each server launch if not set in `.screepsrc` 

If you have a config.yml you can avoid using `.screepsrc` by setting the env vars, see examples below

## Mouse Tools

### Generate Rooms

Left click to generate a room

Right click to remove a room (fills with solid room)*

Ctrl+Left Click to generate a sector

Ctrl+Right Click to remove a sector (fills with solid rooms)*

Middle clicking will flood fill from the cursor's position, 
this is useful to find isolated rooms

*If a room is removed but not regenerated it will be completely walled off with game objects removed. This is done because map tool can not completely remove a room as this must be done in the CLI with the `map.removeRoom` command.

### Edit Room Terrain

Left click sets tile to wall

Right click sets tile to plain

Middle click sets tile to swamp

### Open/Close Rooms

Left click to open a room (status = 'normal')

Right click to close a room (status = 'out of borders')

Ctrl+Left Click to open a sector (ignores highways)

Ctrl+Right Click to close a sector (ignores highways)

### Main Menu

`Save` saves the current state of the map   Note: reloading the window without hitting `Save` will reload the map from the server and all changes to the map will be lost

`Generate Walls` will generate solid rooms surrounding the generated ones, this prevents pathfinding that result from exits leading to the 'void'   Note: don't leave any room open to the 'void', doing so _will_ cause pathfinding errors

`Fix All Rooms` this will search for and fix exit mismatches, terrain errors, game object errors sometimes caused by generation

The slider controls the solid wall chances, show walls will show solid walls for 
newly generated rooms _only_

'Show Walls' will display newly generated rooms that are walled off from each other with a red line

`Auto Gen` will generate an entire map of the specified size (Can run `autoGen(w,h)` from console for custom sizes)

'Mouse Tool' select the mouse tool mode 

### Additional Notes

*Room types/features are automatic based on room position. (IE: bus, sk, controllers, etc)

*You can scroll the map by using the arrow keys

*There are a number of helper functions that can be accessed in devtools console e.g. `generateSector('E5S5')` to generate a sector around `E5S5`

# Config

Edit `.screepsrc` to configure

```ini
[maptool]
user = admin
pass = password
```

If using screeps-launcher, you can specify user and pass in your `config.yml`:
```yaml
env:
  backend:
    MAPTOOL_USER: admin
    MAPTOOL_PASS: password
```
