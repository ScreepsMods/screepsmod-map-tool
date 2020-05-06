# screepsmod-map-tool

# Usage: 

URL: http://yourServerIP:21025/maptool/ 

The default username is admin,
password is auto-generated at each server launch if not set in `.screepsrc`

## Tools

### Generation

Left click to generate a room
Right click to remove a room

Ctrl+Left Click to generate a sector
Ctrl+Right Click to remove a sector (Fills with solid rooms)

Middle clicking will flood fill from the cursor's position, 
this is useful to find isolated rooms

### Editor

Left click sets cell to wall
Right click sets to plain
Middle click sets to swamp


`Save` saves the generated rooms as `out of bounds`
`Save Active` is the same as save, except rooms are set to `normal`

`Auto Gen` will generate an entire map of the specified size (Can run `autoGen(w,h)` from console for custom sizes)

The slider controls the solid wall chances, show walls will show solid walls for 
newly generated rooms _only_

Room types/features are automatic based on room position. (IE: bus, sk, controllers, etc)

In devtools, you can run `generateSector('E5S5')` to generate a sector around `E5S5`

Generate walls will generate solid rooms surrounding the generated ones, this prevents pathfinding that result from exits leading to the 'void'
On that note, don't leave any room open to the 'void', doing so _will_ cause pathfinding errors

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
