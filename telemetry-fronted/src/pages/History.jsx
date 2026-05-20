import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api';
import { useFleet } from '../context/FleetContext';
import DeviceSetupRequired from '../components/DeviceSetupRequired';

export default function History() {
  const { activeDeviceId, hasActiveDevice, loading: fleetLoading } = useFleet();
  const [historyData, setHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic DB retrieve limit
  const [loadLimit, setLoadLimit] = useState(100);

  // Filter & Pagination states
  const [minGFilter, setMinGFilter] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [goToPage, setGoToPage] = useState('');

  useEffect(() => {
    if (!hasActiveDevice) {
      setHistoryData([]);
      setIsLoading(false);
      return;
    }
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/api/telemetry/history/${activeDeviceId}?limit=${loadLimit}`);
        if (response?.ok) {
          const data = await response.json();
          setHistoryData([...data].reverse());
        } else {
          setHistoryData([]);
        }
      } catch (error) {
        console.error("Failed to fetch history data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [activeDeviceId, hasActiveDevice, loadLimit]);

  // Calculate REAL stats from the fetched data
  const peakGForce = useMemo(() => {
    if (historyData.length === 0) return 0;
    return Math.max(...historyData.map(log => log.imu.peak_g));
  }, [historyData]);

  const avgVelocity = useMemo(() => {
    if (historyData.length === 0) return 0;
    const totalVelocity = historyData.reduce((sum, log) => sum + log.gps.velocity_kmh, 0);
    return totalVelocity / historyData.length;
  }, [historyData]);

  // Filter logic
  const filteredData = useMemo(() => {
    return historyData.filter(log => log.imu.peak_g >= minGFilter);
  }, [historyData, minGFilter]);

  const totalPages = Math.ceil(filteredData.length / entriesPerPage);

  // Paginated logic
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredData.slice(start, start + entriesPerPage);
  }, [filteredData, currentPage, entriesPerPage]);

  if (fleetLoading || isLoading) {
    return <div className="p-8 text-center text-primary animate-pulse font-bold tracking-widest">LOADING PERFORMANCE ARCHIVES...</div>;
  }

  if (!hasActiveDevice) {
    return <DeviceSetupRequired title="Select a vehicle in Admin" />;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 w-full">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="font-label text-xs uppercase tracking-[0.2em] text-outline font-bold">
            Historical System Analytics
          </p>
          <h2 className="font-headline text-4xl font-bold tracking-tight text-on-surface">
            PERFORMANCE ARCHIVES
          </h2>
        </div>
        <div className="flex gap-3">
          <div className="bg-surface-container-high px-4 py-2 rounded-lg border border-white/5 shadow-md">
            <span className="text-xs text-outline font-medium">Retrieved Records: </span>
            <span className="text-lg font-black text-primary font-mono">{historyData.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* REAL Average Velocity Card */}
        <div className="bg-surface-container p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all shadow-lg">
          <p className="font-label text-[10px] font-bold tracking-[0.2em] text-outline uppercase mb-4">
            Average Velocity
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-5xl font-bold text-primary font-mono">{avgVelocity.toFixed(1)}</span>
            <span className="font-label text-sm text-outline font-medium">KM/H</span>
          </div>
        </div>

        {/* REAL Peak G-Force Card */}
        <div className="bg-surface-container p-6 rounded-2xl border border-white/5 hover:border-secondary/30 transition-all shadow-lg">
          <p className="font-label text-[10px] font-bold tracking-[0.2em] text-outline uppercase mb-4">
            Peak G-Force (All-time)
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-5xl font-bold text-secondary font-mono">{peakGForce.toFixed(3)}</span>
            <span className="font-label text-sm text-outline font-medium">G</span>
          </div>
        </div>
        
        {/* Log Count Card */}
        <div className="bg-surface-container p-6 rounded-2xl border border-white/5 shadow-lg">
          <p className="font-label text-[10px] font-bold tracking-[0.2em] text-outline uppercase mb-4">
            Total Logs Retrieved
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-5xl font-bold font-mono">{historyData.length}</span>
            <span className="font-label text-sm text-outline font-medium">entries</span>
          </div>
          <p className="text-xs text-outline mt-2">⬇Newest entries shown first</p>
        </div>
      </div>

      {/* Detailed Log Section - NEWEST ON TOP */}
      <div className="bg-surface-container rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <h3 className="font-headline text-xl font-bold tracking-tight text-white">RECENT TELEMETRY LOGS</h3>
            <p className="text-xs text-outline mt-1 uppercase tracking-widest">⬇Newest data at the top</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Dynamic DB load limit */}
            <div className="flex items-center gap-2 bg-surface-container-high px-4 py-2.5 rounded-xl border border-white/5 shadow-inner">
              <span className="text-xs text-outline font-bold uppercase tracking-wider">Retrieve Limit:</span>
              <select
                value={loadLimit}
                onChange={(e) => {
                  setLoadLimit(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-surface-container text-white px-3 py-1 rounded-lg text-xs border border-white/10 outline-none font-bold cursor-pointer hover:border-white/20 transition-all"
              >
                <option value="30">Latest 30</option>
                <option value="100">Latest 100</option>
                <option value="500">Latest 500</option>
                <option value="1000">Latest 1000</option>
                <option value="5000">All (5000)</option>
              </select>
            </div>

            {/* Min G-Force Slider */}
            <div className="flex items-center gap-3 bg-surface-container-high px-4 py-2.5 rounded-xl border border-white/5 shadow-inner">
              <span className="text-xs text-outline font-bold uppercase tracking-wider">Min G-Force:</span>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={minGFilter}
                onChange={(e) => {
                  setMinGFilter(parseFloat(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-32 accent-primary cursor-pointer hover:accent-primary-hover"
              />
              <span className="text-xs font-black font-mono text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                {minGFilter.toFixed(1)} G
              </span>
            </div>
            
            <div className="text-xs bg-primary/10 border border-primary/20 px-3.5 py-2 rounded-xl text-primary font-bold">
              {filteredData.length} of {historyData.length} records matching
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-white/5 sticky top-0">
                <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">#</th>
                <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Timestamp (Newest First)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Peak G-Force</th>
                <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Velocity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Location (Lat, Lng)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest text-center">GPS Fix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedData.length > 0 ? paginatedData.map((log, index) => {
                const logDate = new Date(log.timestamp);
                const absoluteIndex = (currentPage - 1) * entriesPerPage + index + 1;
                const isNewest = absoluteIndex === 1;
                const isCrash = log.imu.peak_g > 20;
                const isHeavy = log.imu.peak_g > 8;
                const isModerate = log.imu.peak_g > 3.4;
                
                return (
                  <tr 
                    key={log._id} 
                    className={`hover:bg-surface-bright transition-colors group cursor-pointer ${
                      isNewest ? 'bg-primary/5 border-l-4 border-primary' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-xs text-outline font-mono">
                      {absoluteIndex}
                      {isNewest && <span className="ml-2 text-[8px] text-primary font-bold">NEWEST</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-outline-variant font-mono">
                      <div className="font-bold">{logDate.toLocaleDateString()}</div>
                      <div className="text-primary">{logDate.toLocaleTimeString()}</div>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold font-mono ${
                      isCrash ? 'text-red-500 animate-pulse' :
                      isHeavy ? 'text-yellow-500' :
                      isModerate ? 'text-purple-400' : 'text-gray-400'
                    }`}>
                      {log.imu.peak_g.toFixed(3)} G
                      {isCrash && <span className="ml-2 text-[10px] text-red-500 font-black">SEVERITY</span>}
                      {!isCrash && isHeavy && <span className="ml-2 text-[10px] text-yellow-500 font-black">HEAVY</span>}
                      {!isCrash && !isHeavy && isModerate && <span className="ml-2 text-[10px] text-purple-400 font-black">MODERATE</span>}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-primary">
                      {log.gps.velocity_kmh.toFixed(1)} KM/H
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-outline">
                      {log.gps.latitude.toFixed(6)}, {log.gps.longitude.toFixed(6)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-[9px] font-black uppercase rounded ${
                        log.gps.fixed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {log.gps.fixed ? 'FIXED' : 'NO FIX'}
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-outline">
                    No matching historical data found for device: {activeDeviceId}
                    <div className="text-xs mt-2">Try adjusting your Retrieve Limit or G-Force filter settings</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination & Footer controls */}
        <div className="p-5 border-t border-white/5 bg-surface-container-low flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Show Entries Dropdown */}
          <div className="flex items-center gap-2.5 text-xs text-outline bg-surface-container-high px-3 py-1.5 rounded-lg border border-white/5 shadow-inner">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-surface-container text-white px-2.5 py-1 rounded-md border border-white/10 outline-none font-bold cursor-pointer hover:border-white/20 transition-all text-xs"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>entries per page</span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || totalPages === 0}
                className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-white text-xs rounded-lg border border-white/10 disabled:opacity-30 disabled:hover:bg-surface-container font-black transition-all cursor-pointer"
                title="First Page"
              >
                &lt;&lt;
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-white text-xs rounded-lg border border-white/10 disabled:opacity-30 disabled:hover:bg-surface-container font-black transition-all cursor-pointer"
                title="Previous Page"
              >
                &lt;
              </button>
              <span className="text-xs text-outline px-2.5 select-none">
                Page <span className="font-bold text-white font-mono">{currentPage}</span> of <span className="font-bold text-white font-mono">{totalPages || 1}</span>
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-white text-xs rounded-lg border border-white/10 disabled:opacity-30 disabled:hover:bg-surface-container font-black transition-all cursor-pointer"
                title="Next Page"
              >
                &gt;
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-white text-xs rounded-lg border border-white/10 disabled:opacity-30 disabled:hover:bg-surface-container font-black transition-all cursor-pointer"
                title="Last Page"
              >
                &gt;&gt;
              </button>
            </div>

            {/* Jump-To-Page Form */}
            {totalPages > 1 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const p = parseInt(goToPage);
                  if (p >= 1 && p <= totalPages) {
                    setCurrentPage(p);
                    setGoToPage('');
                  }
                }}
                className="flex items-center gap-1.5 bg-surface-container-high px-2 py-1 rounded-lg border border-white/5 shadow-inner"
              >
                <span className="text-xs text-outline select-none pl-1">Go to:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={goToPage}
                  onChange={(e) => setGoToPage(e.target.value)}
                  className="w-12 bg-surface-container text-white px-2 py-0.5 rounded text-xs border border-white/10 outline-none text-center font-mono font-bold"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-primary hover:bg-primary-hover text-on-primary text-xs rounded-md font-bold transition-all"
                >
                  Go
                </button>
              </form>
            )}
          </div>

          {/* Record summary stats */}
          <div className="text-[11px] text-outline font-medium">
            Showing {filteredData.length > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0} to {Math.min(currentPage * entriesPerPage, filteredData.length)} of {filteredData.length} records
          </div>
        </div>
      </div>
    </div>
  );
}