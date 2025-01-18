<script lang="ts">
	import GPXLayers from '$lib/components/gpx-layer/GPXLayers.svelte';
	import ElevationProfile from '$lib/components/ElevationProfile.svelte';
	import FileList from '$lib/components/file-list/FileList.svelte';
	import GPXStatistics from '$lib/components/GPXStatistics.svelte';
	import Map from '$lib/components/Map.svelte';
	import Menu from '$lib/components/Menu.svelte';
	import Toolbar from '$lib/components/toolbar/Toolbar.svelte';
	import StreetViewControl from '$lib/components/street-view-control/StreetViewControl.svelte';
	import LayerControl from '$lib/components/layer-control/LayerControl.svelte';
	import Resizer from '$lib/components/Resizer.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { observeFilesFromDatabase, settings } from '$lib/db';
	import { gpxStatistics, loadFiles, slicedGPXStatistics } from '$lib/stores';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { languages } from '$lib/languages';
	import { getURLForLanguage } from '$lib/utils';
	import { getURLForGoogleDriveFile } from '$lib/components/embedding/Embedding';
	import { _ } from 'svelte-i18n';
	import { Play, ChevronDown } from 'lucide-svelte';
	import { anchorTimingStore } from '$lib/stores/anchor-timing';
	import AnchorTimestampPicker from '$lib/components/anchor-timing/AnchorTimestampPicker.svelte';
	import { toast } from 'svelte-sonner';

	const {
		treeFileView,
		elevationProfile,
		bottomPanelSize,
		rightPanelSize,
		additionalDatasets,
		elevationFill
	} = settings;

	let activeAnchorId: string | null = null;

	// Subscribe to the active anchor ID
	$: {
		if ($anchorTimingStore.activeAnchorId !== activeAnchorId) {
			activeAnchorId = $anchorTimingStore.activeAnchorId;
			console.log('[DEBUG] Active anchor changed in app:', activeAnchorId);
		}
	}

	function handleSaveTimestamp(data: { timestamp: Date; notes: string }) {
		console.log('[DEBUG] Saving timestamp in app:', data);
		if (activeAnchorId) {
			const timing = $anchorTimingStore.timings.get(activeAnchorId);
			if (timing?.coordinates) {
				anchorTimingStore.setTiming(activeAnchorId, {
					coordinates: timing.coordinates,
					timestamp: data.timestamp,
					notes: data.notes
				});
				toast.success('Timestamp saved');
				anchorTimingStore.setActiveAnchor(null); // Close the picker after saving
			} else {
				console.error('[DEBUG] Missing coordinates for anchor:', activeAnchorId);
				toast.error('Error saving timestamp: Missing coordinates');
			}
		}
	}

	function handleCancelTimestamp() {
		console.log('[DEBUG] Cancelling timestamp edit');
		anchorTimingStore.setActiveAnchor(null);
	}

	onMount(() => {
		let files: string[] = JSON.parse($page.url.searchParams.get('files') || '[]');
		let ids: string[] = JSON.parse($page.url.searchParams.get('ids') || '[]');
		let urls: string[] = files.concat(ids.map(getURLForGoogleDriveFile));

		observeFilesFromDatabase(urls.length === 0);

		if (urls.length > 0) {
			let downloads: Promise<File | null>[] = [];
			urls.forEach((url) => {
				downloads.push(
					fetch(url)
						.then((response) => response.blob())
						.then((blob) => {
							const fileName = url.split('/').pop();
							return fileName ? new File([blob], fileName) : null;
						})
				);
			});

			Promise.all(downloads).then((files) => {
				const validFiles = files.filter((file): file is File => file !== null);
				loadFiles(validFiles);
			});
		}
	});
</script>

<div class="fixed -z-10 text-transparent">
	<h1>{$_('metadata.home_title')} — {$_('metadata.app_title')}</h1>
	<p>{$_('metadata.description')}</p>
	<h2>{$_('toolbar.routing.tooltip')}</h2>
	<p>{$_('toolbar.routing.help_no_file')}</p>
	<p>{$_('toolbar.routing.help')}</p>
	<h3>{$_('toolbar.routing.reverse.button')}</h3>
	<p>{$_('toolbar.routing.reverse.tooltip')}</p>
	<h3>{$_('toolbar.routing.route_back_to_start.button')}</h3>
	<p>{$_('toolbar.routing.route_back_to_start.tooltip')}</p>
	<h3>{$_('toolbar.routing.round_trip.button')}</h3>
	<p>{$_('toolbar.routing.round_trip.tooltip')}</p>
	<h3>{$_('toolbar.routing.start_loop_here')}</h3>
	<h2>{$_('toolbar.scissors.tooltip')}</h2>
	<p>{$_('toolbar.scissors.help')}</p>
	<h2>{$_('toolbar.time.tooltip')}</h2>
	<p>{$_('toolbar.time.help')}</p>
	<h2>{$_('toolbar.merge.tooltip')}</h2>
	<h3>{$_('toolbar.merge.merge_traces')}</h3>
	<p>{$_('toolbar.merge.help_merge_traces')}</p>
	<h3>{$_('toolbar.merge.merge_contents')}</h3>
	<p>{$_('toolbar.merge.help_merge_contents')}</p>
	<h2>{$_('toolbar.elevation.button')}</h2>
	<p>{$_('toolbar.elevation.help')}</p>
	<h2>{$_('toolbar.waypoint.tooltip')}</h2>
	<p>{$_('toolbar.waypoint.help')}</p>
	<h2>{$_('toolbar.reduce.tooltip')}</h2>
	<p>{$_('toolbar.reduce.help')}</p>
	<h2>{$_('toolbar.clean.tooltip')}</h2>
	<p>{$_('toolbar.clean.help')}</p>
	<h2>{$_('gpx.files')}, {$_('gpx.tracks')}, {$_('gpx.segments')}, {$_('gpx.waypoints')}</h2>
</div>

<div class="fixed flex flex-row w-screen h-screen supports-dvh:h-dvh">
	<div class="flex flex-col grow h-full min-w-0">
		<div class="grow relative">
			<Menu />
			<div
				class="absolute top-0 bottom-0 left-0 z-20 flex flex-col justify-center pointer-events-none"
			>
				<Toolbar />
			</div>
			<Map class="h-full {$treeFileView ? '' : 'horizontal'}" />
			<StreetViewControl />
			<LayerControl />
			<GPXLayers />
			<Toaster richColors />
			
			{#if activeAnchorId}
				{@const timing = $anchorTimingStore.timings.get(activeAnchorId)}
				{@const debug = console.log('[DEBUG] Attempting to render timestamp picker:', {
					activeAnchorId,
					timing,
					storeState: $anchorTimingStore
				})}
				<div class="absolute top-4 right-4 z-50 bg-red-500/50 p-2">
					<div class="text-white text-xs mb-2">Debug: Timestamp Picker Container</div>
					<AnchorTimestampPicker
						timestamp={timing?.timestamp}
						notes={timing?.notes ?? ''}
						onSave={handleSaveTimestamp}
						onCancel={handleCancelTimestamp}
					/>
				</div>
			{/if}

			{#if !$treeFileView}
				<div class="absolute bottom-[52px] left-0 right-0 h-10 w-full z-50 pointer-events-auto">
					<FileList orientation="horizontal" />
				</div>
			{/if}
		</div>
		{#if $elevationProfile}
			<!-- <Resizer orientation="row" bind:after={$bottomPanelSize} minAfter={100} maxAfter={300} /> -->
		{/if}
		<div
			class="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm z-40"
		>
			<div class="max-w-6xl mx-auto p-2">
				<!-- Controls Row -->
				<div class="flex items-center gap-2">
					<!-- Left side: Play controls and speed -->
					<div class="flex items-center gap-2">
						<!-- Play/Pause Button -->
						<button
							class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20
									flex items-center justify-center transition-colors"
							aria-label="Play"
						>
							<Play class="w-4 h-4 text-white translate-x-0.5" />
						</button>

						<!-- Speed Dropdown -->
						<div class="relative">
							<select
								class="h-8 appearance-none bg-white/10 hover:bg-white/20 rounded px-2 pr-8 text-sm text-white
										focus:outline-none focus:ring-1 focus:ring-white/30"
							>
								<option value="1">1x</option>
								<option value="2">2x</option>
								<option value="4">4x</option>
								<option value="8">8x</option>
							</select>
							<ChevronDown class="w-4 h-4 text-white/70 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
						</div>

						<!-- Current Time -->
						<div class="text-white/70 text-sm">
							00:00:00
						</div>
					</div>
				</div>
			</div>
		</div>
		<!-- Commented out elevation components
		<div
			class="{$elevationProfile ? '' : 'h-10'} flex flex-row gap-2 px-2 sm:px-4"
			style={$elevationProfile ? `height: ${$bottomPanelSize}px` : ''}
		>
			<GPXStatistics
				{gpxStatistics}
				{slicedGPXStatistics}
				panelSize={$bottomPanelSize}
				orientation={$elevationProfile ? 'vertical' : 'horizontal'}
			/>
			{#if $elevationProfile}
				<ElevationProfile
					{gpxStatistics}
					{slicedGPXStatistics}
					bind:additionalDatasets={$additionalDatasets}
					bind:elevationFill={$elevationFill}
				/>
			{/if}
		</div>
		-->
	</div>
	{#if $treeFileView}
		<Resizer orientation="col" bind:after={$rightPanelSize} minAfter={100} maxAfter={400} />
		<FileList orientation="vertical" recursive={true} style="width: {$rightPanelSize}px" />
	{/if}
</div>

<!-- hidden links for svelte crawling -->
<div class="hidden">
	{#each Object.entries(languages) as [lang, label]}
		<a href={getURLForLanguage(lang, '/embed')}>
			{label}
		</a>
	{/each}
</div>

<style lang="postcss">
	div :global(.toaster.group) {
		@apply absolute;
		@apply right-2;
		--offset: 50px !important;
	}
</style>
