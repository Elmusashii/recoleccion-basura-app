import { useState, useEffect } from 'react';

// Coordenadas por defecto: Centro de Asunción, Paraguay
const ASUNCION_CENTER = {
  lat: -25.2867,
  lng: -57.6470
};

export const useGeolocation = (autoFetch = false) => {
  const [coordinates, setCoordinates] = useState(ASUNCION_CENTER);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getPosition = () => {
    if (!navigator.geolocation) {
      setError('La geolocalización no es compatible con este navegador.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('Error al obtener geolocalización del usuario:', err.message);
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    if (autoFetch) {
      getPosition();
    }
  }, [autoFetch]);

  return { coordinates, setCoordinates, error, loading, getPosition, defaultCenter: ASUNCION_CENTER };
};
