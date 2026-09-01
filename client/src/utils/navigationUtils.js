/**
 * Utilidades de navegación y Deep Linking para chóferes y cuadrillas operativas
 */

/**
 * Genera la URL universal de navegación según el proveedor (Google Maps / Waze)
 *
 * @param {number|string} lat - Latitud
 * @param {number|string} lng - Longitud
 * @param {'google'|'waze'} provider - Proveedor de mapas
 * @returns {string|null} URL estructurada para Deep Linking
 */
export const getNavigationUrl = (lat, lng, provider = 'google') => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return null;
  }

  if (provider === 'waze') {
    // Formato universal Waze Deep Link (abre la app o web)
    return `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
  }

  // Formato universal Google Maps Directions con modo conducción
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
};

/**
 * Abre la app nativa o web de navegación GPS de manera segura
 *
 * @param {number|string} lat - Latitud
 * @param {number|string} lng - Longitud
 * @param {'google'|'waze'} provider - Proveedor de mapas
 */
export const handleNavigate = (lat, lng, provider = 'google') => {
  const url = getNavigationUrl(lat, lng, provider);
  if (!url) {
    console.warn('[handleNavigate] Coordenadas inválidas para navegación:', { lat, lng });
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
};
