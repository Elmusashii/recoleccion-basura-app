import React, { useMemo } from 'react';
import { InteractiveMap } from '../InteractiveMap';
import { BARRIOS_ASUNCION_GEOJSON } from '../../data/barriosAsuncionGeoJSON';
import { getActiveTrucksForCurrentTime } from '../../data/officialRoutes';

/**
 * CitizenMap - Wrapper del mapa ciudadano oficial de Asunción
 * Utiliza el componente vectorial GeoJSON `InteractiveMap`
 */
export const CitizenMap = ({ onOpenReportModal, reports = [], trucks, darkMode }) => {
  // Memorizar la lista de camiones activos para garantizar estabilidad referencial
  const activeTrucks = useMemo(() => {
    if (trucks && Array.isArray(trucks) && trucks.length > 0) return trucks;
    return getActiveTrucksForCurrentTime();
  }, [trucks]);

  return (
    <InteractiveMap
      geojsonData={BARRIOS_ASUNCION_GEOJSON}
      reports={reports}
      trucks={activeTrucks}
      onOpenReportModal={onOpenReportModal}
      darkMode={darkMode}
    />
  );
};

export default CitizenMap;
