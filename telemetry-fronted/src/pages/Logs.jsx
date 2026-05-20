import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useFleet } from '../context/FleetContext';
import { useTheme } from '../context/ThemeContext';
import DeviceSetupRequired from '../components/DeviceSetupRequired';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to update map view
function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function Logs() {
  const { activeDeviceId, hasActiveDevice, loading: fleetLoading } = useFleet();
  const { theme } = useTheme();
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!hasActiveDevice) {
      setLogs([]);
      setSelectedLog(null);
      setIsLoading(false);
      return;
    }
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/api/telemetry/incidents/${activeDeviceId}`);
        if (response?.ok) {
          const data = await response.json();
          const filteredLogs = data.filter(log => (log.imu?.peak_g || 0) > 8);
          setLogs(filteredLogs);
          setSelectedLog(filteredLogs.length > 0 ? filteredLogs[0] : null);
        } else {
          setLogs([]);
          setSelectedLog(null);
        }
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [activeDeviceId, hasActiveDevice]);

  // Helper function to get incident type text
  const getIncidentType = (gForce) => {
    if (gForce > 20) return { text: 'Severity', icon: 'warning', color: 'text-red-500' };
    if (gForce > 8) return { text: 'Heavy Impact', icon: 'report', color: 'text-yellow-500' };
    if (gForce > 3.4) return { text: 'Moderate Impact', icon: 'vibration', color: 'text-purple-400' };
    if (gForce > 1.2) return { text: 'Minor Bump', icon: 'error_outline', color: 'text-gray-400' };
    return { text: 'Nominal Reading', icon: 'check_circle', color: 'text-outline' };
  };

  if (fleetLoading || isLoading) {
    return <div className="p-8 text-center text-primary animate-pulse tracking-widest font-bold">LOADING INCIDENT ARCHIVE...</div>;
  }

  if (!hasActiveDevice) {
    return <DeviceSetupRequired title="Select a vehicle in Admin" />;
  }

  return (
    <div className="flex flex-col lg:h-full w-full max-w-[1600px] mx-auto lg:overflow-hidden text-on-surface">
      <div className="p-4 md:p-8 pb-4 shrink-0">
        <h1 className="font-headline text-3xl font-black tracking-tighter uppercase">Incident Archive</h1>
        <p className="text-xs text-outline font-medium tracking-wide mt-1">
          Review of recent high-impact telemetry data points
        </p>
      </div>

      <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 lg:overflow-hidden">
        <div className="flex-1 bg-surface-container-lowest border border-border-theme rounded-xl flex flex-col lg:overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-border-theme flex justify-between items-center bg-surface-container-low shrink-0">
            <h3 className="text-sm font-bold uppercase tracking-widest">Event Log</h3>
            <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
              Showing {logs.length} Recent Events
            </span>
          </div>

          <div className="flex-1 lg:overflow-auto min-h-[300px] lg:min-h-0">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-surface-container-lowest border-b border-border-theme">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black text-outline uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="px-6 py-4 text-[9px] font-black text-outline uppercase tracking-[0.2em]">Event Type</th>
                  <th className="px-6 py-4 text-[9px] font-black text-outline uppercase tracking-[0.2em]">Magnitude</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme/40">
                {logs.length > 0 ? logs.map((log) => {
                  const incident = getIncidentType(log.imu.peak_g);
                  return (
                    <tr 
                      key={log._id} 
                      onClick={() => setSelectedLog(log)}
                      className={`cursor-pointer transition-colors ${selectedLog?._id === log._id ? 'bg-primary-opacity-10 border-l-2 border-primary' : 'hover:bg-primary-opacity-5 border-l-2 border-transparent'}`}
                    >
                      <td className="px-6 py-4 text-[11px] font-mono text-on-surface">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-2 ${incident.color}`}>
                          <span className="material-symbols-outlined text-lg">{incident.icon}</span>
                          <span className="text-xs font-bold">{incident.text}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-xs font-black ${incident.color}`}>
                        {log.imu.peak_g.toFixed(3)} G
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-outline">No log data found for this device.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details Preview Panel */}
        {selectedLog && (
          <div className="w-full lg:w-96 shrink-0 bg-surface-container border border-border-theme rounded-xl flex flex-col lg:overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-border-theme flex items-center justify-between shrink-0">
              <h3 className="font-headline font-bold text-sm uppercase tracking-widest">Event Detail</h3>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${getIncidentType(selectedLog.imu?.peak_g || 0).color.replace('text-','bg-')}/30 ${getIncidentType(selectedLog.imu?.peak_g || 0).color}`}>
                {getIncidentType(selectedLog.imu?.peak_g || 0).text}
              </span>
            </div>
            
            <div className="flex-1 lg:overflow-auto">
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-[9px] font-bold text-outline uppercase tracking-[0.2em] mb-2">Event Timestamp</p>
                  <h4 className="font-headline text-lg font-bold text-on-surface">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-container-low p-3 rounded border border-border-theme">
                    <p className="text-[8px] font-bold text-outline uppercase mb-1">Peak Force</p>
                    <p className={`text-lg font-headline font-bold ${getIncidentType(selectedLog.imu?.peak_g || 0).color}`}>
                      {selectedLog.imu?.peak_g?.toFixed(3) ?? '0.000'} G
                    </p>
                  </div>
                  <div className="bg-surface-container-low p-3 rounded border border-border-theme">
                    <p className="text-[8px] font-bold text-outline uppercase mb-1">Velocity</p>
                    <p className="text-lg font-headline font-bold text-on-surface">
                      {selectedLog.gps?.velocity_kmh?.toFixed(1) ?? 'N/A'} KM/H
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4 pt-4 border-t border-border-theme">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-outline uppercase">Location</span>
                    <span className="text-[10px] font-mono text-on-surface">
                      {selectedLog.gps?.latitude?.toFixed(4) ?? 'N/A'}, {selectedLog.gps?.longitude?.toFixed(4) ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-outline uppercase">Altitude</span>
                    <span className="text-[10px] font-bold text-on-surface">
                      {selectedLog.gps?.altitude_m?.toFixed(1) ?? 'N/A'} M
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-outline uppercase">Satellites</span>
                    <span className="text-[10px] font-bold text-on-surface">
                      {selectedLog.gps?.satellites ?? '0'}
                    </span>
                  </div>
                </div>

                {/* Map Viewer */}
                {selectedLog.gps?.latitude && selectedLog.gps?.longitude ? (
                  <div className="mt-4 border border-border-theme rounded-xl overflow-hidden h-48 w-full relative">
                    <MapContainer
                      center={[selectedLog.gps.latitude, selectedLog.gps.longitude]}
                      zoom={15}
                      scrollWheelZoom={true}
                      className="h-full w-full"
                      style={{ zIndex: 0, background: theme === 'light' ? '#f8f9fc' : '#1a1a1a' }}
                    >
                      <ChangeView center={[selectedLog.gps.latitude, selectedLog.gps.longitude]} zoom={15} />
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url={theme === 'light' 
                          ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                          : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        }
                      />
                      <Marker position={[selectedLog.gps.latitude, selectedLog.gps.longitude]}>
                        <Popup>
                          <div className="text-black">
                            <b>Impact Location</b><br/>
                            {selectedLog.imu?.peak_g?.toFixed(2)} G
                          </div>
                        </Popup>
                      </Marker>
                      <CircleMarker
                        center={[selectedLog.gps.latitude, selectedLog.gps.longitude]}
                        radius={20}
                        pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.4, weight: 2 }}
                      />
                    </MapContainer>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 