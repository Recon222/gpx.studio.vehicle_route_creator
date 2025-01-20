# Animation Pipeline Helper Functions

## Core Animation Components

### animation.ts
Primary animation control:
- `createAnimationStore()`: Creates the main animation store
- `interpolatePosition(time, points)`: Core interpolation logic
- `startAnimation()`: Initiates animation loop
- `stopAnimation()`: Stops animation loop

### anchor-timing.ts
Timestamp management:
- `createAnchorTimingStore()`: Creates store for anchor timing data
- `serializeState(state)`: Serializes timing state
- `deserializeState(json)`: Deserializes timing state
- `getInitialState()`: Sets up initial timing state
- `validateAnchorTimingOrder()`: Ensures timestamps are in sequence

## Routing Components

### RoutingControls.ts
Route management:
- `addAnchorPoint()`: Main function for adding anchors
- `routeBetweenAnchors()`: Handles routing between anchors
- Helper functions:
  - `stopPropagation(e)`: Event handler helper
  - `updateRouteVisualization()`: Updates map display
  - `calculateSpeed()`: Computes speed between anchors

### Routing.ts
BRouter integration:
- `route(points)`: Main routing function
- `getRoute(points, profile, privateRoads)`: BRouter API handler
- `getIntermediatePoints(points)`: Fallback straight-line routing
- Helper functions:
  - `getTags(message)`: Processes BRouter response tags

## Point Processing

### Simplify.ts
Point density control:
- `getZoomLevelForDistance(latitude, distance)`: Calculates appropriate zoom
- `updateAnchorPoints(file)`: Updates anchor positions
- `computeAnchorPoints(segment)`: Processes segment anchors

### gpx.ts
Core GPX functionality:
- `ramerDouglasPeucker()`: Point reduction algorithm
- Point manipulation helpers:
  - `withTimestamps(points, speed, lastPoint, startTime)`
  - `withShiftedAndCompressedTimestamps(points, speed, ratio, lastPoint)`
  - `withArtificialTimestamps(points, totalTime, lastPoint, startTime, slope)`
- Distance calculations:
  - `distance(coord1, coord2)`
  - `getElevationDistanceFunction(statistics)`
  - `distanceWindowSmoothing(points, window, ...)`

## State Management

### stores.ts
Global state management:
- `updateGPXData()`: Updates GPX state
- File operations:
  - `createFile()`
  - `loadFiles(list)`
  - `loadFile(file)`
  - `exportFile(file, exclude)`
- Selection management:
  - `updateSelectionFromKey(down, shift)`
  - `selectFileWhenLoaded(fileId)`

### db.ts
Database interactions:
- Store creation:
  - `bidirectionalDexieStore()`
  - `dexieSettingStore()`
  - `dexieGPXFileStore()`
- File operations:
  - `getFile(fileId)`
  - `getStatistics(fileId)`
  - `updateSelection(updatedFiles, deletedFileIds)`
  - `commitFileStateChange(newFileState, patch)`

## Utility Functions

### utils.ts
General utilities:
- Cursor management:
  - `setCursor(cursor)`
  - `resetCursor()`
  - `setPointerCursor()`
- Point calculations:
  - `getClosestLinePoint(points, point, details)`
  - `getElevation(points, zoom, tileSize)`

### units.ts
Unit conversion helpers:
- Distance conversions:
  - `kilometersToMiles(value)`
  - `metersToFeet(value)`
  - `kilometersToNauticalMiles(value)`
- Formatting:
  - `secondsToHHMMSS(value)`
  - `getDistanceWithUnits(value)`
  - `getVelocityWithUnits(value)`

## File Relationships
```
animation.ts ─────┐
                 ├─── Main Animation Pipeline
anchor-timing.ts ─┘

RoutingControls.ts ─┐
                   ├─── Route Generation
Routing.ts ────────┘

Simplify.ts ───┐
              ├─── Point Processing
gpx.ts ───────┘

stores.ts ────┐
             ├─── State Management
db.ts ───────┘

utils.ts ────┐
            ├─── Utility Support
units.ts ────┘
```

## Function Call Flow
Each main pipeline action (from the main document) triggers multiple helper functions:

1. **Place Anchor**
   ```
   addAnchorPoint()
   ├── stopPropagation()
   ├── route()
   │   ├── getRoute() or getIntermediatePoints()
   │   └── getTags()
   └── updateRouteVisualization()
   ```

2. **Set Timestamp**
   ```
   updateAnchorTiming()
   ├── validateAnchorTimingOrder()
   ├── calculateSpeed()
   └── serializeState()
   ```

3. **Reduce Points** (Optional)
   ```
   ramerDouglasPeucker()
   ├── distance()
   ├── getElevationDistanceFunction()
   └── distanceWindowSmoothing()
   ```

4. **Animation**
   ```
   startAnimation()
   ├── interpolatePosition()
   │   ├── getClosestLinePoint()
   │   └── distance()
   └── updateVehiclePosition()
   ```

## Implementation Plan

### Phase 1: Store Connection
1. **Data Preparation**
   - Route data needs to be formatted as `ProcessedData` for animation store
   - Structure needs:
     - Points array (dense points with positions)
     - TimeRange (from anchor timestamps)
     - Additional metadata if needed

2. **Connection Points**
   - Primary: `setGpsData()` in animation store
   - Trigger points:
     - After route generation
     - When anchor timestamps update
     - After any route modifications

3. **Data Flow**
```
Route Generation → Dense Points → Format Data → Animation Store
     ↑                                ↑
Anchor Updates                  Timestamp Updates
```

### Verification Steps
1. Console log data at each step:
   - Route generation output
   - Formatted GPS data
   - Animation store state updates

2. Visual checks:
   - Vehicle position at anchor points
   - Smooth movement along dense points
   - Timing accuracy at anchors

### Fallback Plan
If timing issues occur:
1. Verify timestamp consistency
2. Check speed calculations
3. Validate interpolation inputs

### Success Criteria
- Vehicle follows dense points exactly
- Arrives at anchor points at correct times
- Maintains constant speed between anchors
- Smooth animation with no jumps 