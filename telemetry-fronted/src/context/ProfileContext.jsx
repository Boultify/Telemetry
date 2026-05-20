import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';

const ProfileContext = createContext();

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

const emptyProfile = (user) => ({
  driverName: user?.username || '',
  email: user?.email || '',
  deviceId: '',
  emergencyNumber: '',
});

export const ProfileProvider = ({ children }) => {
  const { user, token, loading: authLoading, isAdmin } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const deviceId = (profile?.deviceId || '').trim();
  const hasDevice = deviceId.length > 0;

  const loadProfile = useCallback(async () => {
    if (!user || !token) {
      setProfile(null);
      setLoading(false);
      return;
    }

    if (isAdmin) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/api/profile/latest');
      if (response?.ok) {
        const data = await response.json();
        if (data.deviceId === 'UNASSIGNED') {
          data.deviceId = '';
        }
        setProfile(data);
      } else {
        setProfile(emptyProfile(user));
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setProfile(emptyProfile(user));
    } finally {
      setLoading(false);
    }
  }, [user, token, isAdmin]);

  useEffect(() => {
    if (authLoading) return;
    loadProfile();
  }, [authLoading, loadProfile]);

  const saveProfile = async ({ driverName, email, deviceId: nextDeviceId, emergencyNumber }) => {
    const trimmedDeviceId = (nextDeviceId || '').trim();

    const response = await api.post('/api/profile', {
      driverName: driverName?.trim() || '',
      email: email?.trim() || '',
      deviceId: trimmedDeviceId,
      emergencyNumber: (emergencyNumber || '').trim(),
    });

    if (!response) {
      return { success: false, error: 'Could not connect to the server.' };
    }

    let result = {};
    try {
      result = await response.json();
    } catch {
      result = { error: 'Invalid response from server' };
    }

    if (response.ok) {
      const saved = result.profile || {};
      if (saved.deviceId === 'UNASSIGNED') {
        saved.deviceId = '';
      }
      setProfile(saved);
      return { success: true, message: result.message, profile: saved };
    }

    return { success: false, error: result.error || 'Failed to save profile' };
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        deviceId,
        hasDevice,
        loading: authLoading || loading,
        loadProfile,
        saveProfile,
        setProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
