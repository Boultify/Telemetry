import { Link } from 'react-router-dom';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';

export default function DeviceSetupRequired({ title = 'No telemetry for this Device ID' }) {
  const { isAdmin } = useAuth();
  const { telemetryDeviceIds, profileDeviceId, resolvedId, existsInTelemetry } = useFleet();

  return (
    <div className="p-12 max-w-xl mx-auto text-center space-y-5">
      <span className="material-symbols-outlined text-5xl text-outline block">memory</span>
      <h2 className="font-headline text-2xl font-bold text-on-surface uppercase tracking-tight">{title}</h2>
      {resolvedId && !existsInTelemetry && (
        <p className="text-sm text-secondary">
          &quot;{resolvedId}&quot; is not in MongoDB <strong>telemetries</strong>. Data is keyed by Device ID — any
          account using an ID that exists in telemetries will see the same records.
        </p>
      )}
      <p className="text-sm text-outline leading-relaxed">
        {isAdmin
          ? 'In Admin, select a Device ID chip that has telemetry data.'
          : `On Profile, save a Device ID that matches telemetries (e.g. ${telemetryDeviceIds[0] || 'VX-9002'}).`}
        {!isAdmin && profileDeviceId && (
          <span className="block mt-2">Current profile ID: {profileDeviceId}</span>
        )}
      </p>
      {telemetryDeviceIds.length > 0 && (
        <p className="text-xs text-primary font-mono">IDs with data in MongoDB: {telemetryDeviceIds.join(', ')}</p>
      )}
      <Link
        to={isAdmin ? '/admin' : '/profile'}
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-lg font-label font-bold text-xs tracking-widest uppercase hover:brightness-110 transition-all"
      >
        <span className="material-symbols-outlined text-sm">{isAdmin ? 'admin_panel_settings' : 'account_circle'}</span>
        {isAdmin ? 'Open Admin' : 'Edit Profile'}
      </Link>
    </div>
  );
}
