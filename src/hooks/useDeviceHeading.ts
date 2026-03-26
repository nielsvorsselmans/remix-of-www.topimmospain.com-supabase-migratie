import { useState, useEffect, useCallback } from 'react';

interface UseDeviceHeadingResult {
  heading: number | null;
  error: string | null;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported';
  requestPermission: () => Promise<boolean>;
}

export function useDeviceHeading(): UseDeviceHeadingResult {
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // For iOS devices, use webkitCompassHeading if available
    const compassHeading = (event as any).webkitCompassHeading;
    
    if (typeof compassHeading === 'number') {
      setHeading(compassHeading);
    } else if (event.alpha !== null) {
      // Android and other devices: alpha is degrees from north
      // Note: alpha is counterclockwise, so we need to invert it
      setHeading((360 - event.alpha) % 360);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Check if DeviceOrientationEvent exists
    if (typeof DeviceOrientationEvent === 'undefined') {
      setError('Device orientation not supported');
      setPermissionState('unsupported');
      return false;
    }

    // iOS 13+ requires permission request
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setPermissionState('granted');
          window.addEventListener('deviceorientation', handleOrientation, true);
          return true;
        } else {
          setPermissionState('denied');
          setError('Compass permission denied');
          return false;
        }
      } catch (err) {
        setError('Failed to request compass permission');
        setPermissionState('denied');
        return false;
      }
    } else {
      // Non-iOS or older iOS - just add the listener
      setPermissionState('granted');
      window.addEventListener('deviceorientation', handleOrientation, true);
      return true;
    }
  }, [handleOrientation]);

  useEffect(() => {
    // Check for support
    if (typeof DeviceOrientationEvent === 'undefined') {
      setPermissionState('unsupported');
      return;
    }

    // On non-iOS devices, try to listen directly
    if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
      // Attempt to listen - will work on Android
      window.addEventListener('deviceorientation', handleOrientation, true);
      
      // Wait a moment to see if we get data
      const timeout = setTimeout(() => {
        if (heading === null) {
          // Device might not have a compass
          setPermissionState('unsupported');
        } else {
          setPermissionState('granted');
        }
      }, 1000);

      return () => {
        clearTimeout(timeout);
        window.removeEventListener('deviceorientation', handleOrientation, true);
      };
    }

    // iOS: permission must be requested via user gesture
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [handleOrientation, heading]);

  return { heading, error, permissionState, requestPermission };
}
