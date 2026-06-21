import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useFleet } from '../context/FleetContext';
import { useCrash } from '../context/CrashContext';
import DeviceSetupRequired from '../components/DeviceSetupRequired';

function severityStyle(severity) {
  switch (severity) {
    case 'critical':
      return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'severe':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'moderate':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    case 'minor':
      return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    default:
      return 'text-outline bg-surface-container-high border-outline-variant/20';
  }
}

// Status card styling
function getStatusStyle(status, smsSent, smsFailed) {
  if (status === 'acknowledged') {
    return {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      icon: 'check_circle',
      label: 'ACKNOWLEDGED - NO SMS SENT'
    };
  }
  if (smsSent || status === 'sent') {
    return {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      icon: 'warning',
      label: 'SMS SENT'
    };
  }
  if (smsFailed || status === 'failed') {
    return {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      icon: 'error',
      label: 'SMS FAILED'
    };
  }
  return {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
    icon: 'help',
    label: 'UNKNOWN'
  };
}

export default function Alerts() {
  const { activeDeviceId, hasActiveDevice, existsInTelemetry, loading: fleetLoading, isAdmin } = useFleet();
  const { crashHistory } = useCrash();
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  
  const [smsFilter, setSmsFilter] = useState('all');
  const [gValueFilter, setGValueFilter] = useState('all');

  useEffect(() => {
    if (!hasActiveDevice) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/api/telemetry/incidents/${activeDeviceId}`);
        if (res?.ok) {
          setAlerts(await res.json());
        } else {
          setAlerts([]);
        }
      } catch (err) {
        console.error('Failed to load alerts:', err);
        setAlerts([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [activeDeviceId, hasActiveDevice]);

  if (fleetLoading || isLoading) {
    return (
      <div className="p-8 text-center text-primary animate-pulse tracking-widest font-bold">
        LOADING ALERTS...
      </div>
    );
  }

  if (!hasActiveDevice) {
    return (
      <DeviceSetupRequired
        title={isAdmin ? 'Select a vehicle in Admin' : 'Set your Device ID on Profile'}
      />
    );
  }

  if (!existsInTelemetry) {
    return <DeviceSetupRequired title="Device ID not found in MongoDB telemetries" />;
  }

  const historyAlerts = crashHistory || [];

  const getStatusForEntry = (entry) => {
    const entryId = entry._id || entry.timestampISO || entry.timestamp;
    const match = historyAlerts.find(h => 
      h.id === entryId || 
      (h.deviceId === entry.deviceId && 
       Math.abs(new Date(h.timestamp).getTime() - new Date(entry.timestamp).getTime()) < 5000)
    );
    
    if (match) {
      return match;
    }
    
    // Fallback if not in history
    const crashTime = new Date(entry.timestamp).getTime();
    if (Date.now() - crashTime > 20000) {
      return {
        status: 'sent',
        smsSent: true,
        smsFailed: false,
        acknowledged: false
      };
    }
    
    return {
      status: 'pending',
      smsSent: false,
      smsFailed: false,
      acknowledged: false
    };
  };

  const filteredAlerts = alerts.filter(entry => {
    const status = getStatusForEntry(entry);
    const severity = entry.spike?.severity || 'none';
    
    if (smsFilter === 'sent' && !status.smsSent) return false;
    if (smsFilter === 'not_sent' && status.smsSent) return false;
    
    if (gValueFilter === 'high' && severity !== 'critical') return false;
    if (gValueFilter === 'average' && severity !== 'severe') return false;
    
    return true;
  });

  const filteredHistory = historyAlerts.filter(crash => {
    const severity = crash.severity || 'none';
    
    if (smsFilter === 'sent' && !crash.smsSent) return false;
    if (smsFilter === 'not_sent' && crash.smsSent) return false;
    
    if (gValueFilter === 'high' && severity !== 'critical') return false;
    if (gValueFilter === 'average' && severity !== 'severe') return false;
    
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full flex flex-col gap-6">
      {/* Header with tabs */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-headline text-3xl font-black tracking-tighter text-on-surface uppercase">
            Alerts
          </h1>
          <p className="text-xs text-outline font-medium tracking-wide mt-1 uppercase">
            Impact spikes for device <span className="font-mono text-primary">{activeDeviceId}</span>
          </p>
        </div>
        
        {/* Tab toggle */}
        <div className="flex gap-2 bg-surface-container rounded-lg p-1">
          <button
            onClick={() => setShowHistory(false)}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
              !showHistory ? 'bg-primary text-on-primary' : 'text-outline hover:text-on-surface'
            }`}
          >
            Live Alerts
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
              showHistory ? 'bg-primary text-on-primary' : 'text-outline hover:text-on-surface'
            }`}
          >
            History ({historyAlerts.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap bg-surface-container/50 p-3 rounded-lg border border-border-theme">
        <select 
          className="bg-surface-container border border-border-theme text-on-surface text-xs font-bold tracking-wider uppercase rounded px-3 py-2 outline-none focus:border-primary"
          value={smsFilter}
          onChange={(e) => setSmsFilter(e.target.value)}
        >
          <option value="all">All SMS Status</option>
          <option value="sent">SMS Sent</option>
          <option value="not_sent">SMS Not Sent</option>
        </select>
        
        <select 
          className="bg-surface-container border border-border-theme text-on-surface text-xs font-bold tracking-wider uppercase rounded px-3 py-2 outline-none focus:border-primary"
          value={gValueFilter}
          onChange={(e) => setGValueFilter(e.target.value)}
        >
          <option value="all">All G Values</option>
          <option value="high">High (Critical)</option>
          <option value="average">Average (Severe)</option>
        </select>
      </div>

      {/* Live Alerts View */}
      {!showHistory && (
        <>
          {filteredAlerts.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-outline-variant/20 bg-surface-container">
              <span className="material-symbols-outlined text-5xl text-secondary mb-4 block">notifications_off</span>
              <p className="text-sm text-outline">No impact alerts matched the filters.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredAlerts.map((entry) => {
                const ts = entry.timestamp ? new Date(entry.timestamp) : null;
                const severity = entry.spike?.severity || 'none';
                const status = getStatusForEntry(entry);
                const statusStyle = getStatusStyle(status.status, status.smsSent, status.smsFailed);
                
                return (
                  <li
                    key={entry._id}
                    className={`p-4 rounded-xl border-2 ${statusStyle.bg} ${statusStyle.border} flex flex-wrap items-start justify-between gap-3 transition-all`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                          {statusStyle.label}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${severityStyle(severity)}`}>
                          {severity.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="font-headline font-bold text-sm text-on-surface">
                        {severity === 'none' ? 'Spike detected' : `${severity} impact`}
                      </p>
                      <p className="text-xs mt-1 opacity-80 text-outline">
                        ΔG: {(entry.spike?.delta_g ?? 0).toFixed(2)} · Peak: {(entry.imu?.peak_g ?? 0).toFixed(2)} G
                      </p>
                      {entry.gps?.latitude != null && (
                        <p className="text-[10px] font-mono mt-1 opacity-70 text-outline">
                          📍 {entry.gps.latitude.toFixed(5)}, {entry.gps.longitude?.toFixed(5)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <time className="text-[10px] font-mono uppercase tracking-widest opacity-70">
                        {ts ? ts.toLocaleString() : '—'}
                      </time>
                      <span className="material-symbols-outlined text-2xl opacity-40">
                        {statusStyle.icon}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* Crash History View - Color coded */}
      {showHistory && (
        <>
          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-border-theme bg-surface-container">
              <span className="material-symbols-outlined text-5xl text-secondary mb-4 block">history</span>
              <p className="text-sm text-outline">No crash history matched the filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((crash, idx) => {
                const statusStyle = getStatusStyle(crash.status, crash.smsSent, crash.smsFailed);
                const crashTime = new Date(crash.timestamp || crash.createdAt);
                const acknowledgedTime = crash.acknowledgedAt ? new Date(crash.acknowledgedAt) : null;
                
                return (
                  <div
                    key={crash.id || idx}
                    className={`p-4 rounded-xl border ${statusStyle.bg} ${statusStyle.border} transition-all`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                          </span>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${severityStyle(crash.severity)}`}>
                            {crash.severity?.toUpperCase() || 'UNKNOWN'}
                          </span>
                          {crash.acknowledged && (
                            <span className="text-[10px] text-green-400/70 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">verified</span>
                              Acknowledged: No SMS sent
                            </span>
                          )}
                          {crash.smsSent && (
                            <span className="text-[10px] text-red-400/70 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">sms</span>
                              SMS sent to emergency contact
                            </span>
                          )}
                          {crash.smsFailed && (
                            <span className="text-[10px] text-yellow-400/70 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">error</span>
                              SMS delivery failed
                            </span>
                          )}
                        </div>
                        
                        <p className="font-headline font-bold text-sm text-on-surface mt-2">
                          Vehicle: {crash.deviceId}
                        </p>
                        <p className="text-xs text-outline mt-1">
                          Impact: {crash.currentG?.toFixed(2) || crash.deltaG?.toFixed(2)} G · 
                          Delta: {crash.deltaG?.toFixed(2)} G
                        </p>
                        
                        {crash.lat && crash.lng && (
                          <p className="text-[10px] font-mono text-outline mt-1">
                            📍 {crash.lat.toFixed(6)}, {crash.lng.toFixed(6)}
                          </p>
                        )}
                        
                        <p className="text-[10px] text-outline/50 mt-2">
                          Crash detected: {crashTime.toLocaleString()}
                          {acknowledgedTime && (
                            <> · Acknowledged: {acknowledgedTime.toLocaleString()}</>
                          )}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-3xl opacity-50">
                          {statusStyle.icon}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
