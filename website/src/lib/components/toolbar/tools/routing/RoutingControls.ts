import { distance, type Coordinates, TrackPoint, TrackSegment, Track, projectedPoint } from "gpx";
import { get, writable, type Readable } from "svelte/store";
import mapboxgl from "mapbox-gl";
import { route } from "./Routing";
import { toast } from "svelte-sonner";
import { _ } from "svelte-i18n";
import { dbUtils, settings, type GPXFileWithStatistics } from "$lib/db";
import { getOrderedSelection, selection } from "$lib/components/file-list/Selection";
import { ListFileItem, ListTrackItem, ListTrackSegmentItem } from "$lib/components/file-list/FileList";
import { currentTool, streetViewEnabled, Tool } from "$lib/stores";
import { getClosestLinePoint, resetCursor, setGrabbingCursor } from "$lib/utils";
import { anchorTimingStore } from '$lib/stores/anchor-timing';
import { v4 as uuidv4 } from 'uuid';

const { streetViewSource } = settings;
export const canChangeStart = writable(false);

function stopPropagation(e: any) {
    e.stopPropagation();
}

export class RoutingControls {
    active: boolean = false;
    map: mapboxgl.Map;
    fileId: string = '';
    file: Readable<GPXFileWithStatistics | undefined>;
    anchors: AnchorWithMarker[] = [];
    shownAnchors: AnchorWithMarker[] = [];
    popup: mapboxgl.Popup;
    popupElement: HTMLElement;
    temporaryAnchor: AnchorWithMarker;
    lastDragEvent = 0;
    fileUnsubscribe: () => void = () => { };
    unsubscribes: Function[] = [];

    toggleAnchorsForZoomLevelAndBoundsBinded: () => void = this.toggleAnchorsForZoomLevelAndBounds.bind(this);
    showTemporaryAnchorBinded: (e: any) => void = this.showTemporaryAnchor.bind(this);
    updateTemporaryAnchorBinded: (e: any) => void = this.updateTemporaryAnchor.bind(this);
    appendAnchorBinded: (e: mapboxgl.MapMouseEvent) => void = this.appendAnchor.bind(this);

    constructor(map: mapboxgl.Map, fileId: string, file: Readable<GPXFileWithStatistics | undefined>, popup: mapboxgl.Popup, popupElement: HTMLElement) {
        this.map = map;
        this.fileId = fileId;
        this.file = file;
        this.popup = popup;
        this.popupElement = popupElement;

        let point = new TrackPoint({
            attributes: {
                lat: 0,
                lon: 0
            }
        });
        this.temporaryAnchor = this.createAnchor(point, new TrackSegment(), 0, 0);
        this.temporaryAnchor.marker.getElement().classList.remove('z-10'); // Show below the other markers

        this.unsubscribes.push(selection.subscribe(this.addIfNeeded.bind(this)));
        this.unsubscribes.push(currentTool.subscribe(this.addIfNeeded.bind(this)));
    }

    addIfNeeded() {
        let routing = get(currentTool) === Tool.ROUTING;
        if (!routing) {
            if (this.active) {
                this.remove();
            }
            return;
        }

        let selected = get(selection).hasAnyChildren(new ListFileItem(this.fileId), true, ['waypoints']);
        if (selected) {
            if (this.active) {
                this.updateControls();
            } else {
                this.add();
            }
        } else if (this.active) {
            this.remove();
        }
    }

    add() {
        this.active = true;

        this.map.on('move', this.toggleAnchorsForZoomLevelAndBoundsBinded);
        this.map.on('click', this.appendAnchorBinded);
        this.map.on('mousemove', this.fileId, this.showTemporaryAnchorBinded);
        this.map.on('click', this.fileId, stopPropagation);

        this.fileUnsubscribe = this.file.subscribe(this.updateControls.bind(this));
    }

    updateControls() { // Update the markers when the file changes
        let file = get(this.file)?.file;
        if (!file) {
            return;
        }

        let anchorIndex = 0;
        file.forEachSegment((segment, trackIndex, segmentIndex) => {
            if (get(selection).hasAnyParent(new ListTrackSegmentItem(this.fileId, trackIndex, segmentIndex))) {
                for (let point of segment.trkpt) { // Update the existing anchors (could be improved by matching the existing anchors with the new ones?)
                    if (point._data.anchor) {
                        if (anchorIndex < this.anchors.length) {
                            this.anchors[anchorIndex].point = point;
                            this.anchors[anchorIndex].segment = segment;
                            this.anchors[anchorIndex].trackIndex = trackIndex;
                            this.anchors[anchorIndex].segmentIndex = segmentIndex;
                            this.anchors[anchorIndex].marker.setLngLat(point.getCoordinates());
                        } else {
                            this.anchors.push(this.createAnchor(point, segment, trackIndex, segmentIndex));
                        }
                        anchorIndex++;
                    }
                }
            }
        });

        while (anchorIndex < this.anchors.length) { // Remove the extra anchors
            this.anchors.pop()?.marker.remove();
        }

        this.toggleAnchorsForZoomLevelAndBounds();
    }

    remove() {
        this.active = false;

        for (let anchor of this.anchors) {
            anchor.marker.remove();
        }
        this.map.off('move', this.toggleAnchorsForZoomLevelAndBoundsBinded);
        this.map.off('click', this.appendAnchorBinded);
        this.map.off('mousemove', this.fileId, this.showTemporaryAnchorBinded);
        this.map.off('click', this.fileId, stopPropagation);
        this.map.off('mousemove', this.updateTemporaryAnchorBinded);
        this.temporaryAnchor.marker.remove();

        this.fileUnsubscribe();
    }

    updateMap(map: mapboxgl.Map) {
        this.map = map;
    }

    createAnchor(point: TrackPoint, segment: TrackSegment, trackIndex: number, segmentIndex: number): AnchorWithMarker {
        let element = document.createElement('div');
        element.className = `h-5 w-5 xs:h-4 xs:w-4 md:h-3 md:w-3 rounded-full bg-white border-2 border-black cursor-pointer`;

        let marker = new mapboxgl.Marker({
            draggable: true,
            className: 'z-10',
            element
        }).setLngLat(point.getCoordinates());

        let anchor = {
            point,
            segment,
            trackIndex,
            segmentIndex,
            marker,
            inZoom: false
        };

        marker.on('dragstart', (e) => {
            this.lastDragEvent = Date.now();
            setGrabbingCursor();
            element.classList.remove('cursor-pointer');
            element.classList.add('cursor-grabbing');
        });
        marker.on('dragend', (e) => {
            this.lastDragEvent = Date.now();
            resetCursor();
            element.classList.remove('cursor-grabbing');
            element.classList.add('cursor-pointer');
            this.moveAnchor(anchor);
        });
        let handleAnchorClick = this.handleClickForAnchor(anchor, marker);
        marker.getElement().addEventListener('click', handleAnchorClick);
        marker.getElement().addEventListener('contextmenu', handleAnchorClick);

        return anchor;
    }

    handleClickForAnchor(anchor: Anchor, marker: mapboxgl.Marker) {
        return (e: any) => {
            console.log('[DEBUG] Anchor clicked:', anchor);
            e.preventDefault();
            e.stopPropagation();

            if (Date.now() - this.lastDragEvent < 100) {
                console.log('[DEBUG] Ignoring click due to recent drag');
                return;
            }

            if (marker === this.temporaryAnchor.marker) {
                console.log('[DEBUG] Clicked temporary anchor, converting to permanent');
                this.turnIntoPermanentAnchor();
                return;
            }

            if (e.shiftKey) {
                console.log('[DEBUG] Shift-click detected, deleting anchor');
                this.deleteAnchor(anchor);
                return;
            }

            // If the anchor has an ID, activate it in the timing store
            if (anchor.point._data?.id) {
                console.log('[DEBUG] Setting active anchor for timestamp editing:', anchor.point._data.id);
                anchorTimingStore.setActiveAnchor(anchor.point._data.id);
                return;
            }

            // If no ID, generate one and set up timing
            const anchorId = uuidv4();
            console.log('[DEBUG] Generated new anchorId for existing anchor:', anchorId);
            
            anchor.point._data = {
                ...anchor.point._data,
                id: anchorId
            };

            // Set initial timing data with coordinates
            const coordinates = anchor.point.getCoordinates();
            anchorTimingStore.setTiming(anchorId, {
                coordinates: {
                    lat: coordinates.lat,
                    lon: coordinates.lon
                }
            });
            
            // Activate the timestamp picker
            anchorTimingStore.setActiveAnchor(anchorId);

            // Only show the loop popup if not editing timestamp
            canChangeStart.update(() => {
                if (anchor.point._data.index === 0) {
                    return false;
                }
                let segment = anchor.segment;
                if (distance(segment.trkpt[0].getCoordinates(), segment.trkpt[segment.trkpt.length - 1].getCoordinates()) > 1000) {
                    return false;
                }
                return true;
            });

            marker.setPopup(this.popup);
            marker.togglePopup();

            let deleteThisAnchor = this.getDeleteAnchor(anchor);
            this.popupElement.addEventListener('delete', deleteThisAnchor);
            let startLoopAtThisAnchor = this.getStartLoopAtAnchor(anchor);
            this.popupElement.addEventListener('change-start', startLoopAtThisAnchor);
            this.popup.once('close', () => {
                this.popupElement.removeEventListener('delete', deleteThisAnchor);
                this.popupElement.removeEventListener('change-start', startLoopAtThisAnchor);
            });
        };
    }

    toggleAnchorsForZoomLevelAndBounds() { // Show markers only if they are in the current zoom level and bounds
        this.shownAnchors.splice(0, this.shownAnchors.length);

        let center = this.map.getCenter();
        let bottomLeft = this.map.unproject([0, this.map.getCanvas().height]);
        let topRight = this.map.unproject([this.map.getCanvas().width, 0]);
        let diagonal = bottomLeft.distanceTo(topRight);

        let zoom = this.map.getZoom();
        this.anchors.forEach((anchor) => {
            anchor.inZoom = anchor.point._data.zoom <= zoom;
            if (anchor.inZoom && center.distanceTo(anchor.marker.getLngLat()) < diagonal) {
                anchor.marker.addTo(this.map);
                this.shownAnchors.push(anchor);
            } else {
                anchor.marker.remove();
            }
        });
    }

    showTemporaryAnchor(e: any) {
        if (this.temporaryAnchor.marker.getElement().classList.contains('cursor-grabbing')) { // Do not not change the source point if it is already being dragged
            return;
        }

        if (get(streetViewEnabled)) {
            return;
        }

        if (!get(selection).hasAnyParent(new ListTrackSegmentItem(this.fileId, e.features[0].properties.trackIndex, e.features[0].properties.segmentIndex))) {
            return;
        }

        if (this.temporaryAnchorCloseToOtherAnchor(e)) {
            return;
        }

        this.temporaryAnchor.point.setCoordinates({
            lat: e.lngLat.lat,
            lon: e.lngLat.lng
        });
        this.temporaryAnchor.marker.setLngLat(e.lngLat).addTo(this.map);

        this.map.on('mousemove', this.updateTemporaryAnchorBinded);
    }

    updateTemporaryAnchor(e: any) {
        if (this.temporaryAnchor.marker.getElement().classList.contains('cursor-grabbing')) { // Do not hide if it is being dragged, and stop listening for mousemove
            this.map.off('mousemove', this.updateTemporaryAnchorBinded);
            return;
        }

        if (e.point.dist(this.map.project(this.temporaryAnchor.point.getCoordinates())) > 20 || this.temporaryAnchorCloseToOtherAnchor(e)) { // Hide if too far from the layer
            this.temporaryAnchor.marker.remove();
            this.map.off('mousemove', this.updateTemporaryAnchorBinded);
            return;
        }

        this.temporaryAnchor.marker.setLngLat(e.lngLat); // Update the position of the temporary anchor
    }

    temporaryAnchorCloseToOtherAnchor(e: any) {
        for (let anchor of this.shownAnchors) {
            if (e.point.dist(this.map.project(anchor.marker.getLngLat())) < 10) {
                return true;
            }
        }
        return false;
    }

    async moveAnchor(anchorWithMarker: AnchorWithMarker) {
        console.log('[DEBUG] moveAnchor called with:', anchorWithMarker);
        let coordinates = {
            lat: anchorWithMarker.marker.getLngLat().lat,
            lon: anchorWithMarker.marker.getLngLat().lng
        };

        let anchor = anchorWithMarker as Anchor;
        if (anchorWithMarker === this.temporaryAnchor) {
            console.log('[DEBUG] Converting temporary anchor to permanent');
            this.temporaryAnchor.marker.remove();
            anchor = this.getPermanentAnchor();
            
            // When creating a new permanent anchor, prompt for timestamp
            const anchorId = uuidv4();
            console.log('[DEBUG] Generated new anchorId:', anchorId);
            
            if (anchor?.point?._data) {
                console.log('[DEBUG] Setting anchor data and activating timestamp picker');
                anchor.point._data.id = anchorId;
                anchor.point._data.anchor = true;
                
                // Set initial timing data with coordinates
                anchorTimingStore.setTiming(anchorId, {
                    coordinates: {
                        lat: coordinates.lat,
                        lon: coordinates.lon
                    }
                });
                
                // Activate the timestamp picker
                anchorTimingStore.setActiveAnchor(anchorId);
                console.log('[DEBUG] Current anchor timing store state:', get(anchorTimingStore));
            } else {
                console.warn('[DEBUG] No _data object on anchor point');
            }
        }

        const [previousAnchor, nextAnchor] = this.getNeighbouringAnchors(anchor);

        let anchors: Anchor[] = [];
        let targetCoordinates: Coordinates[] = [];

        if (previousAnchor) {
            anchors.push(previousAnchor);
            const coords = previousAnchor.point?.getCoordinates();
            if (coords) {
                targetCoordinates.push(coords);
            }
        }

        anchors.push(anchor);
        targetCoordinates.push(coordinates);

        if (nextAnchor) {
            anchors.push(nextAnchor);
            const coords = nextAnchor.point?.getCoordinates();
            if (coords) {
                targetCoordinates.push(coords);
            }
        }

        let success = await this.routeBetweenAnchors(anchors, targetCoordinates);

        if (!success && anchorWithMarker?.point) {
            const coords = anchorWithMarker.point.getCoordinates();
            if (coords) {
                anchorWithMarker.marker.setLngLat(coords);
            }
        }
    }

    getPermanentAnchor(): Anchor {
        let file = get(this.file)?.file;

        // Find the point closest to the temporary anchor
        let minDetails: any = { distance: Number.MAX_VALUE };
        let minAnchor = this.temporaryAnchor as Anchor;
        file?.forEachSegment((segment, trackIndex, segmentIndex) => {
            if (get(selection).hasAnyParent(new ListTrackSegmentItem(this.fileId, trackIndex, segmentIndex))) {
                let details: any = {};
                let closest = getClosestLinePoint(segment.trkpt, this.temporaryAnchor.point, details);
                if (details.distance < minDetails.distance) {
                    minDetails = details;
                    minAnchor = {
                        point: closest,
                        segment,
                        trackIndex,
                        segmentIndex
                    };
                }
            }
        });

        if (minAnchor.point._data.anchor) {
            minAnchor.point = minAnchor.point.clone();
            if (minDetails.before) {
                minAnchor.point._data.index = minAnchor.point._data.index + 0.5;
            } else {
                minAnchor.point._data.index = minAnchor.point._data.index - 0.5;
            }
        }

        return minAnchor;
    }

    turnIntoPermanentAnchor() {
        console.log('[DEBUG] turnIntoPermanentAnchor called');
        let file = get(this.file);
        if (!file) {
            console.warn('[DEBUG] No file available');
            return;
        }

        // Find the point closest to the temporary anchor
        let minDetails: any = { distance: Number.MAX_VALUE };
        let minInfo = {
            point: this.temporaryAnchor.point,
            trackIndex: -1,
            segmentIndex: -1,
            trkptIndex: -1
        };

        file?.file.forEachSegment((segment, trackIndex, segmentIndex) => {
            console.log(`[DEBUG] Processing segment ${trackIndex}:${segmentIndex}`);
            if (get(selection).hasAnyParent(new ListTrackSegmentItem(this.fileId, trackIndex, segmentIndex))) {
                let details: any = {};
                getClosestLinePoint(segment.trkpt, this.temporaryAnchor.point, details);
                if (details.distance < minDetails.distance) {
                    console.log('[DEBUG] Found closer point:', details);
                    minDetails = details;
                    let before = details.before ? details.index : details.index - 1;

                    let projectedPt = projectedPoint(segment.trkpt[before], segment.trkpt[before + 1], this.temporaryAnchor.point);
                    let ratio = distance(segment.trkpt[before], projectedPt) / distance(segment.trkpt[before], segment.trkpt[before + 1]);

                    let point = segment.trkpt[before].clone();
                    point.setCoordinates(projectedPt);
                    point.ele = (1 - ratio) * (segment.trkpt[before].ele ?? 0) + ratio * (segment.trkpt[before + 1].ele ?? 0);
                    point.time = (segment.trkpt[before].time && segment.trkpt[before + 1].time) ? new Date((1 - ratio) * segment.trkpt[before].time.getTime() + ratio * segment.trkpt[before + 1].time.getTime()) : undefined;
                    point._data = {
                        anchor: true,
                        zoom: 0
                    };

                    minInfo = {
                        point,
                        trackIndex,
                        segmentIndex,
                        trkptIndex: before + 1
                    };
                }
            }
        });

        if (minInfo.trackIndex !== -1) {
            console.log('[DEBUG] Applying permanent anchor:', minInfo);
            const anchorId = uuidv4();
            console.log('[DEBUG] Generated anchorId for permanent anchor:', anchorId);
            
            minInfo.point._data = {
                ...minInfo.point._data,
                id: uuidv4()
            };

            // Set initial timing data with coordinates
            const coordinates = minInfo.point.getCoordinates();
            anchorTimingStore.setTiming(anchorId, {
                coordinates: {
                    lat: coordinates.lat,
                    lon: coordinates.lon
                }
            });
            
            dbUtils.applyToFile(this.fileId, (file) => {
                console.log('[DEBUG] Replacing track points with new anchor');
                file.replaceTrackPoints(minInfo.trackIndex, minInfo.segmentIndex, minInfo.trkptIndex, minInfo.trkptIndex - 1, [minInfo.point]);
            });
            
            console.log('[DEBUG] Setting active anchor in timing store');
            anchorTimingStore.setActiveAnchor(anchorId);
        } else {
            console.warn('[DEBUG] No valid track index found for permanent anchor');
        }
    }

    getDeleteAnchor(anchor: Anchor) {
        return () => this.deleteAnchor(anchor);
    }

    async deleteAnchor(anchor: Anchor) { // Remove the anchor and route between the neighbouring anchors if they exist
        this.popup.remove();

        let [previousAnchor, nextAnchor] = this.getNeighbouringAnchors(anchor);

        if (previousAnchor === null && nextAnchor === null) { // Only one point, remove it
            dbUtils.applyToFile(this.fileId, (file) => file.replaceTrackPoints(anchor.trackIndex, anchor.segmentIndex, 0, 0, []));
        } else if (previousAnchor === null) { // First point, remove trackpoints until nextAnchor
            dbUtils.applyToFile(this.fileId, (file) => file.replaceTrackPoints(anchor.trackIndex, anchor.segmentIndex, 0, nextAnchor.point._data.index - 1, []));
        } else if (nextAnchor === null) { // Last point, remove trackpoints from previousAnchor
            dbUtils.applyToFile(this.fileId, (file) => {
                let segment = file.getSegment(anchor.trackIndex, anchor.segmentIndex);
                file.replaceTrackPoints(anchor.trackIndex, anchor.segmentIndex, previousAnchor.point._data.index + 1, segment.trkpt.length - 1, []);
            });
        } else { // Route between previousAnchor and nextAnchor
            this.routeBetweenAnchors([previousAnchor, nextAnchor], [previousAnchor.point.getCoordinates(), nextAnchor.point.getCoordinates()]);
        }
    }

    getStartLoopAtAnchor(anchor: Anchor) {
        return () => this.startLoopAtAnchor(anchor);
    }

    startLoopAtAnchor(anchor: Anchor) {
        this.popup.remove();

        let fileWithStats = get(this.file);
        if (!fileWithStats) {
            return;
        }

        let speed = fileWithStats.statistics.getStatisticsFor(new ListTrackSegmentItem(this.fileId, anchor.trackIndex, anchor.segmentIndex)).global.speed.moving;

        let segment = anchor.segment;
        dbUtils.applyToFile(this.fileId, (file) => {
            file.replaceTrackPoints(anchor.trackIndex, anchor.segmentIndex, segment.trkpt.length, segment.trkpt.length - 1, segment.trkpt.slice(0, anchor.point._data.index), speed > 0 ? speed : undefined);
            file.crop(anchor.point._data.index, anchor.point._data.index + segment.trkpt.length - 1, [anchor.trackIndex], [anchor.segmentIndex]);
        });
    }

    async appendAnchor(e: mapboxgl.MapMouseEvent) { // Add a new anchor to the end of the last segment
        if (get(streetViewEnabled) && get(streetViewSource) === 'google') {
            return;
        }

        this.appendAnchorWithCoordinates({
            lat: e.lngLat.lat,
            lon: e.lngLat.lng
        });
    }

    async appendAnchorWithCoordinates(coordinates: Coordinates) { // Add a new anchor to the end of the last segment
        let selected = getOrderedSelection();
        if (selected.length === 0 || selected[selected.length - 1].getFileId() !== this.fileId) {
            return;
        }
        let item = selected[selected.length - 1];

        let lastAnchor = this.anchors[this.anchors.length - 1];

        let newPoint = new TrackPoint({
            attributes: coordinates
        });
        newPoint._data.anchor = true;
        newPoint._data.zoom = 0;

        if (!lastAnchor) {
            dbUtils.applyToFile(this.fileId, (file) => {
                let trackIndex = file.trk.length > 0 ? file.trk.length - 1 : 0;
                if (item instanceof ListTrackItem || item instanceof ListTrackSegmentItem) {
                    trackIndex = item.getTrackIndex();
                }
                let segmentIndex = (file.trk.length > 0 && file.trk[trackIndex].trkseg.length > 0) ? file.trk[trackIndex].trkseg.length - 1 : 0;
                if (item instanceof ListTrackSegmentItem) {
                    segmentIndex = item.getSegmentIndex();
                }
                if (file.trk.length === 0) {
                    let track = new Track();
                    track.replaceTrackPoints(0, 0, 0, [newPoint]);
                    file.replaceTracks(0, 0, [track]);
                } else if (file.trk[trackIndex].trkseg.length === 0) {
                    let segment = new TrackSegment();
                    segment.replaceTrackPoints(0, 0, [newPoint]);
                    file.replaceTrackSegments(trackIndex, 0, 0, [segment]);
                } else {
                    file.replaceTrackPoints(trackIndex, segmentIndex, 0, 0, [newPoint]);
                }
            });
            return;
        }

        newPoint._data.index = lastAnchor.segment.trkpt.length - 1; // Do as if the point was the last point in the segment
        let newAnchor = {
            point: newPoint,
            segment: lastAnchor.segment,
            trackIndex: lastAnchor.trackIndex,
            segmentIndex: lastAnchor.segmentIndex
        };

        await this.routeBetweenAnchors([lastAnchor, newAnchor], [lastAnchor.point.getCoordinates(), newAnchor.point.getCoordinates()]);
    }

    getNeighbouringAnchors(anchor: Anchor): [Anchor | null, Anchor | null] {
        let previousAnchor: Anchor | null = null;
        let nextAnchor: Anchor | null = null;

        for (let i = 0; i < this.anchors.length; i++) {
            if (this.anchors[i].segment === anchor.segment && this.anchors[i].inZoom) {
                if (this.anchors[i].point._data.index < anchor.point._data.index) {
                    if (!previousAnchor || this.anchors[i].point._data.index > previousAnchor.point._data.index) {
                        previousAnchor = this.anchors[i];
                    }
                } else if (this.anchors[i].point._data.index > anchor.point._data.index) {
                    if (!nextAnchor || this.anchors[i].point._data.index < nextAnchor.point._data.index) {
                        nextAnchor = this.anchors[i];
                    }
                }
            }
        }

        return [previousAnchor, nextAnchor];
    }

    async routeBetweenAnchors(anchors: Anchor[], targetCoordinates: Coordinates[]): Promise<boolean> {
        let segment = anchors[0].segment;

        let fileWithStats = get(this.file);
        if (!fileWithStats) {
            return false;
        }

        if (anchors.length === 1) {
            // Only one anchor, preserve its timestamp and notes if they exist
            const newPoint = new TrackPoint({
                attributes: targetCoordinates[0],
            });
            if (anchors[0].point.time) {
                newPoint.time = anchors[0].point.time;
            }
            if (anchors[0].point._data?.notes) {
                newPoint._data = {
                    ...newPoint._data,
                    notes: anchors[0].point._data.notes
                };
            }
            dbUtils.applyToFile(this.fileId, (file) => 
                file.replaceTrackPoints(anchors[0].trackIndex, anchors[0].segmentIndex, 0, 0, [newPoint])
            );
            return true;
        }

        let response: TrackPoint[];
        try {
            response = await route(targetCoordinates);
        } catch (e: any) {
            if (e.message.includes('from-position not mapped in existing datafile')) {
                toast.error(get(_)("toolbar.routing.error.from"));
            } else if (e.message.includes('via1-position not mapped in existing datafile')) {
                toast.error(get(_)("toolbar.routing.error.via"));
            } else if (e.message.includes('to-position not mapped in existing datafile')) {
                toast.error(get(_)("toolbar.routing.error.to"));
            } else if (e.message.includes('Time-out')) {
                toast.error(get(_)("toolbar.routing.error.timeout"));
            } else {
                toast.error(e.message);
            }
            return false;
        }

        // Handle first anchor point
        if (anchors[0].point._data?.index === 0) {
            anchors[0].point = response[0];
            anchors[0].point._data = anchors[0].point._data || {};
            anchors[0].point._data.index = 0;
            
            // Preserve timestamp and notes
            if (anchors[0].point.time) {
                response[0].time = anchors[0].point.time;
            }
            if (anchors[0].point._data?.notes) {
                response[0]._data = response[0]._data || {};
                response[0]._data.notes = anchors[0].point._data.notes;
            }
            
            // Update timing store if this is a new anchor
            const anchorId = anchors[0].point._data?.id;
            if (anchorId) {
                const timing = anchorTimingStore.get(anchorId);
                if (timing) {
                    response[0].time = timing.timestamp;
                    response[0]._data = response[0]._data || {};
                    response[0]._data.notes = timing.notes;
                }
            }
        } else if (anchors[0].point._data.index === segment.trkpt.length - 1 && 
                   distance(anchors[0].point.getCoordinates(), response[0].getCoordinates()) < 1) {
            anchors[0].point = response[0];
            anchors[0].point._data.index = segment.trkpt.length - 1;
            // Preserve timestamp and notes
            if (anchors[0].point.time) {
                response[0].time = anchors[0].point.time;
            }
            if (anchors[0].point._data?.notes) {
                response[0]._data = {
                    ...response[0]._data,
                    notes: anchors[0].point._data.notes
                };
            }
        } else {
            anchors[0].point = anchors[0].point.clone();
            response.splice(0, 0, anchors[0].point);
        }

        // Handle last anchor point
        if (anchors[anchors.length - 1].point._data.index === segment.trkpt.length - 1) {
            anchors[anchors.length - 1].point = response[response.length - 1];
            anchors[anchors.length - 1].point._data.index = segment.trkpt.length - 1;
            // Preserve timestamp and notes
            const lastAnchor = anchors[anchors.length - 1];
            if (lastAnchor.point.time) {
                response[response.length - 1].time = lastAnchor.point.time;
            }
            if (lastAnchor.point._data?.notes) {
                response[response.length - 1]._data = {
                    ...response[response.length - 1]._data,
                    notes: lastAnchor.point._data.notes
                };
            }
        } else {
            anchors[anchors.length - 1].point = anchors[anchors.length - 1].point.clone();
            response.push(anchors[anchors.length - 1].point);
        }

        // Handle intermediate anchors
        for (let i = 1; i < anchors.length - 1; i++) {
            const closestPoint = getClosestLinePoint(response.slice(1, -1), targetCoordinates[i]);
            if (closestPoint) {
                anchors[i].point = closestPoint;
                // Preserve timestamp and notes for intermediate anchors
                if (anchors[i].point.time) {
                    closestPoint.time = anchors[i].point.time;
                }
                if (anchors[i].point._data?.notes) {
                    closestPoint._data = {
                        ...closestPoint._data,
                        notes: anchors[i].point._data.notes
                    };
                }
            }
        }

        // Set anchor properties
        anchors.forEach((anchor) => {
            if (anchor.point._data) {
                anchor.point._data.anchor = true;
                anchor.point._data.zoom = 0;
            }
        });

        // Check if we should use anchor timestamps
        let useAnchorTimestamps = false;
        const firstPoint = anchors[0]?.point;
        const lastPoint = anchors[anchors.length - 1]?.point;
        
        if (firstPoint?.time !== undefined && lastPoint?.time !== undefined) {
            useAnchorTimestamps = true;
            // Verify all intermediate anchors with timestamps are in chronological order
            for (let i = 1; i < anchors.length - 1; i++) {
                const currentPoint = anchors[i]?.point;
                if (currentPoint?.time !== undefined) {
                    const prevTime = anchors[i - 1]?.point?.time;
                    const nextTime = anchors[i + 1]?.point?.time;
                    if (prevTime && nextTime && (
                        currentPoint.time < prevTime || 
                        currentPoint.time > nextTime
                    )) {
                        useAnchorTimestamps = false;
                        break;
                    }
                }
            }
        }

        let speed: number | undefined = undefined;
        let startTime = firstPoint?.time;

        if (!useAnchorTimestamps) {
            // Use original speed-based timing logic
            let stats = fileWithStats.statistics.getStatisticsFor(
                new ListTrackSegmentItem(this.fileId, anchors[0].trackIndex, anchors[0].segmentIndex)
            );

            if (stats.global.speed.moving > 0) {
                let replacingDistance = 0;
                for (let i = 1; i < response.length; i++) {
                    replacingDistance += distance(response[i - 1].getCoordinates(), response[i].getCoordinates()) / 1000;
                }

                const startIndex = firstPoint?._data?.index;
                const endIndex = lastPoint?._data?.index;
                
                if (typeof startIndex === 'number' && 
                    typeof endIndex === 'number' && 
                    stats.local.distance.moving[startIndex] !== undefined && 
                    stats.local.distance.moving[endIndex] !== undefined &&
                    stats.local.time.moving[startIndex] !== undefined &&
                    stats.local.time.moving[endIndex] !== undefined &&
                    stats.local.time.total[startIndex] !== undefined &&
                    stats.local.time.total[endIndex] !== undefined) {
                    
                    let replacedDistance = stats.local.distance.moving[endIndex] - 
                                         stats.local.distance.moving[startIndex];

                    let newDistance = stats.global.distance.moving + replacingDistance - replacedDistance;
                    let newTime = newDistance / stats.global.speed.moving * 3600;

                    let remainingTime = stats.global.time.moving - 
                                      (stats.local.time.moving[endIndex] - 
                                       stats.local.time.moving[startIndex]);
                    let replacingTime = newTime - remainingTime;

                    if (replacingTime <= 0) {
                        replacingTime = stats.local.time.total[endIndex] - 
                                      stats.local.time.total[startIndex];
                    }

                    speed = replacingDistance / replacingTime * 3600;

                    if (startTime === undefined && segment.trkpt[endIndex]?.time) {
                        const endTime = segment.trkpt[endIndex].time.getTime();
                        startTime = new Date(endTime - 
                                       (replacingTime + stats.local.time.total[endIndex] - 
                                        stats.local.time.moving[endIndex]) * 1000);
                    }
                }
            }
        }

        // Apply the changes to the file
        dbUtils.applyToFile(this.fileId, (file) => 
            file.replaceTrackPoints(
                anchors[0].trackIndex,
                anchors[0].segmentIndex,
                firstPoint?._data?.index ?? 0,
                lastPoint?._data?.index ?? 0,
                response,
                useAnchorTimestamps ? undefined : speed,
                useAnchorTimestamps ? undefined : startTime
            )
        );

        return true;
    }

    destroy() {
        this.remove();
        this.unsubscribes.forEach((unsubscribe) => unsubscribe());
    }
}

type Anchor = {
    segment: TrackSegment;
    trackIndex: number;
    segmentIndex: number;
    point: TrackPoint;
};

type AnchorWithMarker = Anchor & {
    marker: mapboxgl.Marker;
    inZoom: boolean;
};
