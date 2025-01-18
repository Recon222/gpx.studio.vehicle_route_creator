<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { animationStore } from '$lib/stores/animation';
    import type { Map as MapboxMap, Marker } from 'mapbox-gl';
    import { map } from '$lib/stores/map';
    import { fade } from 'svelte/transition';

    export let vehicleId: string;
    
    let marker: Marker;
    let currentRotation = 0;

    $: if ($animationStore.currentPosition && marker) {
        const { longitude, latitude, heading } = $animationStore.currentPosition;
        
        // Smooth rotation
        let targetRotation = heading || 0;
        
        // Normalize rotations
        while (targetRotation - currentRotation > 180) targetRotation -= 360;
        while (targetRotation - currentRotation < -180) targetRotation += 360;
        
        // Interpolate rotation
        currentRotation += (targetRotation - currentRotation) * 0.1;
        
        // Update marker
        marker.setLngLat([longitude, latitude])
              .setRotation(currentRotation);
    }

    onMount(() => {
        if (!$map) return;

        // Create marker element
        const el = document.createElement('div');
        el.className = 'vehicle-marker';
        
        // Create marker
        marker = new Marker({
            element: el,
            rotationAlignment: 'map'
        })
        .setLngLat([0, 0])
        .addTo($map);

        // Initial position
        if ($animationStore.currentPosition) {
            const { longitude, latitude, heading } = $animationStore.currentPosition;
            currentRotation = heading || 0;
            marker.setLngLat([longitude, latitude])
                  .setRotation(currentRotation);
        }
    });

    onDestroy(() => {
        if (marker) {
            marker.remove();
        }
    });
</script>

<style lang="postcss">
    :global(.vehicle-marker) {
        width: 24px;
        height: 24px;
        background-color: theme(colors.primary.DEFAULT);
        border: 2px solid theme(colors.white);
        border-radius: 50%;
        box-shadow: theme(boxShadow.md);
        cursor: pointer;
        transition: transform 150ms ease;
    }

    :global(.vehicle-marker::after) {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 0 6px 12px 6px;
        border-color: transparent transparent theme(colors.primary.DEFAULT) transparent;
        transform: translate(-50%, -50%) rotate(-45deg);
        transform-origin: center;
    }

    :global(.vehicle-marker:hover) {
        transform: scale(1.1);
    }
</style> 