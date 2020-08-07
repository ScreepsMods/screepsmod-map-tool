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

`Save` saves the current state of the map   *Note:* reloading the window without hitting `Save` will reload the map from the server and all changes to the map will be lost

`Generate Walls` will generate solid rooms surrounding the generated ones, this prevents pathfinding errors that result from exits leading to the 'void'   *Note:* don't leave any room open to the 'void', doing so _will_ cause pathfinding errors

`Fix All Rooms` this will search for and fix exit mismatches, terrain errors, and game object errors sometimes caused by generation

The slider controls the solid wall chances for newly generated rooms

'Show Walls' will display newly generated rooms that are walled off from each other with a red line

`Auto Gen` will generate an entire map of the specified size (Can run `autoGen(w,h)` from console for custom sizes)

'Mouse Tool' select the mouse tool mode 

### Additional Notes

*Room types/features are automatic based on room position. (IE: bus, sk, controllers, etc)

*You can scroll the map by using the arrow keys

*There are a number of helper functions that can be accessed in devtools console e.g. `generateSector('E5S5')` to generate a sector around `E5S5`

### Importing a map

#### Preperation
Run the command `system.resetAllData()` in your screeps server cli to reset the server.
You'll now have to remove all the game objects from your default map by executing the three following commands in the server cli:
1. `storage.db.rooms.drop()`
2. `storage.db['rooms.terrain'].drop()`
3. `storage.db['rooms.objects'].drop()`

#### Importing
1. Download the map you would like to import from https://maps.screepspl.us/.
2. Open the map tool in your browser and drag-&-drop the downloaded JSON file into the view.
3. Click on the "Save Open" button in the bottom menu (validate the POST request to "/api/maptool/set" in the Network tab of your Developers console, should return an array with the boolean true for each of your map tiles).
4. Reload the map tool in your browser.
5. Open developer console (F12 in Chrome) and run the command `terrain.filter(t => t.terrain == '1'.repeat(2500)).forEach(t => { t.remote = false, t.status = 'out of borders'})`.
6. Now click on "Save Closed" (validate the POST request to "/api/maptool/set" in the Network tab of your Developers console, should return an array with the boolean true for each of your border map tiles). This will correctly store the border rooms around the highway which will be present in for instance BotArena and SWC maps.

#### Post-processing
The imported map data may have included some source and mineral data related to ticks (such as regeneration, invader spawning etc) which you'll want to reset. It is therefore suggested to run the following commands in your server-cli to reset this data:
1. `storage.db['rooms.objects'].update({ type: 'controller' }, { $unset: { reservation: true, safeMode: true, safeModeCooldown:true, safemode: true, ticksToDowngrade: true,ticksToDowngrade:true,user:true }, $set: { level: 0,safeModeAvailable:0 } })`
2. `storage.db['rooms.objects'].update({ type: 'source' }, {$set: { nextRegenerationTime: 50 } })`
3. `storage.db['rooms.objects'].update({ type: 'mineral' }, {$set: { nextRegenerationTime: 50 } })`
4. `storage.db['rooms.objects'].update({ type: 'controller' }, {$set: { ticksToDowngrade: 0 } })`

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
