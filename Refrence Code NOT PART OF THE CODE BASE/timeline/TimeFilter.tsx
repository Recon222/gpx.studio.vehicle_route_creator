import { format } from 'date-fns';
import { useAnimation } from '../../context/AnimationContext';

export function TimeFilter() {
  const { gpsData, setTimeFilter } = useAnimation();

  if (!gpsData) return null;

  const { timeRange } = gpsData;
  const formatDateTime = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");

  const handleFilterChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const start = new Date(formData.get('start') as string);
    const end = new Date(formData.get('end') as string);

    // Ensure valid date range
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
      setTimeFilter({ start, end });
    }
  };

  const handleReset = () => {
    setTimeFilter(null);
  };

  return (
    <form 
      onSubmit={handleFilterChange} 
      className="flex items-center gap-2"
    >
      <div className="flex items-center gap-2">
        <input
          type="datetime-local"
          name="start"
          defaultValue={formatDateTime(timeRange.start)}
          min={formatDateTime(timeRange.start)}
          max={formatDateTime(timeRange.end)}
          className="w-44 bg-surface border border-surface-light rounded px-2 py-1.5 text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <span className="text-text-secondary">to</span>
        <input
          type="datetime-local"
          name="end"
          defaultValue={formatDateTime(timeRange.end)}
          min={formatDateTime(timeRange.start)}
          max={formatDateTime(timeRange.end)}
          className="w-44 bg-surface border border-surface-light rounded px-2 py-1.5 text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="px-3 py-1.5 bg-primary text-white rounded text-sm hover:bg-primary/90
                   transition-colors"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 text-text-secondary hover:text-text-primary text-sm
                   transition-colors"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
