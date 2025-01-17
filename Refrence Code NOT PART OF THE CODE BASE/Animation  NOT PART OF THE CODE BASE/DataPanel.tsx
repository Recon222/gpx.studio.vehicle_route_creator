import { useAnimation } from '../../context/AnimationContext';
import { format } from 'date-fns';
import { DraggablePanel } from '../ui/DraggablePanel';

interface DataPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export function DataPanel({ isVisible, onClose }: DataPanelProps) {
  const { gpsData, animationState, timeFilter, filteredMetadata } = useAnimation();

  if (!gpsData) return null;

  const { metadata, timeRange } = gpsData;
  const { currentTime } = animationState;

  // Use filtered metadata if time filter is active and filtered data exists
  const effectiveMetadata = (timeFilter && filteredMetadata) ? filteredMetadata : metadata;
  const effectiveTimeRange = timeFilter || timeRange;

  const formatDistance = (km: number) => {
    return `${km.toFixed(2)} km`;
  };

  const formatSpeed = (kmh: number) => {
    return `${kmh.toFixed(1)} km/h`;
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

  const formatDateTime = (date: Date) => {
    return format(date, 'MMM d, yyyy HH:mm:ss');
  };

  return (
    <DraggablePanel 
      isVisible={isVisible} 
      onClose={onClose}
      defaultPosition={{ x: window.innerWidth - 320, y: 60 }}
      className="w-80"
      showHeader={false}
    >
      <div className="text-white">
        <div className="space-y-4">
          <div>
            <h3 className="text-gray-400 text-sm">Current Time</h3>
            <p className="font-medium">{formatDateTime(currentTime)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-gray-400 text-sm">Distance</h3>
              <p className="font-medium">{formatDistance(effectiveMetadata.totalDistance)}</p>
            </div>

            <div>
              <h3 className="text-gray-400 text-sm">Duration</h3>
              <p className="font-medium">{formatDuration(effectiveMetadata.duration)}</p>
            </div>

            <div>
              <h3 className="text-gray-400 text-sm">Avg Speed</h3>
              <p className="font-medium">{formatSpeed(effectiveMetadata.averageSpeed)}</p>
            </div>

            <div>
              <h3 className="text-gray-400 text-sm">Max Speed</h3>
              <p className="font-medium">{formatSpeed(effectiveMetadata.maxSpeed)}</p>
            </div>
          </div>

          <div>
            <h3 className="text-gray-400 text-sm">Time Range</h3>
            <p className="font-medium">{formatDateTime(effectiveTimeRange.start)}</p>
            <p className="text-gray-400">to</p>
            <p className="font-medium">{formatDateTime(effectiveTimeRange.end)}</p>
            {timeFilter && filteredMetadata && (
              <p className="text-gray-400 text-xs block mt-1">(Filtered View)</p>
            )}
          </div>
        </div>
      </div>
    </DraggablePanel>
  );
}
