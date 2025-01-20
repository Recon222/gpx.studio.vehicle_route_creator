Where the Premature Route Generation Happens
appendAnchorWithCoordinates(...) (lines near the bottom of your file).

After creating the newPoint and the newAnchor object, you call:
ts
Copy
await this.routeBetweenAnchors(
  [lastAnchor, newAnchor],
  [lastAnchor.point.getCoordinates(), newAnchor.point.getCoordinates()]
);
This is the direct cause of route generation immediately after the new anchor is appended.
moveAnchor(...)

In this method, you also see a call to routeBetweenAnchors(anchors, targetCoordinates).
It’s triggered whenever a user drags an anchor to a new location. If you want to avoid route generation on anchor drag (at least until timestamps are set), you may need to remove or guard this call similarly.
handleClickForAnchor(...) → Timestamp logic

Inside here, if you find code that calls this.routeBetweenAnchors whenever multiple anchors have timestamps, that can also trigger a route refresh. (You have a snippet around [DEBUG] Found multiple anchors with timestamps, regenerating route.)
Depending on your desired UX, you may want to keep route generation on drag (some workflows do) but remove it from new anchor creation, or vice versa.

2. Removing the Premature Call
Option A: Just Remove the Call in appendAnchorWithCoordinates
diff
Copy
async appendAnchorWithCoordinates(coordinates: Coordinates) {
  …
  let newPoint = new TrackPoint({ attributes: coordinates });
  newPoint._data.anchor = true;
  newPoint._data.zoom = 0;

  if (!lastAnchor) {
    dbUtils.applyToFile(…);
    return;
  }

  newPoint._data.index = lastAnchor.segment.trkpt.length - 1;

  let newAnchor = {
    point: newPoint,
    segment: lastAnchor.segment,
    trackIndex: lastAnchor.trackIndex,
    segmentIndex: lastAnchor.segmentIndex
  };

- await this.routeBetweenAnchors(
-   [lastAnchor, newAnchor],
-   [lastAnchor.point.getCoordinates(), newAnchor.point.getCoordinates()]
- );
}
With that removed, a new anchor will simply be added—no route is generated. This is what you saw in your diff screenshot (“red lines removed, green lines just add the anchor”).

Option B: Also Remove or Guard Calls in moveAnchor(...)
If you also want to prevent route generation on anchor drag:

diff
Copy
async moveAnchor(anchorWithMarker: AnchorWithMarker) {
  …
  let success = await this.routeBetweenAnchors(anchors, targetCoordinates);
  if (!success) {
    …
  }
}

- // Either remove routeBetweenAnchors entirely
- // or wrap it:
if (/* condition: e.g. both anchors have valid timestamps */) {
  await this.routeBetweenAnchors(anchors, targetCoordinates);
}
Option C: Remove the “Regenerate Route” in handleClickForAnchor (if needed)
Inside:

ts
Copy
if (segmentAnchors.length >= 2) {
  console.log('[DEBUG] Found multiple anchors with timestamps, regenerating route');
  …
  this.routeBetweenAnchors(segmentAnchors, coordinates);
}
If you want only a manual “Generate Route” later, remove or guard that as well.

3. Reintroducing Route Generation in a Better Place
Because you do need a route eventually for the animation engine, you have to add a new trigger somewhere. The two common approaches:

Approach 1: A “Generate Route” Button
Create a button in your UI: Generate Route (or “Complete Route”).
When clicked, it calls:
ts
Copy
// Pseudocode
function onGenerateRouteClick() {
  const anchorsWeWant = this.anchors; // or however you pick them
  const coords = anchorsWeWant.map(a => a.point.getCoordinates());
  this.routeBetweenAnchors(anchorsWeWant, coords);
}
This ensures you only generate the route once, after the user has added and timestamped all needed anchors.
Approach 2: Store Subscription (Automatic)
In RoutingControls or a top-level component, subscribe to anchorTimingStore or a derived store that tells you “all needed anchors now have timestamps.”
Only call routeBetweenAnchors if you detect that your “start anchor” and “end anchor” (or N anchors) have valid timestamps. For example:
ts
Copy
$: if (allAnchorsHaveTimestamps($anchorTimingStore)) {
  routeBetweenAnchors(…);
}
This means route generation is triggered automatically once anchor timestamps are known. But you must carefully ensure new anchors without timestamps won’t cause repeated or partial route calls.
4. Double-Check “Start” and “End” Logic
If you only want a single “start” anchor and a single “end” anchor, ensure you:

Either explicitly mark them (isStart = true, isEnd = true)
Or sort them by time or creation order (i.e., earliest anchor as start, latest as end).
Without that, your code might pick newly added anchors as “last” or “first,” leading to missing timestamps. Then useAnchorTimestamps is set to false.

5. Summary
The lines in your appendAnchorWithCoordinates method (and possibly moveAnchor) are the direct source of route generation the moment an anchor is created/dragged.
To fix the premature validation logs (useAnchorTimestamps: false), remove or guard those calls so they don’t run until the user is done adding anchors + timestamps.
Then re-introduce a manual or well-guarded route generation call—a button click or a store-based condition—so your animation engine eventually receives the route after timestamps are valid.
That’s it! By moving the call out of “just after anchor creation” and into a user-driven or store-driven approach, you’ll avoid those incomplete “first/last anchor” issues and only generate the route once everything’s in place.