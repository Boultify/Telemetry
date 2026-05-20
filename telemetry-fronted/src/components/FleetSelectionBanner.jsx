import { Link } from 'react-router-dom';
import { useFleet } from '../context/FleetContext';

export default function FleetSelectionBanner() {
  const { selectedDeviceId, clearFleetSelection, activeDeviceId } = useFleet();

  if (!selectedDeviceId) return null;

  return (
    <div className="mx-4 md:mx-8 mt-4 mb-0 px-4 py-3 rounded-lg border border-primary-border bg-primary-opacity-10 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-on-surface">
        <span className="font-bold text-primary">Fleet view:</span> showing data for{' '}
        <span className="font-mono font-bold">{activeDeviceId || selectedDeviceId}</span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clearFleetSelection}
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border border-border-theme text-outline hover:text-primary transition-colors"
        >
          Clear selection
        </button>
        <Link
          to="/admin"
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded bg-primary-opacity-20 text-primary hover:bg-primary-opacity-30 transition-colors"
        >
          Change in Admin
        </Link>
      </div>
    </div>
  );
}
