import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface Coordinates {
    lat: number;
    lon: number;
}

export interface AnchorTiming {
    timestamp?: Date;
    notes?: string;
    coordinates: Coordinates;
}

export interface AnchorTimingState {
    timings: Map<string, AnchorTiming>;
    activeAnchorId: string | null;
}

const STORAGE_KEY = 'gpx-studio:anchor-timings';

// Helper function to serialize Map for storage
function serializeState(state: AnchorTimingState): string {
    return JSON.stringify({
        timings: Array.from(state.timings.entries()),
        activeAnchorId: state.activeAnchorId
    });
}

// Helper function to deserialize Map from storage
function deserializeState(json: string): AnchorTimingState {
    try {
        const data = JSON.parse(json);
        return {
            timings: new Map(data.timings.map((entry: [string, any]) => [
                entry[0],
                {
                    ...entry[1],
                    timestamp: entry[1].timestamp ? new Date(entry[1].timestamp) : undefined
                }
            ])),
            activeAnchorId: data.activeAnchorId
        };
    } catch (e) {
        console.error('[DEBUG] Error deserializing anchor timing state:', e);
        return {
            timings: new Map(),
            activeAnchorId: null
        };
    }
}

function getInitialState(): AnchorTimingState {
    if (browser) {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            return deserializeState(savedState);
        }
    }
    return {
        timings: new Map(),
        activeAnchorId: null
    };
}

function createAnchorTimingStore() {
    const { subscribe, set, update } = writable<AnchorTimingState>(getInitialState());

    // Only set up localStorage subscription in browser environment
    if (browser) {
        subscribe(state => {
            try {
                localStorage.setItem(STORAGE_KEY, serializeState(state));
            } catch (e) {
                console.error('[DEBUG] Error saving anchor timing state:', e);
            }
        });
    }

    return {
        subscribe,
        get: (anchorId: string): AnchorTiming | undefined => {
            const state = get({ subscribe });
            return state.timings.get(anchorId);
        },
        setTiming: (anchorId: string, timing: Partial<AnchorTiming> & { coordinates: Coordinates }) => 
            update(state => {
                console.log('[DEBUG] Setting timing for anchor:', anchorId, timing);
                const newTimings = new Map(state.timings);
                const existingTiming = newTimings.get(anchorId);
                newTimings.set(anchorId, {
                    timestamp: timing.timestamp || existingTiming?.timestamp,
                    notes: timing.notes || existingTiming?.notes || '',
                    coordinates: timing.coordinates
                });
                return { ...state, timings: newTimings };
            }),
        removeTiming: (anchorId: string) =>
            update(state => {
                console.log('[DEBUG] Removing timing for anchor:', anchorId);
                const newTimings = new Map(state.timings);
                newTimings.delete(anchorId);
                return { ...state, timings: newTimings };
            }),
        setActiveAnchor: (anchorId: string | null) =>
            update(state => {
                console.log('[DEBUG] Setting active anchor:', anchorId);
                return { ...state, activeAnchorId: anchorId };
            }),
        validateTiming: (anchorId: string, timestamp: Date): boolean => {
            const state = get({ subscribe });
            const timings = Array.from(state.timings.entries());
            
            // Sort timings by timestamp
            timings.sort((a, b) => {
                if (!a[1].timestamp || !b[1].timestamp) return 0;
                return a[1].timestamp.getTime() - b[1].timestamp.getTime();
            });
            
            // Find the index of our anchor
            const index = timings.findIndex(entry => entry[0] === anchorId);
            if (index === -1) return true;
            
            // Check if timestamp maintains chronological order
            const prev = index > 0 ? timings[index - 1][1].timestamp : null;
            const next = index < timings.length - 1 ? timings[index + 1][1].timestamp : null;
            
            if (prev && timestamp < prev) return false;
            if (next && timestamp > next) return false;
            
            return true;
        },
        clear: () => {
            console.log('[DEBUG] Clearing anchor timing store');
            if (browser) {
                localStorage.removeItem(STORAGE_KEY);
            }
            set({ timings: new Map(), activeAnchorId: null });
        }
    };
}

export const anchorTimingStore = createAnchorTimingStore();

// Derived store for ordered anchor timings
export const orderedAnchorTimings = derived(
    anchorTimingStore,
    $store => Array.from($store.timings.entries())
        .sort((a, b) => {
            if (!a[1].timestamp || !b[1].timestamp) return 0;
            return a[1].timestamp.getTime() - b[1].timestamp.getTime();
        })
);