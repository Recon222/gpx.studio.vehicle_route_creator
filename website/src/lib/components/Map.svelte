<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import mapboxgl from 'mapbox-gl';
	import 'mapbox-gl/dist/mapbox-gl.css';

	import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
	import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

	import { Button } from '$lib/components/ui/button';
	import { map } from '$lib/stores';
	import { settings } from '$lib/db';
	import { _ } from 'svelte-i18n';
	import { PUBLIC_MAPBOX_TOKEN } from '$env/static/public';
	import { page } from '$app/stores';
	import type { Map as MapboxMap } from 'mapbox-gl';

	export let accessToken = PUBLIC_MAPBOX_TOKEN;
	export let geolocate = true;
	export let geocoder = true;
	export let hash = true;

	mapboxgl.accessToken = accessToken;

	let webgl2Supported = true;
	let fitBoundsOptions: mapboxgl.FitBoundsOptions = {
		maxZoom: 15,
		linear: true,
		easing: () => 1
	};

	const { distanceUnits, elevationProfile, treeFileView, bottomPanelSize, rightPanelSize } =
		settings;
	let scaleControl = new mapboxgl.ScaleControl({
		unit: $distanceUnits
	});

	onMount(() => {
		let gl = document.createElement('canvas').getContext('webgl2');
		if (!gl) {
			webgl2Supported = false;
			return;
		}

		let language = $page.params.language;
		if (language === 'zh') {
			language = 'zh-Hans';
		} else if (language?.includes('-')) {
			language = language.split('-')[0];
		} else if (language === '' || language === undefined) {
			language = 'en';
		}

		let newMap = new mapboxgl.Map({
			container: 'map',
			style: {
				version: 8,
				sources: {},
				layers: [],
				imports: [
					{
						id: 'glyphs-and-sprite', // make Mapbox glyphs and sprite available to other styles
						url: '',
						data: {
							version: 8,
							sources: {},
							layers: [],
							glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
							sprite: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/sprite?access_token=${PUBLIC_MAPBOX_TOKEN}`
						}
					},
					{
						id: 'basemap',
						url: ''
					},
					{
						id: 'overlays',
						url: '',
						data: {
							version: 8,
							sources: {},
							layers: []
						}
					}
				]
			},
			projection: 'globe',
			zoom: 0,
			hash: hash,
			language,
			attributionControl: false,
			logoPosition: 'bottom-right',
			boxZoom: false
		});
		newMap.on('load', () => {
			$map = newMap; // only set the store after the map has loaded
			window._map = newMap; // entry point for extensions
			scaleControl.setUnit($distanceUnits);
		});

		newMap.addControl(
			new mapboxgl.AttributionControl({
				compact: true
			})
		);

		newMap.addControl(
			new mapboxgl.NavigationControl({
				visualizePitch: true
			})
		);

		if (geocoder) {
			let geocoderControl = new MapboxGeocoder({
				mapboxgl: mapboxgl as any,
				accessToken: accessToken,
				enableEventLogging: false,
				collapsed: true,
				flyTo: fitBoundsOptions,
				language
			});
			
			geocoderControl.on('keydown', (e: KeyboardEvent) => {
				if (e.key === 'Enter') {
					const input = document.querySelector('.mapboxgl-ctrl-geocoder--input');
					if (input instanceof HTMLInputElement && input.value) {
						geocoderControl.query(input.value);
					}
				}
			});

			geocoderControl.on('results', () => {
				const input = document.querySelector('.mapboxgl-ctrl-geocoder--input');
				if (input instanceof HTMLInputElement && !input.value) {
					geocoderControl.clear();
				}
			});

			newMap.addControl(geocoderControl);
		}

		if (geolocate) {
			newMap.addControl(
				new mapboxgl.GeolocateControl({
					positionOptions: {
						enableHighAccuracy: true
					},
					fitBoundsOptions,
					trackUserLocation: true,
					showUserHeading: true
				})
			);
		}

		newMap.addControl(scaleControl);

		newMap.on('style.load', () => {
			newMap.addSource('mapbox-dem', {
				type: 'raster-dem',
				url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
				tileSize: 512,
				maxzoom: 14
			});
			if (newMap.getPitch() > 0) {
				newMap.setTerrain({
					source: 'mapbox-dem',
					exaggeration: 1
				});
			}
			newMap.setFog({
				color: 'rgb(186, 210, 235)',
				'high-color': 'rgb(36, 92, 223)',
				'horizon-blend': 0.1,
				'space-color': 'rgb(156, 240, 255)'
			});
			newMap.on('pitch', () => {
				if (newMap.getPitch() > 0) {
					newMap.setTerrain({
						source: 'mapbox-dem',
						exaggeration: 1
					});
				} else {
					newMap.setTerrain(null);
				}
			});
		});
	});

	onDestroy(() => {
		if ($map) {
			$map.remove();
			$map = null;
		}
	});

	$: if ($map && (!$treeFileView || !$elevationProfile || $bottomPanelSize || $rightPanelSize)) {
		$map.resize();
	}
</script>

<div {...$$restProps}>
	<div id="map" class="h-full {webgl2Supported ? '' : 'hidden'}">
		<!-- VehicleLayer removed -->
	</div>
	<div
		class="flex flex-col items-center justify-center gap-3 h-full {webgl2Supported ? 'hidden' : ''}"
	>
		<p>{$_('webgl2_required')}</p>
		<Button href="https://get.webgl.org/webgl2/" target="_blank">
			{$_('enable_webgl2')}
		</Button>
	</div>
</div>

<style lang="postcss">
	:global(.mapboxgl-map) {
		@apply font-sans;
	}

	:global(.mapboxgl-ctrl-top-right > .mapboxgl-ctrl) {
		@apply shadow-md bg-background text-foreground;
	}

	:global(.mapboxgl-ctrl-icon) {
		@apply dark:brightness-[4.7];
	}

	:global(.mapboxgl-ctrl-geocoder) {
		@apply flex flex-row w-fit min-w-fit items-center shadow-md;
	}

	:global(.suggestions) {
		@apply shadow-md bg-background text-foreground;
	}

	:global(.mapboxgl-ctrl-geocoder .suggestions > li > a) {
		@apply text-foreground hover:text-accent-foreground hover:bg-accent;
	}

	:global(.mapboxgl-ctrl-geocoder .suggestions > .active > a) {
		@apply bg-background;
	}

	:global(.mapboxgl-ctrl-geocoder--button) {
		@apply bg-transparent hover:bg-transparent;
	}

	:global(.mapboxgl-ctrl-geocoder--icon) {
		@apply fill-foreground hover:fill-accent-foreground;
	}

	:global(.mapboxgl-ctrl-geocoder--icon-search) {
		@apply relative top-0 left-0 my-2 w-[29px];
	}

	:global(.mapboxgl-ctrl-geocoder--input) {
		@apply relative w-64 py-0 pl-2 focus:outline-none transition-[width] duration-200 text-foreground;
	}

	:global(.mapboxgl-ctrl-geocoder--collapsed .mapboxgl-ctrl-geocoder--input) {
		@apply w-0 p-0;
	}

	:global(.mapboxgl-ctrl-top-right) {
		@apply z-40 flex flex-col items-end h-full overflow-hidden;
	}

	.horizontal :global(.mapboxgl-ctrl-bottom-left) {
		@apply bottom-[42px];
	}

	.horizontal :global(.mapboxgl-ctrl-bottom-right) {
		@apply bottom-[42px];
	}

	:global(.mapboxgl-ctrl-attrib) {
		@apply dark:bg-transparent;
	}

	:global(.mapboxgl-compact-show.mapboxgl-ctrl-attrib) {
		@apply dark:bg-background;
	}

	:global(.mapboxgl-ctrl-attrib-button) {
		@apply dark:bg-foreground;
	}

	:global(.mapboxgl-compact-show .mapboxgl-ctrl-attrib-button) {
		@apply dark:bg-foreground;
	}

	:global(.mapboxgl-ctrl-attrib a) {
		@apply text-foreground;
	}

	:global(.mapboxgl-popup) {
		@apply w-fit z-50;
	}

	:global(.mapboxgl-popup-content) {
		@apply p-0 bg-transparent shadow-none;
	}

	:global(.mapboxgl-popup-anchor-top .mapboxgl-popup-tip) {
		@apply border-b-background;
	}

	:global(.mapboxgl-popup-anchor-top-left .mapboxgl-popup-tip) {
		@apply border-b-background;
	}

	:global(.mapboxgl-popup-anchor-top-right .mapboxgl-popup-tip) {
		@apply border-b-background;
	}

	:global(.mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip) {
		@apply border-t-background drop-shadow-md;
	}

	:global(.mapboxgl-popup-anchor-bottom-left .mapboxgl-popup-tip) {
		@apply border-t-background drop-shadow-md;
	}

	:global(.mapboxgl-popup-anchor-bottom-right .mapboxgl-popup-tip) {
		@apply border-t-background drop-shadow-md;
	}

	:global(.mapboxgl-popup-anchor-left .mapboxgl-popup-tip) {
		@apply border-r-background;
	}

	:global(.mapboxgl-popup-anchor-right .mapboxgl-popup-tip) {
		@apply border-l-background;
	}
</style>
