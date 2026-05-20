import React, { useState, useEffect, useRef } from 'react';
import { LineChart, XAxis, YAxis, Line, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../utils/api';
import { useFleet } from '../context/FleetContext';
import { useCrash } from '../context/CrashContext';
import DeviceSetupRequired from '../components/DeviceSetupRequired';

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

// ========== IMPROVED STOCK-STYLE CHART COMPONENT ==========
const LiveChart = ({ data, crashPoint }) => {
  // Calculate dynamic domain for G-Force (0 to max + buffer)
  const maxGForce = data.length > 0 
    ? Math.max(...data.map(d => d.gForce), 0.5) 
    : 0.5;
  const gForceDomain = [0, Math.min(maxGForce + 0.5, 25)]; // Cap at 25G
  
  // Calculate dynamic domain for Velocity
  const maxVelocity = data.length > 0 
    ? Math.max(...data.map(d => d.velocity), 50) 
    : 50;
  const velocityDomain = [0, maxVelocity + 10];

  // Find the index of the crash point in the data
  const getCrashDataPoint = () => {
    if (!crashPoint || !data.length) return null;
    // Find the closest data point to the crash timestamp
    const crashTime = new Date(crashPoint.timestamp).getTime();
    let closestPoint = null;
    let minDiff = Infinity;
    
    data.forEach(point => {
      if (point.fullTimestamp) {
        const diff = Math.abs(point.fullTimestamp - crashTime);
        if (diff < minDiff && diff < 10000) { // within 10 seconds
          minDiff = diff;
          closestPoint = point;
        }
      }
    });
    return closestPoint;
  };

  const crashDataPoint = getCrashDataPoint();

  // Custom dot for crash highlighting
  const renderCrashDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.gForce >= 15.0) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={8} fill="#ef4444" stroke="#fff" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={12} fill="#ef4444" stroke="none" opacity="0.3" />
        </g>
      );
    } else if (payload.gForce >= 7.0) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill="#f97316" stroke="#fff" strokeWidth={1.5} />
          <circle cx={cx} cy={cy} r={10} fill="#f97316" stroke="none" opacity="0.3" />
        </g>
      );
    }
    return null;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const velocityItem = payload.find(item => item.dataKey === 'velocity');
      const gForceItem = payload.find(item => item.dataKey === 'gForce');
      const isCriticalPoint = gForceItem && gForceItem.value >= 15.0;
      const isSeverePoint = gForceItem && gForceItem.value >= 7.0 && gForceItem.value < 15.0;
      
      const tooltipBgBorder = isCriticalPoint
        ? 'bg-red-500/20 border-red-500'
        : isSeverePoint
          ? 'bg-orange-500/20 border-orange-500'
          : 'bg-[#1E2023] border-white/10';

      const velColor = isCriticalPoint
        ? 'text-red-400'
        : isSeverePoint
          ? 'text-orange-400'
          : 'text-[#9ECAFF]';

      const gColor = isCriticalPoint
        ? 'text-red-400'
        : isSeverePoint
          ? 'text-orange-400'
          : 'text-[#FFDF9E]';

      return (
        <div className={`rounded-lg p-4 shadow-2xl border ${tooltipBgBorder}`}>
          <div className="text-gray-400 text-[10px] mb-2 border-b border-white/10 pb-1">
            ⏱ {label}
          </div>
          <div className="flex items-center gap-4">
            <div>
              <div className={`font-bold text-lg ${velColor}`}>
                {velocityItem?.value ? velocityItem.value.toFixed(1) : '0'}
                <span className="text-xs ml-1">KM/H</span>
              </div>
              <div className="text-gray-500 text-[8px] uppercase tracking-wider">Velocity</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <div className={`font-bold text-lg ${gColor}`}>
                {gForceItem?.value ? gForceItem.value.toFixed(2) : '0'}
                <span className="text-xs ml-1">G</span>
              </div>
              <div className="text-gray-500 text-[8px] uppercase tracking-wider">G-Force</div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-container rounded-2xl border border-white/5 p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-headline text-xl font-bold text-on-surface">LIVE TELEMETRY</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-green-400 uppercase tracking-wider">Waiting for data</span>
          </div>
        </div>
        <div className="h-[380px] flex items-center justify-center text-gray-500 border border-white/5 rounded-xl bg-surface-container-low">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl mb-2 block opacity-50">show_chart</span>
            <p className="text-sm">No data available. Waiting for telemetry...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container rounded-2xl border border-white/5 p-6 mt-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h3 className="font-headline text-xl font-bold text-on-surface">TELEMETRY DATA</h3>
          <p className="text-[10px] text-outline uppercase tracking-wider mt-1">Velocity & G-Force</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#9ECAFF]" />
            <span className="text-[10px] text-outline">Velocity (KM/H)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FFDF9E]" />
            <span className="text-[10px] text-outline">G-Force</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-[10px] text-outline">Crash Event</span>
          </div>
        </div>
      </div>
      
      <div style={{ width: '100%', height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9ECAFF" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#9ECAFF" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gForceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FFDF9E" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FFDF9E" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#282A2D" />
            
            {/* Left Y-Axis for Velocity */}
            <YAxis 
              yAxisId="velocity"
              orientation="left"
              domain={velocityDomain}
              tick={{ fill: '#9ECAFF', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#9ECAFF', strokeWidth: 1 }}
              label={{ 
                value: 'KM/H', 
                angle: -90, 
                position: 'insideLeft', 
                fill: '#9ECAFF',
                fontSize: 10,
                dy: 50
              }}
            />
            
            {/* Right Y-Axis for G-Force */}
            <YAxis 
              yAxisId="gForce"
              orientation="right"
              domain={gForceDomain}
              tick={{ fill: '#FFDF9E', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#FFDF9E', strokeWidth: 1 }}
              label={{ 
                value: 'G-FORCE', 
                angle: 90, 
                position: 'insideRight', 
                fill: '#FFDF9E',
                fontSize: 10,
                dy: -50
              }}
            />
            
            {/* X-Axis with better formatting */}
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#666', fontSize: 9 }}
              interval="preserveEnd"
              minTickGap={35}
            />
            
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#555', strokeWidth: 1, strokeDasharray: '4 4' }} />
            
            {/* Area under velocity line */}
            <Area
              yAxisId="velocity"
              type="monotone"
              dataKey="velocity"
              stroke="#9ECAFF"
              strokeWidth={0}
              fill="url(#velocityGradient)"
            />
            
            {/* Velocity Line */}
            <Line
              yAxisId="velocity"
              type="monotone"
              dataKey="velocity"
              stroke="#9ECAFF"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#9ECAFF', stroke: '#fff', strokeWidth: 1.5 }}
              isAnimationActive={true}
              animationDuration={300}
              animationEasing="ease-out"
            />
            
            {/* Area under G-Force line */}
            <Area
              yAxisId="gForce"
              type="monotone"
              dataKey="gForce"
              stroke="#FFDF9E"
              strokeWidth={0}
              fill="url(#gForceGradient)"
            />
            
            {/* G-Force Line with crash dot */}
            <Line
              yAxisId="gForce"
              type="monotone"
              dataKey="gForce"
              stroke="#FFDF9E"
              strokeWidth={2}
              dot={renderCrashDot}
              activeDot={{ r: 5, fill: '#FFDF9E', stroke: '#fff', strokeWidth: 1.5 }}
              isAnimationActive={true}
              animationDuration={300}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Mini stats below chart */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/5">
        <div className="text-center">
          <div className="text-[#9ECAFF] text-lg font-bold">
            {data.length > 0 ? data[data.length - 1]?.velocity?.toFixed(1) : '0'}
            <span className="text-xs ml-1 text-outline">KM/H</span>
          </div>
          <div className="text-[9px] text-outline uppercase tracking-wider">Current Speed</div>
        </div>
        <div className="text-center">
          <div className="text-[#FFDF9E] text-lg font-bold">
            {data.length > 0 ? data[data.length - 1]?.gForce?.toFixed(2) : '0'}
            <span className="text-xs ml-1 text-outline">G</span>
          </div>
          <div className="text-[9px] text-outline uppercase tracking-wider">Current G-Force</div>
        </div>
        <div className="text-center">
          <div className="text-white text-lg font-bold">
            {data.length}
            <span className="text-xs ml-1 text-outline">pts</span>
          </div>
          <div className="text-[9px] text-outline uppercase tracking-wider">Data Points</div>
        </div>
      </div>
    </div>
  );
};

// ========== MAIN DASHBOARD COMPONENT ==========
export default function Dashboard() {
  const { activeDeviceId, hasActiveDevice, existsInTelemetry, loading: fleetLoading, isAdmin } = useFleet();
  const { mapCrashPoint, graphCrashPoint } = useCrash();
  const [telemetry, setTelemetry] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [latency, setLatency] = useState(0);
  const [dataReady, setDataReady] = useState(false);
  const [timeframe, setTimeframe] = useState(0); // 0 = Live, 1 = 1 Week, etc.
  const chartContainerRef = useRef(null);

  const formatTime = (date, isWeekly) => {
    if (!date) return 'Invalid Date';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    if (isWeekly) {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleTimeString([], {
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Fetch historical data - increased to 60 points for smoother chart
  const fetchHistoricalData = async (weeks = 0) => {
    try {
      const url = weeks > 0 
        ? `/api/telemetry/history/${activeDeviceId}?weeks=${weeks}`
        : `/api/telemetry/history/${activeDeviceId}?limit=60`;
      const response = await api.get(url);

      if (response && response.ok) {
        const data = await response.json();
        console.log("Historical Data Retrieved:", data.length, "entries");

        if (data && data.length > 0) {
          const historicalPoints = data.map((entry) => {
            let timestamp;
            if (entry.timestampISO) {
              timestamp = new Date(entry.timestampISO);
            } else if (entry.timestamp) {
              timestamp = new Date(entry.timestamp);
            } else {
              timestamp = new Date();
            }

            const velocity = entry.gps?.velocity_kmh || 0;
            const gForce = entry.imu?.peak_g || 0;

            return {
              time: formatTime(timestamp, weeks > 0),
              velocity: Math.round(velocity * 10) / 10,
              gForce: Math.round(gForce * 100) / 100,
              fullTimestamp: timestamp.getTime()
            };
          });

          setChartData(historicalPoints);
          setTelemetry(data[data.length - 1]);
        } else {
          setChartData([]);
        }
      } else if (response?.status === 404) {
        setChartData([]);
      }
    } catch (error) {
      console.error("Error fetching historical data:", error);
    }
  };

  // Fetch latest telemetry
  const fetchLatestTelemetry = async () => {
    try {
      const response = await api.get(`/api/telemetry/latest/${activeDeviceId}`);

      if (response && response.ok) {
        const data = await response.json();

        let serverTime;
        if (data.timestampISO) {
          serverTime = new Date(data.timestampISO).getTime();
        } else if (data.timestamp) {
          serverTime = new Date(data.timestamp).getTime();
        } else {
          serverTime = Date.now();
        }

        const currentTime = new Date().getTime();
        const currentLatency = currentTime - serverTime;
        setLatency(currentLatency);
        setTelemetry(data);

        if (data && data.gps && data.imu) {
          let timestamp;
          if (data.timestampISO) {
            timestamp = new Date(data.timestampISO);
          } else if (data.timestamp) {
            timestamp = new Date(data.timestamp);
          } else {
            timestamp = new Date();
          }

          if (isNaN(timestamp.getTime())) {
            console.error("Invalid timestamp");
            return;
          }

          const newPoint = {
            time: formatTime(timestamp, timeframe > 0),
            velocity: Math.round((data.gps.velocity_kmh || 0) * 10) / 10,
            gForce: Math.round((data.imu.peak_g || 0) * 100) / 100,
            fullTimestamp: timestamp.getTime()
          };

          setChartData(prevData => {
            const isDuplicate = prevData.some(point => 
              Math.abs(point.fullTimestamp - newPoint.fullTimestamp) < 500
            );

            if (isDuplicate) {
              return prevData;
            }

            const updated = [...prevData, newPoint];
            return timeframe > 0 ? updated.slice(-1000) : updated.slice(-60);
          });
        }
      }
    } catch (error) {
      console.error("Fetch Exception:", error);
    }
  };

  useEffect(() => {
    if (!hasActiveDevice) {
      setTelemetry(null);
      setChartData([]);
      setDataReady(true);
      return;
    }
    
    setDataReady(false);
    let interval;
    
    const load = async () => {
      await fetchHistoricalData(timeframe);
      await fetchLatestTelemetry();
      setDataReady(true);
      // Disable live polling if viewing historical weekly data, to prevent layout shifting
      // or just keep polling with slower interval? We will keep polling.
      interval = setInterval(fetchLatestTelemetry, 2000);
    };
    
    load();
    
    return () => { 
      if (interval) clearInterval(interval); 
    };
  }, [activeDeviceId, hasActiveDevice, timeframe]);

  if (fleetLoading || !dataReady) {
    return <div className="text-white p-8 text-center animate-pulse">Loading...</div>;
  }

  if (!hasActiveDevice) {
    return (
      <DeviceSetupRequired
        title={isAdmin ? 'Select a vehicle in Admin' : 'Set your Device ID on Profile'}
      />
    );
  }

  if (!existsInTelemetry) {
    return (
      <DeviceSetupRequired title="Device ID not found in MongoDB telemetries" />
    );
  }

  if (!telemetry) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto w-full text-white space-y-6">
        <h1 className="text-3xl font-black uppercase">Live Telemetry: {activeDeviceId}</h1>
        <div className="p-8 rounded-xl border border-white/10 bg-surface-container text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-outline">sensors_off</span>
          <p className="text-lg font-bold">No telemetry records for this device ID</p>
          <p className="text-sm text-outline">Showing 0 data. In Admin, click VX-9902 to view existing MongoDB telemetry.</p>
        </div>
        <LiveChart data={[]} crashPoint={null} />
      </div>
    );
  }

  const currentLocalTime = new Date().toLocaleString();

  let dataTimestamp = 'N/A';
  if (telemetry.timestampISO) {
    dataTimestamp = new Date(telemetry.timestampISO).toLocaleString();
  } else if (telemetry.timestamp) {
    dataTimestamp = new Date(telemetry.timestamp).toLocaleString();
  }

  const isCrashed = (telemetry.imu?.peak_g || 0) > 3.4;

  return (
    <div className="p-8 max-w-[1600px] mx-auto w-full text-white">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Live Telemetry</h1>
          <p className="text-sm text-outline mt-1">Device: <span className="font-mono text-primary">{activeDeviceId}</span></p>
        </div>
        <div className="text-sm text-outline bg-surface-container px-3 py-1 rounded">
          🖥️ {currentLocalTime}
        </div>
      </div>

      <div className="flex gap-4 mb-8 flex-wrap">
        <div className={`px-4 py-2 rounded font-bold text-xs ${telemetry.gps?.fixed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          GPS: {telemetry.gps?.fixed ? 'FIXED' : 'SEARCHING'}
        </div>
        <div className="px-4 py-2 bg-surface-container-high rounded font-bold text-xs text-primary">
          SATELLITES: {telemetry.gps?.satellites || 0}
        </div>
        <div className="px-4 py-2 bg-surface-container-high rounded font-bold text-xs text-secondary border border-secondary/30">
          LATENCY: {latency > 3000 ? "OFFLINE" : `${latency} ms`}
        </div>
        <div className="px-4 py-2 bg-surface-container-high rounded font-bold text-xs text-info">
          Last updated: {dataTimestamp}
        </div>
      </div>

      {/* Map Section with Crash Circle */}
      <div className="bg-surface-container rounded-xl border border-white/5 overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-high/50">
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined ${isCrashed ? 'text-red-500' : 'text-primary'}`}>map</span>
            <span className="font-headline font-bold uppercase tracking-tight text-on-surface">
              Live Vehicle Location
            </span>
          </div>
          <div className="flex items-center gap-4">
            {mapCrashPoint ? (
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded bg-red-500/20 text-red-500 animate-pulse">
                ⚠️ CRASH LOCATION
              </span>
            ) : (
              <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded ${isCrashed ? 'bg-red-500/20 text-red-500' : 'bg-primary/10 text-primary'}`}>
                LIVE FEED
              </span>
            )}
          </div>
        </div>

        <div className="relative" style={{ height: '400px', width: '100%' }}>
          <MapContainer
            center={[telemetry.gps?.latitude || 0, telemetry.gps?.longitude || 0]}
            zoom={15}
            scrollWheelZoom={true}
            className="h-full w-full"
            style={{ zIndex: 0, background: '#1a1a1a' }}
          >
            <ChangeView center={[telemetry.gps?.latitude || 0, telemetry.gps?.longitude || 0]} zoom={15} />
            
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {/* Current vehicle marker */}
            <Marker position={[telemetry.gps?.latitude || 0, telemetry.gps?.longitude || 0]}>
              <Popup>
                <div className="text-black">
                  <b>Vehicle: {activeDeviceId}</b><br/>
                  Speed: {telemetry.gps?.velocity_kmh?.toFixed(1)} km/h<br/>
                  Status: {isCrashed ? '⚠️ CRASH DETECTED' : 'NORMAL'}<br/>
                  G-Force: {telemetry.imu?.peak_g?.toFixed(2)} G
                </div>
              </Popup>
            </Marker>

            {/* Crash location circle marker - PULSING RED CIRCLE */}
            {mapCrashPoint && mapCrashPoint.lat && mapCrashPoint.lng && (
              <CircleMarker
                center={[mapCrashPoint.lat, mapCrashPoint.lng]}
                radius={40}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.4,
                  weight: 3,
                }}
              >
                <Popup>
                  <div className="text-black">
                    <b className="text-red-500">⚠️ CRASH LOCATION</b><br/>
                    Severity: <span className="font-bold uppercase">{mapCrashPoint.severity}</span><br/>
                    Impact: {mapCrashPoint.currentG?.toFixed(2)} G<br/>
                    Time: {new Date().toLocaleTimeString()}
                  </div>
                </Popup>
              </CircleMarker>
            )}

            {/* Animated pulsing ring around crash location */}
            {mapCrashPoint && mapCrashPoint.lat && mapCrashPoint.lng && (
              <CircleMarker
                center={[mapCrashPoint.lat, mapCrashPoint.lng]}
                radius={60}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.15,
                  weight: 2,
                  className: 'animate-ping'
                }}
              />
            )}
          </MapContainer>

          {/* Map overlay HUD */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-[1000] pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
              <span className="font-label text-[10px] font-bold text-primary tracking-widest uppercase">
                📍 LAT: {telemetry.gps?.latitude?.toFixed(6) || '0'}, LNG: {telemetry.gps?.longitude?.toFixed(6) || '0'}
              </span>
            </div>
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
              <span className="font-label text-[10px] font-bold tracking-widest uppercase text-green-400">
                🛰️ SPEED: {telemetry.gps?.velocity_kmh?.toFixed(1) || 0} KM/H
              </span>
            </div>
            {mapCrashPoint && (
              <div className="bg-red-500/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-red-300 animate-pulse">
                <span className="font-label text-[10px] font-bold tracking-widest uppercase text-white">
                  ⚠️ CRASH DETECTED AT THIS LOCATION
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className={`p-6 rounded-xl border md:col-span-2 ${(telemetry.imu?.peak_g || 0) > 20 ? 'bg-red-500/20 border-red-500' : (telemetry.imu?.peak_g || 0) > 8 ? 'bg-yellow-500/20 border-yellow-500' : 'bg-surface-container border-white/5'}`}>
          <p className="text-xs text-outline uppercase tracking-widest mb-2">Peak G-Force</p>
          <p className={`text-4xl font-bold ${(telemetry.imu?.peak_g || 0) > 20 ? 'text-red-500 animate-pulse' : (telemetry.imu?.peak_g || 0) > 8 ? 'text-yellow-500 animate-pulse' : 'text-white'}`}>
            {(telemetry.imu?.peak_g || 0).toFixed(3)} <span className="text-sm">g</span>
          </p>
          {(telemetry.imu?.peak_g || 0) > 20 && <p className="text-xs text-red-500 font-bold mt-2">SEVERITY DETECTED</p>}
          {(telemetry.imu?.peak_g || 0) > 8 && (telemetry.imu?.peak_g || 0) <= 20 && <p className="text-xs text-yellow-500 font-bold mt-2">HEAVY IMPACT</p>}
        </div>

        <div className="bg-surface-container p-6 rounded-xl border border-white/5 md:col-span-2">
          <p className="text-xs text-outline uppercase tracking-widest mb-2">Velocity</p>
          <p className="text-4xl font-bold text-primary">
            {(telemetry.gps?.velocity_kmh || 0).toFixed(1)} <span className="text-sm text-outline">km/h</span>
          </p>
        </div>
        
        <div className="bg-surface-container p-6 rounded-xl border border-white/5 col-span-full">
          <p className="text-xs text-outline uppercase tracking-widest mb-2">Live Coordinates</p>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-mono">{(telemetry.gps?.latitude || 0).toFixed(6)}, {(telemetry.gps?.longitude || 0).toFixed(6)}</span>
            <a href={`https://www.google.com/maps?q=${telemetry.gps?.latitude || 0},${telemetry.gps?.longitude || 0}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-outline hover:text-primary hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined">open_in_new</span>
            </a>
          </div>
        </div>
      </div>
      
      {/* Timeframe selector */}
      <div className="mt-8 mb-4 flex justify-end">
        <div className="bg-surface-container rounded-lg p-1 flex gap-2 border border-white/5">
          {[
            { label: 'Live (60s)', val: 0 },
            { label: '1 Week', val: 1 },
            { label: '2 Weeks', val: 2 },
            { label: '3 Weeks', val: 3 },
            { label: '4 Weeks', val: 4 }
          ].map((tf) => (
            <button
              key={tf.val}
              onClick={() => setTimeframe(tf.val)}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                timeframe === tf.val ? 'bg-primary text-on-primary' : 'text-outline hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* CHART with crash highlight */}
      <LiveChart data={chartData} crashPoint={graphCrashPoint} />
      
      <div className="flex justify-between text-xs text-outline mt-2 flex-wrap gap-2">
        <div>📈 Showing last {chartData.length} data points ({timeframe === 0 ? '60 max' : '1000 max'})</div>
        <div>🗺️ Map auto-updates with vehicle location</div>
        <div>📊 Chart updates every 2 seconds</div>
        {graphCrashPoint && (
          <div className="text-red-400">⚠️ Crash event marked on chart</div>
        )}
      </div>
    </div>
  );
}
