import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported';
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
  watch?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}): GeolocationState & { requestPermission: () => void } {
  const {
    enableHighAccuracy = true,
    maximumAge = 10000,
    timeout = 15000,
    watch = true,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
    permissionState: 'prompt',
  });

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      error: null,
      loading: false,
      permissionState: 'granted',
    });
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage: string;
    let permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported' = 'denied';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        permissionState = 'denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location unavailable';
        permissionState = 'granted'; // Permission was granted, just can't get location
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        permissionState = 'granted';
        break;
      default:
        errorMessage = 'Unknown location error';
    }

    setState(prev => ({
      ...prev,
      error: errorMessage,
      loading: false,
      permissionState,
    }));
  }, []);

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation not supported',
        loading: false,
        permissionState: 'unsupported',
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      maximumAge,
      timeout,
    };

    if (watch) {
      const watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    }
  }, [enableHighAccuracy, maximumAge, timeout, watch, handleSuccess, handleError]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation not supported',
        loading: false,
        permissionState: 'unsupported',
      }));
      return;
    }

    // Check permission status if available
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          requestPermission();
        } else if (result.state === 'denied') {
          setState(prev => ({
            ...prev,
            loading: false,
            permissionState: 'denied',
            error: 'Location permission denied',
          }));
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
            permissionState: 'prompt',
          }));
        }

        result.addEventListener('change', () => {
          if (result.state === 'granted') {
            requestPermission();
          }
        });
      }).catch(() => {
        // Fallback: just try to get location
        setState(prev => ({ ...prev, loading: false }));
      });
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [requestPermission]);

  return { ...state, requestPermission };
}
