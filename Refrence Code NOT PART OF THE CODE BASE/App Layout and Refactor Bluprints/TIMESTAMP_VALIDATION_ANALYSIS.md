# Timestamp Validation Issue Analysis

## The Problem
The route validation and animation store update is not being triggered when timestamps are saved. Instead, it's being triggered when new anchors are plotted, which is too early and results in `useAnchorTimestamps: false`.

## Files Involved

### `website/src/lib/components/toolbar/tools/routing/RoutingControls.ts`
- Main routing control logic
- Handles anchor creation and management
- Contains `routeBetweenAnchors` method for route generation
- Currently adds/removes timestamp event listener in click handler
- Responsible for validating timestamps and updating animation store

### `website/src/lib/stores/anchor-timing.ts`
- Manages anchor timing state
- Handles timestamp storage and retrieval
- Dispatches `timestamp-saved` event when timestamps are saved
- Contains the `setActiveAnchor` method that triggers save events

### `website/src/lib/components/anchor-timing/AnchorTimestampPicker.svelte`
- UI component for timestamp editing
- Triggers timestamp saves
- Interacts with anchor-timing store

### `website/src/lib/stores/animation.ts`
- Destination for processed route data
- Receives route data when timestamps are valid
- Used by animation engine for playback

## Current Flow
1. User clicks anchor to edit timestamp
2. Timestamp picker opens
3. User sets timestamp and clicks save
4. `setActiveAnchor(null)` is called
5. Event `timestamp-saved` is dispatched
6. Event listener (which was added during anchor click) is already gone
7. No validation occurs until next anchor plot

## Debug Evidence
```
[DEBUG] Setting active anchor: null
[DEBUG] Timestamp saved for anchor: 7e7c0b96-...
[DEBUG] Active anchor changed in app: null
[DEBUG] Route generated with points: 21
[DEBUG] Last anchor point data: {hasTime: false...}
[DEBUG] useAnchorTimestamps: false
```

## Previous Attempts
1. Initially tried to trigger validation during route generation
   - Issue: Too early, timestamps not yet set
   
2. Added event listener in click handler
   - Issue: Listener gets removed before save occurs
   
3. Added timeout after save
   - Issue: Race condition, not reliable

## Proposed Solutions

### Option 1: Persistent Event Listener
- Move event listener outside click handler
- Keep it alive for entire component lifecycle
- Handle cleanup in component destroy
- Pros: More reliable, always listening
- Cons: Need to carefully manage listener cleanup

### Option 2: Enhanced Save Handler
- Keep current event structure
- Don't remove listener until explicit success
- Add confirmation of save completion
- Pros: More precise control
- Cons: More complex state management

### Option 3: State-Based Trigger
- Instead of events, use store subscription
- Watch for state changes in anchor timing store
- Trigger validation on specific state transitions
- Pros: More Svelte-like approach
- Cons: Might miss some edge cases

## Next Steps
1. Implement persistent event listener (Option 1)
   - Add listener during component initialization
   - Track active anchor ID
   - Validate only when relevant anchor saved
   - Clean up on component destroy

Would you like to proceed with any of these solutions? 