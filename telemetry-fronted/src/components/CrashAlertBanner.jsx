// src/components/CrashAlertBanner.jsx
import React from 'react';
import { useCrash } from '../context/CrashContext';

export default function CrashAlertBanner() {
  const { activeCrash, showBanner, timer, smsStatus, smsError, acknowledgeCrash } = useCrash();

  if (!showBanner || !activeCrash) return null;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const severityColors = {
    critical: 'border-red-500 bg-red-500/10',
    severe: 'border-orange-500 bg-orange-500/10'
  };

  const bgColor = severityColors[activeCrash.severity] || severityColors.severe;

  return (
    <div className="w-full shrink-0 z-40 animate-in slide-in-from-top duration-300">
      <div className={`mx-4 md:mx-8 mt-4 p-4 rounded-xl border-2 ${bgColor} shadow-2xl`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-red-500/20 p-3 rounded-full">
              <span className="material-symbols-outlined text-red-500 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                warning
              </span>
            </div>
            <div>
              <h2 className="font-headline text-xl font-bold text-red-400 uppercase">
                CRASH DETECTED!
              </h2>
              <p className="text-sm text-white">
                Vehicle {activeCrash.deviceId} · Impact: {activeCrash.currentG.toFixed(2)}G · 
                Severity: <span className="font-bold uppercase">{activeCrash.severity}</span>
              </p>
              {activeCrash.lat && activeCrash.lng && (
                <p className="text-xs text-outline mt-1 font-mono">
                  📍 {activeCrash.lat.toFixed(6)}, {activeCrash.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-red-400 tabular-nums">
                {formatTime(timer)}
              </div>
              <div className="text-[9px] text-outline uppercase tracking-wider">Auto-SMS in</div>
            </div>
            
            <button
              onClick={acknowledgeCrash}
              className="px-6 py-3 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 transition-all active:scale-95"
            >
              <span className="font-bold text-green-400 uppercase tracking-wider">I'M OKAY</span>
              <span className="text-[10px] text-green-400/70 block">Cancel SMS</span>
            </button>
          </div>
        </div>
        
        {smsStatus === 'sent' && (
          <div className="mt-3 text-center text-green-400 text-xs">
            ✅ Emergency SMS sent successfully
          </div>
        )}
        {smsStatus === 'failed' && (
          <div className="mt-3 text-center text-red-400 text-xs">
            ❌ SMS failed to send. Check Twilio configuration.
            {smsError && (
              <span className="block font-mono mt-1.5 text-[10px] text-red-300 bg-red-950/40 py-1 px-3 rounded-lg max-w-xl mx-auto border border-red-500/20">
                Error details: {smsError}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
