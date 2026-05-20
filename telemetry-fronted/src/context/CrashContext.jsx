// src/context/CrashContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useFleet } from './FleetContext';
import { api, API_BASE_URL } from '../utils/api';

const CrashContext = createContext();

export const useCrash = () => {
  const context = useContext(CrashContext);
  if (!context) {
    throw new Error('useCrash must be used within a CrashProvider');
  }
  return context;
};

export const CrashProvider = ({ children }) => {
  const { activeDeviceId, hasActiveDevice } = useFleet();
  
  const [activeCrash, setActiveCrash] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [timer, setTimer] = useState(15);
  const [smsStatus, setSmsStatus] = useState(null);
  const [smsError, setSmsError] = useState(null);
  const [crashHistory, setCrashHistory] = useState([]);
  const [mapCrashPoint, setMapCrashPoint] = useState(null);
  const [graphCrashPoint, setGraphCrashPoint] = useState(null);
  
  const timerRef = useRef(null);
  const crashTimeoutRef = useRef(null);
  const lastCrashTimeRef = useRef(0);
  const lastProcessedCrashIdRef = useRef(null); // Track last processed crash to avoid duplicates

  // Load crash history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('crash_history');
    if (stored) {
      try {
        setCrashHistory(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  // Save crash history to localStorage
  const saveCrashToHistory = (crash, status, smsResult = null) => {
    const newEntry = {
      id: crash.id,
      deviceId: crash.deviceId,
      severity: crash.severity,
      deltaG: crash.deltaG,
      currentG: crash.currentG,
      timestamp: crash.timestamp,
      lat: crash.lat,
      lng: crash.lng,
      status: status,
      smsSent: status === 'sent',
      smsFailed: status === 'failed',
      acknowledged: status === 'acknowledged',
      acknowledgedAt: status === 'acknowledged' ? new Date().toISOString() : null,
      createdAt: new Date().toISOString()
    };
    
    setCrashHistory(prev => {
      const updated = [newEntry, ...prev];
      localStorage.setItem('crash_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Send SMS
  const sendSms = async (crash) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/alert/sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          deviceId: crash.deviceId,
          severity: crash.severity,
          deltaG: crash.deltaG,
          prevG: crash.prevG,
          currentG: crash.currentG,
          timestamp: crash.timestamp,
          lat: crash.lat,
          lng: crash.lng,
        }),
      });
      
      if (res.ok) {
        setSmsStatus('sent');
        setSmsError(null);
        saveCrashToHistory(crash, 'sent', true);
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        setSmsStatus('failed');
        setSmsError(errData.details || errData.error || 'Server error');
        saveCrashToHistory(crash, 'failed', false);
        return false;
      }
    } catch (err) {
      console.error('SMS failed:', err);
      setSmsStatus('failed');
      setSmsError(err.message || 'Network error');
      saveCrashToHistory(crash, 'failed', false);
      return false;
    }
  };

  // Start auto SMS countdown
  const startTimer = (crash) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(15);
    
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          sendSms(crash);
          setShowBanner(false);
          setActiveCrash(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle new crash detection
  const handleNewCrash = (crash) => {
    // Check if this crash was already processed (by ID)
    if (lastProcessedCrashIdRef.current === crash.id) {
      console.log('Duplicate crash ignored:', crash.id);
      return;
    }
    
    const now = Date.now();
    // Prevent multiple crashes within 15 seconds
    if (now - lastCrashTimeRef.current < 15000) {
      console.log('Crash ignored - within 15 second cooldown');
      return;
    }
    
    lastCrashTimeRef.current = now;
    lastProcessedCrashIdRef.current = crash.id;
    
    // Clear any existing timeouts
    if (timerRef.current) clearInterval(timerRef.current);
    if (crashTimeoutRef.current) clearTimeout(crashTimeoutRef.current);
    
    setActiveCrash(crash);
    setMapCrashPoint({ lat: crash.lat, lng: crash.lng, severity: crash.severity, currentG: crash.currentG });
    setGraphCrashPoint(crash);
    setShowBanner(true);
    setSmsStatus(null);
    setSmsError(null);
    
    // Start the 15 second timer
    startTimer(crash);
    
    // Auto-hide banner after 20 seconds
    crashTimeoutRef.current = setTimeout(() => {
      if (showBanner && activeCrash) {
        setShowBanner(false);
        setActiveCrash(null);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 20000);
  };

  // Acknowledge crash
  const acknowledgeCrash = () => {
    if (activeCrash) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (crashTimeoutRef.current) clearTimeout(crashTimeoutRef.current);
      
      saveCrashToHistory(activeCrash, 'acknowledged');
      setSmsStatus(null);
      setSmsError(null);
      setShowBanner(false);
      setActiveCrash(null);
    }
  };

  // Clear map crash point after 15 seconds
  useEffect(() => {
    if (mapCrashPoint) {
      const timeout = setTimeout(() => {
        setMapCrashPoint(null);
      }, 15000);
      return () => clearTimeout(timeout);
    }
  }, [mapCrashPoint]);

  // Clear graph crash point after 30 seconds (but keep in history)
  useEffect(() => {
    if (graphCrashPoint) {
      const timeout = setTimeout(() => {
        setGraphCrashPoint(null);
      }, 30000);
      return () => clearTimeout(timeout);
    }
  }, [graphCrashPoint]);

  const lastPollRef = useRef(0);
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!hasActiveDevice || !activeDeviceId) return;
    
    const pollForCrash = async () => {
      // Prevent multiple simultaneous polls
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${API_BASE_URL}/api/telemetry/incidents/${activeDeviceId}?minDelta=7`,
          { headers: { Authorization: token ? `Bearer ${token}` : '' } }
        );
        if (!res.ok) return;
        const incidents = await res.json();
        
        // Only process if there's a NEW high-severity incident
        if (incidents && incidents.length > 0 && !showBanner) {
          const latest = incidents[0];
          const severity = latest.spike?.severity;
          
          if (severity === 'critical' || severity === 'severe') {
            const crashTime = new Date(latest.timestampISO || latest.timestamp).getTime();
            const now = Date.now();
            
            // Only trigger if the crash happened within the last 20 seconds
            if (now - crashTime < 20000) {
              const crash = {
                id: latest._id || latest.timestampISO,
                deviceId: latest.deviceId || activeDeviceId,
                severity: severity,
                deltaG: latest.spike?.delta_g || 0,
                prevG: latest.spike?.prev_g || 0,
                currentG: latest.imu?.peak_g || 0,
                lat: latest.gps?.latitude || null,
                lng: latest.gps?.longitude || null,
                timestamp: latest.timestampISO || latest.timestamp || new Date().toISOString(),
              };
              
              // Only trigger if this is a different crash from last one
              if (lastProcessedCrashIdRef.current !== crash.id) {
                handleNewCrash(crash);
              }
            }
          }
        }
      } catch (err) {
        // Silently fail
      } finally {
        isPollingRef.current = false;
      }
    };
    
    // Poll every 5 seconds instead of 3
    pollForCrash();
    const interval = setInterval(pollForCrash, 5000);
    return () => clearInterval(interval);
  }, [activeDeviceId, hasActiveDevice, showBanner]);

  return (
    <CrashContext.Provider value={{
      activeCrash,
      showBanner,
      timer,
      smsStatus,
      smsError,
      crashHistory,
      mapCrashPoint,
      graphCrashPoint,
      acknowledgeCrash,
      getCrashHistory: () => crashHistory
    }}>
      {children}
    </CrashContext.Provider>
  );
};
