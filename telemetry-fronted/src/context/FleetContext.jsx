import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useProfile } from './ProfileContext';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';

const STORAGE_KEY = 'fleetSelectedDeviceId';

const FleetContext = createContext();

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};

/** Case-insensitive match; returns canonical ID from telemetries collection when found */
function matchDeviceId(id, telemetryDeviceIds) {
  const trimmed = (id || '').trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  const found = telemetryDeviceIds.find((t) => String(t).trim().toLowerCase() === lower);
  return found ? String(found).trim() : '';
}

export const FleetProvider = ({ children }) => {
  const { deviceId: profileDeviceId, loading: profileLoading } = useProfile();
  const { isAdmin, user, loading: authLoading } = useAuth();
  const [selectedDeviceId, setSelectedDeviceIdState] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEY) || null;
  });
  const [telemetryDeviceIds, setTelemetryDeviceIds] = useState([]);
  const [devicesLoaded, setDevicesLoaded] = useState(false);

  const setSelectedDeviceId = useCallback((id) => {
    const next = id ? String(id).trim() : null;
    setSelectedDeviceIdState(next);
    if (next) {
      sessionStorage.setItem(STORAGE_KEY, next);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearFleetSelection = useCallback(() => {
    setSelectedDeviceId(null);
  }, [setSelectedDeviceId]);

  // Regular users never use admin fleet selection from session storage
  useEffect(() => {
    if (authLoading || !user) return;
    if (!isAdmin) {
      sessionStorage.removeItem(STORAGE_KEY);
      setSelectedDeviceIdState(null);
    }
  }, [authLoading, user, isAdmin]);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const res = await api.get('/api/telemetry/devices');
        if (res?.ok) {
          setTelemetryDeviceIds(await res.json());
        }
      } catch (err) {
        console.error('Failed to load telemetry device IDs:', err);
      } finally {
        setDevicesLoaded(true);
      }
    };
    loadDevices();
  }, []);

  const profileId = (profileDeviceId || '').trim();
  const selectedId = (selectedDeviceId || '').trim();
  const matchedProfileId = devicesLoaded ? matchDeviceId(profileId, telemetryDeviceIds) : '';
  const matchedSelectedId = devicesLoaded ? matchDeviceId(selectedId, telemetryDeviceIds) : '';

  let activeDeviceId = '';
  let hasActiveDevice = false;
  let resolvedId = '';
  let existsInTelemetry = false;

  if (isAdmin) {
    resolvedId = selectedId;
    // Use canonical matched ID if found, else fall back to raw selected ID.
    // Pages always attempt to fetch when a device is selected, even before telemetryDeviceIds loads.
    activeDeviceId = matchedSelectedId || selectedId;
    existsInTelemetry = matchedSelectedId.length > 0;
    hasActiveDevice = selectedId.length > 0; // only needs a selection, not a telemetry match
  } else {
    resolvedId = profileId;
    activeDeviceId = matchedProfileId || profileId;
    existsInTelemetry = matchedProfileId.length > 0;
    // User: use logged-in profile Device ID (pages load; empty state if ID not in MongoDB)
    hasActiveDevice = profileId.length > 0 && !profileLoading;
  }

  const loading = authLoading || profileLoading || !devicesLoaded;

  return (
    <FleetContext.Provider
      value={{
        selectedDeviceId,
        setSelectedDeviceId,
        clearFleetSelection,
        activeDeviceId,
        hasActiveDevice,
        profileDeviceId: profileId,
        telemetryDeviceIds,
        devicesLoaded,
        resolvedId,
        existsInTelemetry,
        loading,
        isAdmin,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};