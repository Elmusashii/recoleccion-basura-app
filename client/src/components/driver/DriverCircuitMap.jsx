import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, AlertTriangle, AlertCircle, Navigation } from 'lucide-react';
import { BARRIOS_ASUNCION_GEOJSON } from '../../data/barriosAsuncionGeoJSON';
import { getTurnoColor } from '../InteractiveMap';

// Normalizador de cadenas para matching seguro de nombres de barrios
const normalizeText = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

// Componente para auto-ajustar la cámara a los límites del circuito asignado
const AutoFitBounds = ({ bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15, animate: true });
    }
  }, [map, bounds]);

  return null;
};

// Ícono del camión del chofer
const driverTruckIcon = new L.DivIcon({
  html: `<div class="relative flex items-center justify-center">
          <div class="bg-[#111111] dark:bg-slate-900 text-[#ffffff] p-1.5 rounded-sm shadow-sm border border-[#ffffff] dark:border-slate-700 flex items-center justify-center">
            <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
          </div>
        </div>`,
  className: 'custom-driver-truck',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Ícono de denuncia asignada al chofer (Rojo Alerta)
const driverReportIcon = new L.DivIcon({
  html: `<div class="w-7 h-7 bg-red-600 text-white rounded-sm border-2 border-slate-900 shadow-md flex items-center justify-center">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>`,
  className: 'custom-driver-report',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
});

export const DriverCircuitMap = ({ routes = [], reports = [], truck = null, onSelectReport }) => {
  const defaultCenter = [-25.2950, -57.6050];

  // 1. Filtrar GeoJSON Vectorial EXCLUSIVAMENTE para los barrios asignados al chofer
  const scopedGeoJSON = useMemo(() => {
    if (!routes || routes.length === 0) return null;

    const assignedNamesSet = new Set(
      routes.map(r => normalizeText(r.name || r.zone))
    );

    const matchingFeatures = (BARRIOS_ASUNCION_GEOJSON.features || []).filter(f => {
      const fName = normalizeText(f.properties?.name || f.properties?.barrio);
      return assignedNamesSet.has(fName);
    });

    if (matchingFeatures.length === 0) return null;

    return {
      type: 'FeatureCollection',
      features: matchingFeatures
    };
  }, [routes]);

  // 2. Calcular límites espaciales (Bounds) del circuito acotado
  const circuitBounds = useMemo(() => {
    if (!scopedGeoJSON || scopedGeoJSON.features.length === 0) return null;
    try {
      const layer = L.geoJSON(scopedGeoJSON);
      return layer.getBounds();
    } catch (e) {
      return null;
    }
  }, [scopedGeoJSON]);

  // 3. Estilo visual de los polígonos asignados para cabina oscura
  const getFeatureStyle = () => {
    return {
      fillColor: '#334155',
      fillOpacity: 0.45,
      weight: 2,
      color: '#94a3b8',
      dashArray: '4',
      lineCap: 'square',
      lineJoin: 'miter'
    };
  };

  const onEachFeature = (feature, layer) => {
    const barrioName = feature.properties?.name || feature.properties?.barrio || 'Barrio Asignado';
    layer.bindTooltip(`
      <div class="px-2 py-1 font-mono text-xs">
        <strong class="block font-bold">${barrioName}</strong>
        <span class="text-[10px] text-[#64748b]">Circuito Oficial Asignado</span>
      </div>
    `, { sticky: true, className: 'barrio-map-label' });
  };

  const firstRoute = routes[0];
  const shiftName = firstRoute?.shift || 'Mañana';
  const scheduleDaysStr = Array.isArray(firstRoute?.schedule_days)
    ? firstRoute.schedule_days.join(', ')
    : (firstRoute?.schedule_days || 'L-M-V');

  const truckLat = truck?.current_lat ?? truck?.lat ?? -25.2930;
  const truckLng = truck?.current_lng ?? truck?.lng ?? -57.5810;

  if (!routes || routes.length === 0) {
    return (
      <div className="bg-slate-950 p-6 rounded-sm border border-slate-800 text-center space-y-3 shadow-sm text-slate-100">
        <div className="w-10 h-10 mx-auto rounded-sm bg-slate-900 text-slate-100 flex items-center justify-center border border-slate-700">
          <AlertTriangle className="w-5 h-5 text-red-500" strokeWidth={1.5} />
        </div>
        <h4 className="text-sm font-bold uppercase tracking-tight">Sin Circuito de Barrios Asignado</h4>
        <p className="text-xs text-slate-400 font-light max-w-md mx-auto">
          Tu supervisor aún no ha configurado los barrios correspondientes a tu unidad ({truck?.code || 'Camión'}).
          Una vez asignados, aquí verás tu mapa operativo con los límites barriales y reclamos ciudadanos.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 rounded-sm border border-slate-800 overflow-hidden shadow-sm flex flex-col text-slate-100">
      {/* Cabecera del Mapa Acotado */}
      <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-sm bg-slate-900 text-slate-100 border border-slate-800 flex items-center justify-center">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-tight text-slate-100">Mapa de Circuito Operativo</h3>
              <span className="text-[10px] font-mono bg-slate-900 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-sm">
                {routes.length} {routes.length === 1 ? 'barrio' : 'barrios'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Turno {shiftName} • {scheduleDaysStr}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto text-[10px] font-mono text-slate-100 bg-slate-900 px-2.5 py-1 rounded-sm border border-slate-800">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          <span>{reports.length} Denuncias en sector</span>
        </div>
      </div>

      {/* Contenedor del Mapa Leaflet */}
      <div className="relative w-full h-80 sm:h-96 z-0 bg-[#090d16]">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          zoomControl={true}
        >
          <TileLayer
            key="driver-dark-carto"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

          {/* Polígonos de los barrios asignados */}
          {scopedGeoJSON && (
            <GeoJSON
              key={routes.map(r => r.id).join(',')}
              data={scopedGeoJSON}
              style={getFeatureStyle}
              onEachFeature={onEachFeature}
            />
          )}

          {/* Marcador del camión del chofer */}
          {truck && (
            <Marker position={[truckLat, truckLng]} icon={driverTruckIcon}>
              <Popup className="custom-leaflet-popup">
                <div className="p-1 space-y-1 font-mono text-[#111111] dark:text-slate-100">
                  <p className="font-bold text-xs flex items-center space-x-1">
                    <span>{truck.code}</span>
                    <span className="text-[10px] text-[#666666] dark:text-slate-400">({truck.status})</span>
                  </p>
                  <p className="text-[10px] text-[#666666] dark:text-slate-400">{truck.plate_number || 'S/D'}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Marcadores de denuncias asignadas */}
          {reports.map(rep => {
            if (!rep.latitude || !rep.longitude) return null;
            return (
              <Marker
                key={rep.id}
                position={[rep.latitude, rep.longitude]}
                icon={driverReportIcon}
                eventHandlers={{
                  click: () => onSelectReport && onSelectReport(rep)
                }}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 space-y-1 text-xs font-mono text-[#111111] dark:text-slate-100">
                    <p className="font-bold">{rep.ticket_number || 'Denuncia'}</p>
                    <p className="text-[11px] text-[#666666] dark:text-slate-400 truncate">{rep.description}</p>
                    <button
                      onClick={() => onSelectReport && onSelectReport(rep)}
                      className="w-full mt-1 bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-[#111111] py-1 px-2 text-[10px] font-bold rounded-sm uppercase tracking-wider"
                    >
                      Resolver Denuncia
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Auto-centrado y encuadre a los límites del circuito */}
          <AutoFitBounds bounds={circuitBounds} />
        </MapContainer>
      </div>
    </div>
  );
};

export default DriverCircuitMap;
