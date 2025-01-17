import { useCallback } from 'react';
import { format } from 'date-fns';
import { Play, Pause, ChevronDown, Camera } from 'lucide-react';
import { useAnimation } from '../../context/AnimationContext';
import { TimelineScrubber } from './TimelineScrubber';
import { TimeFilter } from './TimeFilter';
import { CameraViewType } from '../../types/CameraView';

const SPEED_OPTIONS = [0.5, 1, 2, 4, 8, 12, 16, 20];

export function Timeline() {
  const { 
    gpsData,
    animationState,
    togglePlayback,
    setCurrentTime,
    setPlaybackSpeed,
    timeFilter,
    cameraState,
    setCameraView,
    toggleCameraFollow
  } = useAnimation();

  if (!gpsData) return null;

  const effectiveTimeRange = timeFilter || gpsData.timeRange;
  const { isPlaying, currentTime, playbackSpeed } = animationState;

  const formatTime = useCallback((date: Date) => {
    return format(date, 'HH:mm:ss');
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-sm border-t border-surface-light p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left side: Play controls and speed */}
          <div className="flex items-center gap-4">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayback}
              className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 
                       flex items-center justify-center transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white translate-x-0.5" />
              )}
            </button>

            {/* Speed Dropdown */}
            <div className="relative">
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="appearance-none bg-surface border border-surface-light rounded-lg px-4 py-2 pr-10 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {SPEED_OPTIONS.map(speed => (
                  <option key={speed} value={speed}>
                    {speed}x
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-text-secondary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Current Time */}
            <div className="text-text-secondary text-sm">
              {formatTime(currentTime)}
            </div>

            {/* Camera Quick Controls */}
            <div className="flex items-center gap-2 ml-4 border-l border-surface-light pl-4">
              <button
                onClick={toggleCameraFollow}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  cameraState.isFollowing
                    ? 'bg-primary/20 text-primary'
                    : 'text-text-secondary hover:bg-surface-light'
                }`}
              >
                <Camera className="w-4 h-4" />
                {cameraState.isFollowing ? 'Following' : 'Free Camera'}
              </button>
              
              <select
                value={cameraState.activeView}
                onChange={(e) => setCameraView(e.target.value as CameraViewType)}
                className="appearance-none bg-surface border border-surface-light rounded-lg 
                         px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 
                         focus:ring-primary/20"
              >
                <option value={CameraViewType.TopDown}>Top Down</option>
                <option value={CameraViewType.Chase}>Chase</option>
                <option value={CameraViewType.SideChase}>Side View</option>
                <option value={CameraViewType.Driver}>Driver</option>
                <option value={CameraViewType.Overview}>Overview</option>
              </select>
            </div>
          </div>

          {/* Right side: Time Filter */}
          <TimeFilter />
        </div>

        {/* Timeline Scrubber */}
        <div>
          <TimelineScrubber
            start={effectiveTimeRange.start}
            end={effectiveTimeRange.end}
            current={currentTime}
            onChange={setCurrentTime}
          />
          
          {/* Time Range Labels */}
          <div className="flex justify-between text-sm text-text-secondary mt-1">
            <span>{formatTime(effectiveTimeRange.start)}</span>
            <span>{formatTime(effectiveTimeRange.end)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timeline;