import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useFleet } from '../context/FleetContext';

export default function Admin() {
  const { selectedDeviceId, setSelectedDeviceId } = useFleet();
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [telemetryDeviceIds, setTelemetryDeviceIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const emptyStats = (rosterCount = 0) => ({
    deviceId: null,
    totalVehicles: rosterCount,
    minorBumps: 0,
    moderateImpacts: 0,
    heavyImpacts: 0,
    severityEvents: 0,
    totalTelemetryRecords: 0,
  });

  const fetchAdminData = useCallback(async (deviceId) => {
    setIsLoading(true);
    setError('');
    try {
      const [vehiclesRes, devicesRes] = await Promise.all([
        api.get('/api/admin/vehicles'),
        api.get('/api/telemetry/devices'),
      ]);

      if (!vehiclesRes?.ok) {
        throw new Error('Failed to load admin data. Make sure you are logged in and the backend is running.');
      }

      const vehiclesData = await vehiclesRes.json();
      setVehicles(vehiclesData);
      setTelemetryDeviceIds(devicesRes?.ok ? await devicesRes.json() : []);

      if (!deviceId) {
        setStats(emptyStats(vehiclesData.length));
        setIncidents([]);
        return;
      }

      const q = `?deviceId=${encodeURIComponent(deviceId)}`;
      const [statsRes, incidentsRes] = await Promise.all([
        api.get(`/api/admin/stats${q}`),
        api.get(`/api/admin/incidents${q}`),
      ]);

      if (!statsRes?.ok || !incidentsRes?.ok) {
        throw new Error('Failed to load stats for selected vehicle.');
      }

      setStats(await statsRes.json());
      setIncidents(await incidentsRes.json());
    } catch (err) {
      console.error('Admin data fetch error:', err);
      setError(err.message || 'Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData(selectedDeviceId);
  }, [selectedDeviceId, fetchAdminData]);

  const getIncidentType = (gForce) => {
    if (gForce > 20) return { text: 'Severity', color: 'bg-red-500/20 text-red-500', icon: 'emergency' };
    if (gForce > 8) return { text: 'Heavy Impact', color: 'bg-yellow-500/20 text-yellow-500', icon: 'report' };
    if (gForce > 3.4) return { text: 'Moderate Impact', color: 'bg-purple-400/20 text-purple-400', icon: 'vibration' };
    if (gForce > 1.2) return { text: 'Minor Bump', color: 'bg-gray-400/20 text-gray-400', icon: 'minor_crash' };
    return { text: 'Nominal Event', color: 'bg-surface-container-high', icon: 'speed' };
  };

  if (isLoading && !stats) {
    return (
      <div className="p-8 text-center text-primary animate-pulse font-bold tracking-widest">
        LOADING GLOBAL FLEET DATA...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto w-full">
      <header className="mb-8 border-l-2 border-primary pl-6">
        <h1 className="text-3xl font-bold headline-font tracking-tight uppercase">GLOBAL FLEET OVERVIEW</h1>
        <p className="text-outline uppercase text-xs tracking-[0.2em] mt-1 font-label">
          Real-time Telemetry &amp; Asset Surveillance
          {selectedDeviceId ? ` — viewing ${selectedDeviceId}` : ' — select a vehicle to view telemetry'}
        </p>
      </header>

      {error && (
        <div className="mb-6 p-3 rounded-lg border border-red-500 bg-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {selectedDeviceId && stats?.totalTelemetryRecords === 0 && telemetryDeviceIds.length > 0 && (
        <div className="mb-6 p-4 rounded-lg border border-secondary/50 bg-secondary/10 text-sm">
          <p className="font-bold text-secondary">
            No telemetry in MongoDB for &quot;{selectedDeviceId}&quot;
          </p>
          <p className="text-on-surface-variant mt-2">
            Profile IDs (VX-9002, VX-9901) are not the same as telemetry IDs unless they match exactly.
            Your hardware data is stored under:{' '}
            <span className="font-mono font-bold text-primary">{telemetryDeviceIds.join(', ')}</span>.
            Click that ID below to load your old data.
          </p>
        </div>
      )}

      {telemetryDeviceIds.length > 0 && (
        <div className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5 text-sm text-on-surface-variant">
          <span className="font-bold text-primary">Device IDs with telemetry in MongoDB — click to load data: </span>
          <span className="flex flex-wrap gap-2 mt-2">
            {telemetryDeviceIds.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedDeviceId(selectedDeviceId === id ? null : id)}
                className={`px-3 py-1 rounded font-mono text-xs border transition-colors ${
                  selectedDeviceId === id
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30'
                }`}
              >
                {id}
              </button>
            ))}
          </span>
          <span className="block text-xs text-outline mt-2">
            Selection applies to Dashboard, Logs, Safety, and this Admin view.
          </span>
        </div>
      )}

      {!selectedDeviceId && (
        <div className="mb-6 p-4 rounded-lg border border-outline-variant/30 bg-surface-container text-sm text-outline text-center">
          No vehicle selected — telemetry stats and alerts show 0. Select a Device ID or fleet row below.
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container p-6 rounded-lg">
            <label className="text-[10px] uppercase tracking-[0.2em] text-outline font-label block mb-4">
              {selectedDeviceId ? 'Selected vehicle' : 'Roster size'}
            </label>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold headline-font text-primary tracking-tighter">
                {stats?.totalVehicles ?? 0}
              </span>
              <span className="text-xs text-outline mb-2">REGISTERED</span>
            </div>
          </div>
          <div className="bg-surface-container p-6 rounded-lg">
            <label className="text-[10px] uppercase tracking-[0.2em] text-outline font-label block mb-2">
              Telemetry records
            </label>
            <span className="text-3xl font-bold headline-font text-secondary">
              {stats?.totalTelemetryRecords ?? 0}
            </span>
          </div>
          <div className="bg-surface-container p-6 rounded-lg">
            <label className="text-[10px] uppercase tracking-[0.2em] text-outline font-label block mb-4">
              Incident Summary
            </label>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Minor Bump &gt; 1.2g</span>
                <span className="text-lg font-bold headline-font text-outline">{stats?.minorBumps ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Moderate Impact &gt; 3.4g</span>
                <span className="text-lg font-bold headline-font text-primary">{stats?.moderateImpacts ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Heavy Impact &gt; 8g</span>
                <span className="text-lg font-bold headline-font text-secondary">{stats?.heavyImpacts ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Severity &gt; 20g</span>
                <span className="text-lg font-bold headline-font text-error">{stats?.severityEvents ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 bg-surface-container rounded-lg overflow-hidden min-h-[350px] flex flex-col">
          <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center gap-4 flex-wrap">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-outline font-label block mb-1">
                VEHICLE ROSTER
              </label>
              <h2 className="text-xl font-bold headline-font">REGISTERED FLEET ASSETS</h2>
              <p className="text-xs text-outline mt-1">Click a row to view that vehicle&apos;s stats</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDeviceId(null)}
              disabled={!selectedDeviceId}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-outline-variant/30 text-outline hover:text-primary hover:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear selection
            </button>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-surface-container-high">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest font-label">Asset ID</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest font-label">Driver</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest font-label">Records</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest font-label">Emergency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {vehicles.length > 0 ? (
                  vehicles.map((vehicle) => {
                    const isSelected = selectedDeviceId === vehicle.deviceId;
                    const hasTelemetry = (vehicle.telemetryCount ?? 0) > 0;
                    return (
                      <tr
                        key={vehicle._id || vehicle.deviceId}
                        onClick={() =>
                          setSelectedDeviceId(
                            selectedDeviceId === vehicle.deviceId ? null : vehicle.deviceId
                          )
                        }
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/15' : 'hover:bg-surface-bright'
                        }`}
                      >
                        <td className="px-6 py-4 text-xs headline-font font-bold text-primary">
                          {vehicle.deviceId}
                          {hasTelemetry ? (
                            <span className="ml-2 text-[9px] text-green-400 font-label uppercase">has data</span>
                          ) : (
                            <span className="ml-2 text-[9px] text-outline font-label uppercase">no data</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-on-surface">{vehicle.driverName || '—'}</td>
                        <td className="px-6 py-4 text-xs text-outline">{vehicle.telemetryCount ?? 0}</td>
                        <td className="px-6 py-4 text-xs font-mono text-outline">{vehicle.emergencyNumber || '—'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-outline">
                      No vehicles with a Device ID yet. Save a profile with a Device ID on the Profile page.
                      {telemetryDeviceIds.length > 0 && (
                        <span className="block mt-2 text-primary">
                          Telemetry exists for: {telemetryDeviceIds.join(', ')} — use one of these IDs in Profile.
                        </span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-12 bg-surface-container rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-outline-variant/10">
            <h2 className="text-xl font-bold headline-font">
              {selectedDeviceId
                ? `RECENT HIGH-G ALERTS — ${selectedDeviceId}`
                : 'RECENT HIGH-G ALERTS > 1.2g (ALL FLEET)'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest">
                  <th className="px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest font-label">Timestamp</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest font-label">Asset ID</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest font-label">Event Type</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest font-label">Magnitude</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest font-label">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {incidents.length > 0 ? (
                  incidents.map((incident) => {
                    const eventType = getIncidentType(incident.imu?.peak_g ?? 0);
                    return (
                      <tr key={incident._id} className="hover:bg-surface-bright transition-colors group">
                        <td className="px-6 py-4 text-xs font-medium tabular-nums text-on-surface-variant">
                          {new Date(incident.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-xs headline-font font-bold text-primary">{incident.deviceId}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">{eventType.icon}</span>
                            <span className="text-xs font-semibold">{eventType.text}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${eventType.color}`}>
                            {(incident.imu?.peak_g ?? 0).toFixed(3)}G
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-on-surface-variant font-mono">
                          {incident.gps?.latitude != null && incident.gps?.longitude != null
                            ? `${incident.gps.latitude.toFixed(4)}°, ${incident.gps.longitude.toFixed(4)}°`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-outline">
                      No high-G incidents for this selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
