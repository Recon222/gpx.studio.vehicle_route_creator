# Vehicle Route Animator Implementation Plan

## Project Overview
A refactor of GPX Studio to create a specialized vehicle route animation system. This tool will allow users to create and animate vehicle routes when GPS infotainment data is not available but vehicle movements are known from CCTV footage or other sources.

## Core Functionality
- ✅ Create routes by placing anchor points that snap to roads
- 🔄 Assign precise timestamps to individual anchor points
  - New: Per-anchor timestamp picker on point placement
  - New: Optional notes field per anchor point
  - New: Toggle between global timing and per-anchor timing modes
  - New: Keyboard entry support for timestamps
- 🔄 Animate vehicles along these routes with precise timing control
- Support multiple vehicles/routes with synchronized playback
- ✅ Provide flexible playback controls with variable speeds
- Export animations for use with video evidence
- ✅ Maintain GPX format compatibility for import/export

## Technical Architecture

### Phase 1: Core Animation Framework ✅
#### Components to Remove
- ✅ Elevation profile visualization
- ✅ Elevation-based calculations
- ✅ Unnecessary metadata fields

#### Route Point Strategy ✅
- ✅ Maximize route point density from routing API
- ✅ Maintain dense route points for smoother animation
- ✅ Two-level interpolation system:
  1. Dense router-generated points (road-snapped)
  2. Animation interpolation between close points

#### New Store Implementation ✅
```typescript
interface AnchorPoint {
  coordinates: GeoPoint;
  timestamp: Date | null;  // null when not manually set
  isManuallyTimed: boolean;
  metadata?: {
    observationType: 'CCTV' | 'Witness' | 'Other';
    notes: string;
    // New: Added support for per-anchor notes
    anchorNotes?: string;
  };
}

interface RouteSegment {
  startAnchor: AnchorPoint;
  endAnchor: AnchorPoint;
  routerPoints: GeoPoint[];  // Dense points from routing API
  calculatedTimestamps: Date[];
  estimatedSpeed: number;  // km/h
}

interface AnimationState {
  isPlaying: boolean;
  currentTime: Date;
  playbackSpeed: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  // New: Added support for timing mode
  timingMode: 'global' | 'per-anchor';
}

interface RouteState {
  routes: Map<string, {
    segments: RouteSegment[];
    style: RouteStyle;
    metadata: RouteMetadata;
  }>;
  activeRouteId: string | null;
}
```

#### Core Systems
- ✅ Animation loop using requestAnimationFrame
- ✅ Two-level interpolation system
- 🔄 Route point timestamp management
- ✅ Playback state management
- 🔄 Anchor point timestamp assignment
- Speed calculation between timed anchors

#### Animation Implementation
1. Route Generation ✅
   - ✅ Use maximum point density from router
   - ✅ Store dense route points
   - 🔄 Calculate timestamps across route points

2. Animation Interpolation ✅
   - ✅ Interpolate between close router points
   - ✅ Smooth position transitions
   - ✅ Calculate accurate headings
   - ✅ Maintain 60fps performance

3. Time Distribution
   - Linear time distribution based on distance
   - Average speed calculations for unknown segments
   - Timestamp interpolation across route points
   - New: Support for per-anchor timestamp interpolation

#### Data Display Integration
- Real-time statistics panel
- Per-segment speed calculations
- Time and distance measurements
- Multiple vehicle data support

### Phase 2: Playback Controls Implementation
#### Components
1. Timeline Container ✅
   - ✅ Main playback controls
   - ✅ Speed selector
   - ✅ Current time display
   - ✅ Global state management
   - 🔄 Anchor point time indicators

2. Timeline Scrubber ✅
   - ✅ Interactive progress bar
   - ✅ Pointer-based scrubbing
   - ✅ Visual feedback
   - Time markers
   - Anchor point markers

3. Route Management
   - ✅ Route creation/editing
   - 🔄 Individual anchor timestamp assignment
     - New: Timestamp picker on anchor placement
     - New: Optional notes field
     - New: Keyboard entry support
   - Route styling
   - Segment speed visualization

#### Key Features
- ✅ Play/Pause functionality
- ✅ Speed multiplier selection (0.5x to 20x)
- ✅ Precise scrubbing control
- ✅ Time display formatting
- Route point interpolation
- Per-anchor timestamp editing
- Segment speed calculations

### Phase 3: Advanced Features
#### Camera System
- Multiple view modes:
  - Top-down
  - Chase view
  - Side view
  - Driver perspective
  - Overview

#### Multi-Vehicle Support
- Synchronized playback using shared timeline
- Individual route styling
- Vehicle type assignment
- New: Support for unlimited simultaneous route animations
- New: Time-based synchronization between routes

#### Time Management
- Time range filtering
- Timestamp editing
- Speed zone definition
- Time synchronization between routes
- New: Global vs per-anchor timing modes
- New: Flexible timestamp entry (picker or keyboard)

## Technical Approach

### State Management
- ✅ Convert React context to Svelte stores
- ✅ Implement reactive bindings
- ✅ Handle time-based state updates
- Manage route data persistence

### Route Processing
1. Point Collection ✅
   - ✅ Capture user anchor points
   - ✅ Road network snapping
   - ✅ Route calculation
   - 🔄 Timestamp assignment UI
   - 🔄 Observation metadata

2. Timestamp Assignment
   - New: Immediate timestamp prompt on anchor placement
   - New: Optional notes field per anchor
   - New: Toggle between timing modes
   - Time validation and conflict resolution
   - Partial timing support (not all points need times)

3. Interpolation ✅
   - ✅ Position interpolation
   - Time-aware interpolation between anchors
   - Speed-based point distribution
   - ✅ Rotation calculation
   - Acceleration/deceleration modeling

### GPX Integration
- ✅ Maintain GPX format compatibility
- New: Store per-anchor timestamps in GPX
- New: Store anchor notes in GPX metadata
- New: Support for multiple track animations
- New: Time synchronization data in GPX

### Data Panel Integration
#### Core Features
- Current time and position display
- Distance and duration calculations
- Speed statistics (per segment and total)
- Time range visualization
- Filtered view support
- Multiple vehicle data display

#### Enhanced Functionality
- Per-anchor timestamp display
- Segment-specific speed calculations
- Real-time updates during animation
- Customizable data display options
- Export data capabilities

### Animation System
1. Main Loop
   ```typescript
   interface AnimationFrame {
     timestamp: number;
     deltaTime: number;
     routeStates: Map<string, RouteState>;
   }
   ```

2. Vehicle Updates
   - Position calculation
   - Rotation smoothing
   - State synchronization

### UI Components
- Maintain existing Tailwind styling
- Convert React patterns to Svelte
- Implement responsive design
- Ensure accessibility

## Implementation Strategy

### Phase 1 Priorities
1. Remove elevation components
2. Implement animation store with anchor timing
3. Create basic playback system
4. Convert route management
5. Integrate new data panel
6. Implement anchor timestamp UI

### Phase 2 Priorities
1. Timeline UI components
2. Scrubbing functionality
3. Speed control
4. Time display

### Phase 3 Priorities
1. Camera system
2. Multi-vehicle support
3. Advanced time controls
4. Export functionality

## Performance Considerations
- Efficient route point interpolation
- Smooth animation rendering
- Optimal state updates
- Memory management for long routes

## Testing Strategy
- Component unit tests
- Animation timing tests
- Route calculation validation
- Performance benchmarking

## Future Considerations
- Route templates
- Animation presets
- Advanced path finding
- Real-time collaboration
- Video synchronization
- 3D vehicle models 