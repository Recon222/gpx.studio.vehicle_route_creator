**Analysis of Dense Point Timestamp Assignment in the Pipeline**

---

### **Objective**

This document provides a detailed breakdown of locations in the codebase where dense point timestamp assignment occurs and outlines their role in the pipeline.

---

### **Key Locations for Dense Point Timestamp Assignment**

#### **1. `RoutingControls.ts`**

- **Method:** `routeBetweenAnchors`
  - **Functionality:**
    - Generates dense points between anchor points.
    - Assigns timestamps to these dense points based on speed calculations.
    - **Code Snippet:**
      ```typescript
      dbUtils.applyToFile(this.fileId, (file) => file.replaceTrackPoints(
          anchors[0].trackIndex,
          anchors[0].segmentIndex,
          anchors[0].point._data.index,
          anchors[anchors.length - 1].point._data.index,
          response,
          speed,
          startTime
      ));
      ```

#### **2. `gpx.ts`**

- **Relevant Methods:**
  - `changeTimestamps()`
  - `createArtificialTimestamps()`
  - `withTimestamps()`
  - `withShiftedAndCompressedTimestamps()`
  - `withArtificialTimestamps()`
  - **Functionality:**
    - These methods assign or manipulate timestamps across all points, including dense points.

#### **3. `Time.svelte`**

- **Relevant Functions:**
  - Applies timestamps globally to tracks, affecting both anchor and dense points.

#### **4. `io.ts`**

- **Method:** `buildGPX`
  - **Functionality:**
    - Processes timestamps during GPX file generation.
    - Includes all points (dense and anchor).

#### **5. `animation.ts`**

- **Method:** `interpolatePosition`
  - **Functionality:**
    - Uses timestamps for dense point interpolation during animation playback.

---

