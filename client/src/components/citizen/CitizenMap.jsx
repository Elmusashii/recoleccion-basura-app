import React from 'react';
import { InteractiveMap } from '../InteractiveMap';
import { BARRIOS_ASUNCION_GEOJSON } from '../../data/barriosAsuncionGeoJSON';

/**
 * CitizenMap - Wrapper del mapa ciudadano oficial de Asunción
 * Utiliza el nuevo componente vectorial GeoJSON `InteractiveMap`
 */
export const CitizenMap = ({ onOpenReportModal, reports = [] }) => {
  return (
    <InteractiveMap
      geojsonData={BARRIOS_ASUNCION_GEOJSON}
      reports={reports}
      onOpenReportModal={onOpenReportModal}
    />
  );
};

export default CitizenMap;
