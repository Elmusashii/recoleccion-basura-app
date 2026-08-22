import React, { useState, useMemo, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  GeoJSON, 
  Marker, 
  Popup, 
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  Search, 
  Calendar, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  Truck, 
  Info, 
  X, 
  Layers,
  Sparkles,
  CheckCircle2,
  ListFilter,
  Filter
} from 'lucide-react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

import { BARRIOS_ASUNCION_GEOJSON } from '../data/barriosAsuncionGeoJSON';
import { 
  getBarrioSchedule, 
  normalizeBarrioName, 
  OFFICIAL_PALETTE 
} from '../data/barrioScheduleMap';
import { getActiveTrucksForCurrentTime } from '../data/officialRoutes';
import { CitizenKpiBar } from './citizen/CitizenKpiBar';
import { ReportsListDrawer } from './citizen/ReportsListDrawer';
import MarkerClusterGroup from 'react-leaflet-cluster';

// Corrección de íconos por defecto de Leaflet en Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Ícono animado para camiones recolectores
const truckIcon = new L.DivIcon({
  html: `<div class="relative flex items-center justify-center">
          <div class="absolute w-7 h-7 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
          <div class="relative bg-emerald-600 text-white p-1.5 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
          </div>
        </div>`,
  className: 'custom-truck-marker',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Ícono para denuncias ciudadanas individuales
const reportIcon = new L.DivIcon({
  html: `<div class="bg-rose-600 text-white p-1.5 rounded-full shadow-lg border-2 border-white flex items-center justify-center animate-pulse">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>`,
  className: 'custom-report-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Creador de íconos personalizados para clusters de denuncias según cantidad
const createReportClusterCustomIcon = (cluster) => {
  const count = cluster.getChildCount();
  
  let sizeClass = 'w-7 h-7 text-[11px]';
  let colorClass = 'bg-rose-500 text-white shadow-md border-2 border-white';
  let iconSize = [28, 28];
  let pulseHtml = '';

  if (count >= 10) {
    sizeClass = 'w-9 h-9 text-xs font-black';
    colorClass = 'bg-rose-700 text-white shadow-xl border-2 border-white ring-2 ring-rose-400/70';
    iconSize = [36, 36];
    pulseHtml = '<span class="absolute inset-0 rounded-full bg-rose-600 animate-ping opacity-50"></span>';
  } else if (count >= 5) {
    sizeClass = 'w-8 h-8 text-xs font-extrabold';
    colorClass = 'bg-rose-600 text-white shadow-lg border-2 border-white';
    iconSize = [32, 32];
  }

  return L.divIcon({
    html: `<div class="relative flex items-center justify-center">
            ${pulseHtml}
            <div class="${colorClass} ${sizeClass} rounded-full flex items-center justify-center font-mono font-bold tracking-tight">
              ${count}
            </div>
          </div>`,
    className: 'custom-report-cluster-marker',
    iconSize: iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1] / 2]
  });
};

// Componente para animar y centrar el mapa suavemente, y abrir popup del target tras el vuelo
function MapController({ targetCenter, targetZoom, targetReportId, markerRefs, onPopupOpened }) {
  const map = useMap();
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (targetCenter) {
      map.flyTo(targetCenter, targetZoom || 14, { duration: 1.2 });
    }
  }, [targetCenter, targetZoom, map]);

  React.useEffect(() => {
    if (!targetReportId) return;

    const handleMoveEnd = () => {
      const marker = markerRefs?.current?.[targetReportId];
      if (marker) {
        marker.openPopup();
      }
      if (onPopupOpened) {
        onPopupOpened();
      }
    };

    map.once('moveend', handleMoveEnd);

    // Fallback de temporizador si la cámara ya estaba cerca de la coordenada
    const timer = setTimeout(() => {
      const marker = markerRefs?.current?.[targetReportId];
      if (marker) {
        marker.openPopup();
      }
      if (onPopupOpened) {
        onPopupOpened();
      }
    }, 1300);

    return () => {
      map.off('moveend', handleMoveEnd);
      clearTimeout(timer);
    };
  }, [targetReportId, map, markerRefs, onPopupOpened]);

  return null;
}

/**
 * Calcula dinámicamente el próximo turno de recolección en base al horario y día actual
 */
function calculateNextCollection(schedule) {
  if (!schedule || !schedule.group || schedule.group === 'NO_ASIGNADO') {
    return {
      isToday: false,
      text: 'Consultar horario con cuadrilla municipal'
    };
  }

  const groupDaysMap = {
    'LUNES_MIERCOLES_VIERNES': [1, 3, 5],
    'MARTES_JUEVES_SABADO': [2, 4, 6]
  };

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const validDays = groupDaysMap[schedule.group] || [1, 2, 3, 4, 5, 6];

  // Parsear horas del turno (ej: "06:00 a 12:00 hs", "12:00 a 18:00 hs", "19:00 a 02:00 hs")
  const timeRegex = /(\d{1,2}):(\d{2})\s*a\s*(\d{1,2}):(\d{2})/;
  const match = (schedule.shiftHours || '').match(timeRegex);

  let startH = 6, startM = 0, endH = 12, endM = 0;
  if (match) {
    startH = parseInt(match[1], 10);
    startM = parseInt(match[2], 10);
    endH = parseInt(match[3], 10);
    endM = parseInt(match[4], 10);
  } else if (schedule.shift === 'Tarde') {
    startH = 12; endH = 18;
  } else if (schedule.shift === 'Noche') {
    startH = 19; endH = 2;
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0: Dom, 1: Lun, 2: Mar, 3: Mié, 4: Jue, 5: Vie, 6: Sáb
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const isToday = validDays.includes(currentDay);
  const startMinutes = startH * 60 + startM;
  const isOvernight = endH < startH;
  const endMinutes = isOvernight ? (endH + 24) * 60 + endM : endH * 60 + endM;

  const formattedHours = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')} a ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')} hs`;

  // 1. Si hoy es día de recolección y aún no ha finalizado el turno
  if (isToday) {
    if (!isOvernight && currentMinutes < endMinutes) {
      return {
        isToday: true,
        text: `🟢 Hoy, de ${formattedHours}`
      };
    }
    if (isOvernight) {
      return {
        isToday: true,
        text: `🟢 Hoy, de ${formattedHours}`
      };
    }
  }

  // 2. Si hoy ya pasó o no correspondía hoy, buscar el próximo día de servicio
  let daysToAdd = 1;
  let nextDayIndex = (currentDay + 1) % 7;
  while (!validDays.includes(nextDayIndex) && daysToAdd < 7) {
    daysToAdd++;
    nextDayIndex = (nextDayIndex + 1) % 7;
  }

  const nextDayName = dayNames[nextDayIndex];
  return {
    isToday: false,
    text: `📅 Próxima: ${nextDayName}, de ${formattedHours}`
  };
}

/**
 * Componente Principal de Mapa Interactivo con Capa Vectorial GeoJSON
 *
 * @param {Object} props
 * @param {Object} [props.geojsonData] - FeatureCollection GeoJSON
 * @param {Array}  [props.reports] - Lista de denuncias geolocalizadas
 * @param {Array}  [props.trucks] - Lista de camiones en ruta
 * @param {Function} [props.onOpenReportModal] - Callback para abrir modal de denuncias
 * @param {Function} [props.onSelectBarrio] - Callback al seleccionar un barrio
 */
export const InteractiveMap = ({
  geojsonData = BARRIOS_ASUNCION_GEOJSON,
  reports = [],
  trucks = getActiveTrucksForCurrentTime(),
  onOpenReportModal,
  onSelectBarrio
}) => {
  const defaultCenter = [-25.2950, -57.6050];
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(13);

  // Estados de Filtros Reactivos
  const [scheduleFilter, setScheduleFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Capas y Selección
  const [showReports, setShowReports] = useState(true);
  const [showTrucks, setShowTrucks] = useState(true);
  const [selectedBarrio, setSelectedBarrio] = useState(null);

  // Drawer de Denuncias y Navegación a Puntos
  const [reportsDrawerOpen, setReportsDrawerOpen] = useState(false);
  const [targetReportId, setTargetReportId] = useState(null);
  const markerRefs = useRef({});
  const geoJsonRef = useRef(null);

  // Conteo de denuncias activas
  const activeReportsCount = useMemo(() => {
    return (reports || []).filter(r => r && r.status !== 'RESUELTO' && r.status !== 'RECHAZADO').length;
  }, [reports]);

  // Handler para volar a la denuncia seleccionada en la lista y abrir su popup
  const handleSelectReport = (report) => {
    if (!report || report.latitude === undefined || report.longitude === undefined) return;
    setShowReports(true);
    setMapCenter([report.latitude, report.longitude]);
    setMapZoom(18); // Zoom alto para disolver clusters cercanos y mostrar el pin
    setTargetReportId(report.id);

    // En dispositivos móviles cerramos el drawer automáticamente para despejar la vista
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setReportsDrawerOpen(false);
    }
  };

  // 1. Cruce de Datos (Join Barrial) y Estilizado Condicional
  const getFeatureStyle = (feature) => {
    const schedule = getBarrioSchedule(feature?.properties);
    const turno = schedule.shift || 'Sin Turno';
    const scheduleCode = schedule.group || 'NO_ASIGNADO';

    let isMatched = true;

    if (scheduleFilter !== 'ALL' && scheduleCode !== scheduleFilter) {
      isMatched = false;
    }

    if (shiftFilter !== 'ALL' && turno !== shiftFilter) {
      isMatched = false;
    }

    if (searchQuery.trim()) {
      const q = normalizeBarrioName(searchQuery);
      const targetName = normalizeBarrioName(schedule.name || '');
      const targetStreets = normalizeBarrioName(schedule.mainStreets || '');
      const targetZone = normalizeBarrioName(schedule.zone || '');
      if (!targetName.includes(q) && !targetStreets.includes(q) && !targetZone.includes(q)) {
        isMatched = false;
      }
    }

    // Paleta oficial solicitada
    let fillColor = OFFICIAL_PALETTE.NEUTRO;
    if (isMatched) {
      if (turno === 'Mañana') {
        fillColor = OFFICIAL_PALETTE.MANANA; // #4ade80
      } else if (turno === 'Tarde') {
        fillColor = OFFICIAL_PALETTE.TARDE;  // #f97316
      } else if (turno === 'Noche') {
        fillColor = OFFICIAL_PALETTE.NOCHE;  // #475569
      }
    }

    const isSelected = selectedBarrio?.name === schedule.name;
    const isApprox = Boolean(feature?.properties?.approx);

    return {
      color: isSelected ? '#0f172a' : isMatched ? OFFICIAL_PALETTE.BORDER_SOLID : OFFICIAL_PALETTE.BORDER_NEUTRO,
      weight: isSelected ? 3 : 1.5,
      opacity: 1,
      dashArray: isApprox ? '4, 4' : '',
      fillColor: fillColor,
      fillOpacity: isSelected ? 0.85 : isMatched ? 0.65 : 0.20
    };
  };

  // 2. Manejador de Eventos, Tooltips Centrados y Selección con Geometría
  const onEachFeature = (feature, layer) => {
    const schedule = getBarrioSchedule(feature?.properties);
    const barrioDisplayName = schedule.name || feature?.properties?.name || feature?.properties?.BARRIO || 'Barrio';

    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({
          color: '#0f172a',
          weight: 3,
          fillOpacity: 0.85
        });
      },
      mouseout: (e) => {
        if (geoJsonRef.current) {
          geoJsonRef.current.resetStyle(e.target);
        }
      },
      click: (e) => {
        // Prevenir que el clic en un marcador, cluster o popup dispare la selección y re-centrado del barrio
        if (e.originalEvent) {
          const targetEl = e.originalEvent.target;
          if (
            targetEl &&
            (targetEl.closest?.('.leaflet-marker-icon') ||
             targetEl.closest?.('.leaflet-popup') ||
             targetEl.closest?.('.custom-report-marker') ||
             targetEl.closest?.('.custom-report-cluster-marker') ||
             targetEl.closest?.('.custom-truck-marker'))
          ) {
            return;
          }
        }

        // FEATURE 1: Guardar también la geometría para cálculo de punto-en-polígono
        const enrichedBarrio = {
          ...schedule,
          geometry: feature.geometry,
          approx: feature.properties?.approx
        };
        setSelectedBarrio(enrichedBarrio);
        if (onSelectBarrio) onSelectBarrio(enrichedBarrio);
        if (e.latlng) {
          setMapCenter([e.latlng.lat, e.latlng.lng]);
          setMapZoom(14); // Reset explícito al nivel de zoom normal de visualización de barrio
        }
      }
    });

    layer.bindTooltip(barrioDisplayName, {
      permanent: false,
      direction: 'center',
      className: 'barrio-map-label'
    });
  };

  // 3. Cálculo de Punto-en-Polígono con Turf.js para Camión en Zona
  const hasTruckInSelectedBarrio = useMemo(() => {
    if (!selectedBarrio || !selectedBarrio.geometry || !trucks || trucks.length === 0) {
      return false;
    }

    try {
      for (const t of trucks) {
        const lat = t.lat ?? t.current_lat;
        const lng = t.lng ?? t.current_lng;
        if (lat !== undefined && lng !== undefined) {
          // Turf usa coordenadas [longitud, latitud]
          const pt = point([lng, lat]);
          if (booleanPointInPolygon(pt, selectedBarrio.geometry)) {
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('Error en turf booleanPointInPolygon:', e);
    }
    return false;
  }, [selectedBarrio, trucks]);

  // 4. Cálculo de Próxima Recolección
  const nextCollection = useMemo(() => {
    if (!selectedBarrio) return null;
    return calculateNextCollection(selectedBarrio);
  }, [selectedBarrio]);

  // Ordenar features para que los aproximados (approx: true) se rendericen PRIMERO (abajo en SVG)
  // y los polígonos reales de OSM (approx: false) se rendericen DESPUÉS (arriba, evitando oclusión)
  const orderedGeojsonData = useMemo(() => {
    if (!geojsonData?.features) return geojsonData;
    return {
      ...geojsonData,
      features: [...geojsonData.features].sort((a, b) => {
        const aApprox = a.properties?.approx ? 1 : 0;
        const bApprox = b.properties?.approx ? 1 : 0;
        return bApprox - aApprox; // approx primero (abajo), reales después (arriba)
      })
    };
  }, [geojsonData]);

  const geoJsonKey = useMemo(() => {
    return `geojson-${scheduleFilter}-${shiftFilter}-${searchQuery}-${selectedBarrio?.name || 'none'}`;
  }, [scheduleFilter, shiftFilter, searchQuery, selectedBarrio]);

  const matchedBarriosCount = useMemo(() => {
    return (orderedGeojsonData.features || []).filter(f => {
      const schedule = getBarrioSchedule(f.properties);
      if (scheduleFilter !== 'ALL' && schedule.group !== scheduleFilter) return false;
      if (shiftFilter !== 'ALL' && schedule.shift !== shiftFilter) return false;
      if (searchQuery.trim()) {
        const q = normalizeBarrioName(searchQuery);
        const targetName = normalizeBarrioName(schedule.name || '');
        const targetStreets = normalizeBarrioName(schedule.mainStreets || '');
        if (!targetName.includes(q) && !targetStreets.includes(q)) return false;
      }
      return true;
    }).length;
  }, [orderedGeojsonData, scheduleFilter, shiftFilter, searchQuery]);

  return (
    <div className="relative w-full h-full min-h-0 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl bg-slate-950 flex flex-col font-sans">
      
      {/* ========================================================================= */}
      {/* BARRA SUPERIOR DE CONTROL, FILTROS Y KPIS REALES */}
      {/* ========================================================================= */}
      <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 md:top-4 md:left-4 md:right-4 z-[1000] flex flex-col gap-1.5 sm:gap-2 md:gap-2.5 pointer-events-none max-w-full">
        
        {/* Fila 1: CitizenKpiBar (Deslizable en mobile, 2x2 en tablet/laptop, 1x4 en desktop XL) */}
        <div className="w-full pointer-events-auto">
          <CitizenKpiBar
            reports={reports}
            trucks={trucks}
            matchedBarrios={matchedBarriosCount}
            totalBarrios={orderedGeojsonData.features?.length || 68}
          />
        </div>

        {/* Fila 2: Barra de Acciones y Filtros (Compacta en mobile, 2 filas en tablet/laptop, 1 fila en desktop XL) */}
        <div className="flex flex-row md:flex-col 2xl:flex-row md:items-start 2xl:items-center justify-between gap-1.5 sm:gap-2 md:gap-2.5 w-full">
          
          {/* Lado Izquierdo: Buscador + Filtros Desktop / Botón Filtros Mobile */}
          <div className="glass-panel p-1 sm:p-2 rounded-xl sm:rounded-2xl shadow-xl border border-slate-700/60 bg-slate-900/90 backdrop-blur-md pointer-events-auto flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial self-start max-w-full overflow-hidden">
            {/* Buscador de Barrio */}
            <div className="relative flex-1 sm:w-48 md:w-56 lg:w-60">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar barrio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/90 text-slate-100 text-[11px] sm:text-xs rounded-lg sm:rounded-xl pl-8 sm:pl-9 pr-6 sm:pr-8 py-1.5 sm:py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>

            {/* Selectores visibles en Desktop/Tablet (md:) */}
            <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
              {/* Selector: Filtrar por Cronograma */}
              <div className="relative">
                <select
                  value={scheduleFilter}
                  onChange={(e) => setScheduleFilter(e.target.value)}
                  className="bg-slate-800/90 text-slate-200 text-xs rounded-xl px-2.5 lg:px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium appearance-none pr-7 lg:pr-8 cursor-pointer"
                >
                  <option value="ALL">📅 Todos los Cronogramas</option>
                  <option value="LUNES_MIERCOLES_VIERNES">🟢 Lunes, Miércoles y Viernes</option>
                  <option value="MARTES_JUEVES_SABADO">🔴 Martes, Jueves y Sábado</option>
                </select>
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Selector: Filtrar por Turno */}
              <div className="relative">
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="bg-slate-800/90 text-slate-200 text-xs rounded-xl px-2.5 lg:px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium appearance-none pr-7 lg:pr-8 cursor-pointer"
                >
                  <option value="ALL">⏰ Todos los Turnos</option>
                  <option value="Mañana">🌅 Turno Mañana (06:00 - 12:00)</option>
                  <option value="Tarde">☀️ Turno Tarde (12:00 - 18:00)</option>
                  <option value="Noche">🌙 Turno Noche (19:00 - 02:00)</option>
                </select>
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Botón de Filtro Compacto en Mobile (< md) */}
            <div className="md:hidden relative">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((prev) => !prev)}
                className={`p-1.5 rounded-lg border transition flex items-center space-x-1 ${
                  mobileFiltersOpen || (scheduleFilter !== 'ALL' || shiftFilter !== 'ALL')
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Filtrar por cronograma y turno"
              >
                <Filter className="w-3.5 h-3.5" />
                {(scheduleFilter !== 'ALL' || shiftFilter !== 'ALL') && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Lado Derecho: Toggles de Capas y Botones de Acción */}
          <div className="glass-panel p-1 sm:px-3 sm:py-2 md:px-3.5 md:py-2 rounded-xl sm:rounded-2xl shadow-xl border border-slate-700/60 bg-slate-900/90 backdrop-blur-md pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 md:gap-3 text-xs shrink-0 self-start">
            
            {/* Toggles en Desktop/Tablet (md:) */}
            <div className="hidden md:flex items-center space-x-2.5 lg:space-x-3">
              {trucks.length > 0 && (
                <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showTrucks}
                    onChange={(e) => setShowTrucks(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-medium">Camiones ({trucks.length})</span>
                </label>
              )}

              {reports.length > 0 && (
                <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showReports}
                    onChange={(e) => setShowReports(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-medium">Denuncias ({reports.length})</span>
                </label>
              )}
            </div>

            {/* Toggles Compactos en Mobile (< md) */}
            <div className="flex md:hidden items-center space-x-1">
              {trucks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTrucks((prev) => !prev)}
                  className={`p-1.5 rounded-lg border transition flex items-center space-x-1 text-[11px] font-mono font-bold ${
                    showTrucks
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-xs'
                      : 'bg-slate-800/80 text-slate-500 border-slate-700/60 opacity-60'
                  }`}
                  title="Activar/desactivar capa de camiones"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>{trucks.length}</span>
                </button>
              )}

              {reports.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowReports((prev) => !prev)}
                  className={`p-1.5 rounded-lg border transition flex items-center space-x-1 text-[11px] font-mono font-bold ${
                    showReports
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-xs'
                      : 'bg-slate-800/80 text-slate-500 border-slate-700/60 opacity-60'
                  }`}
                  title="Activar/desactivar capa de denuncias"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{reports.length}</span>
                </button>
              )}
            </div>

            {/* Botón para abrir/cerrar el Drawer de Denuncias */}
            {activeReportsCount > 0 && (
              <button
                type="button"
                onClick={() => setReportsDrawerOpen((prev) => !prev)}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl font-bold transition flex items-center space-x-1 sm:space-x-1.5 text-xs ${
                  reportsDrawerOpen
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                title="Ver lista de denuncias activas"
              >
                <ListFilter className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Ver Denuncias</span>
                <span className="bg-rose-500/20 text-rose-300 px-1 sm:px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold border border-rose-500/30">
                  {activeReportsCount}
                </span>
              </button>
            )}

            {/* Botón de Acción: Nueva Denuncia */}
            {onOpenReportModal && (
              <button
                onClick={() => onOpenReportModal(selectedBarrio)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-xl shadow-md transition flex items-center space-x-1 sm:space-x-1.5 text-[11px] sm:text-xs shrink-0"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nueva Denuncia</span>
                <span className="inline sm:hidden">Denunciar</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal / Bottom Sheet Desplegable de Filtros en Mobile */}
        {mobileFiltersOpen && (
          <div className="md:hidden glass-panel p-3 rounded-2xl shadow-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-lg pointer-events-auto space-y-2.5 animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                <span>Filtros de Cronograma y Turno</span>
              </span>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Cronograma de Días
                </label>
                <select
                  value={scheduleFilter}
                  onChange={(e) => setScheduleFilter(e.target.value)}
                  className="w-full bg-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="ALL">📅 Todos los Cronogramas</option>
                  <option value="LUNES_MIERCOLES_VIERNES">🟢 Lunes, Miércoles y Viernes</option>
                  <option value="MARTES_JUEVES_SABADO">🔴 Martes, Jueves y Sábado</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Turno Horario
                </label>
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="w-full bg-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="ALL">⏰ Todos los Turnos</option>
                  <option value="Mañana">🌅 Turno Mañana (06:00 - 12:00)</option>
                  <option value="Tarde">☀️ Turno Tarde (12:00 - 18:00)</option>
                  <option value="Noche">🌙 Turno Noche (19:00 - 02:00)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {(scheduleFilter !== 'ALL' || shiftFilter !== 'ALL') ? (
                <button
                  onClick={() => {
                    setScheduleFilter('ALL');
                    setShiftFilter('ALL');
                  }}
                  className="text-[11px] text-rose-400 hover:underline font-medium"
                >
                  Limpiar filtros
                </button>
              ) : <div />}
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs"
              >
                Listo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MAPA INTERACTIVO (LEAFLET + GEOJSON OFICIAL) */}
      {/* ========================================================================= */}
      <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          scrollWheelZoom={true}
          closePopupOnClick={false}
          className="w-full h-full z-0"
        >
          {/* Capa Base de CartoDB Voyager / OpenStreetMap */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          <MapController 
            targetCenter={mapCenter} 
            targetZoom={mapZoom} 
            targetReportId={targetReportId}
            markerRefs={markerRefs}
            onPopupOpened={() => setTargetReportId(null)}
          />

          {/* Capa Vectorial de Polígonos GeoJSON de Asunción con Cruce Dinámico */}
          <GeoJSON
            key={geoJsonKey}
            ref={geoJsonRef}
            data={orderedGeojsonData}
            style={getFeatureStyle}
            onEachFeature={onEachFeature}
          />

          {/* Capa de Camiones en Ruta */}
          {showTrucks && trucks.map((truck) => (
            <Marker
              key={truck.id}
              position={[truck.lat ?? truck.current_lat, truck.lng ?? truck.current_lng]}
              icon={truckIcon}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  if (e.originalEvent) {
                    L.DomEvent.stopPropagation(e.originalEvent);
                  }
                }
              }}
            >
              <Popup>
                <div className="p-2 space-y-2 text-slate-800 font-sans text-xs min-w-[210px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Unidad</span>
                        <span className="font-extrabold text-sm text-slate-900">{truck.code || truck.plate || 'Camión'}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {truck.status || 'EN_RUTA'}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                      <span className="text-slate-500 font-medium">Chofer:</span>
                      <span className="font-bold text-slate-900">{truck.driver || 'Personal Municipal'}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                      <span className="text-slate-500 font-medium">Barrio:</span>
                      <span className="font-bold text-slate-900">{truck.barrio || 'En ruta'}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Capa de Denuncias Ciudadanas Agrupadas con Clustering (Solo Activas) */}
          {showReports && (
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={50}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
              spiderfyDistanceMultiplier={1.5}
              iconCreateFunction={createReportClusterCustomIcon}
            >
              {(reports || [])
                .filter(rep => rep && rep.status !== 'RESUELTO' && rep.status !== 'RECHAZADO')
                .map((rep) => (
                <Marker
                  key={rep.id}
                  ref={(el) => {
                    if (el) {
                      markerRefs.current[rep.id] = el;
                    } else {
                      delete markerRefs.current[rep.id];
                    }
                  }}
                  position={[rep.latitude, rep.longitude]}
                  icon={reportIcon}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e);
                      if (e.originalEvent) {
                        L.DomEvent.stopPropagation(e.originalEvent);
                      }
                    }
                  }}
                >
                  <Popup autoPan={false} closeOnClick={false}>
                    <div className="p-2 space-y-2.5 text-slate-800 font-sans text-xs max-w-xs min-w-[240px]">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-mono text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-bold text-[11px]">
                            {rep.ticket_number || 'DEN-ASU'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                          {rep.status}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 capitalize">
                          {rep.category?.replace(/_/g, ' ') || 'Denuncia Ciudadana'}
                        </h4>
                        <p className="text-slate-700 text-xs mt-1 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {rep.description}
                        </p>
                      </div>

                      {rep.address_reference && (
                        <div className="flex items-start space-x-1.5 text-[11px] text-slate-600 bg-slate-100/70 p-1.5 rounded-md">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span><strong>Ref:</strong> {rep.address_reference}</span>
                        </div>
                      )}

                      {rep.photo_urls && rep.photo_urls.length > 0 && (
                        <div className="pt-1">
                          <a 
                            href={rep.photo_urls[0]} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="block group relative overflow-hidden rounded-lg border border-slate-200 shadow-sm"
                          >
                            <img 
                              src={rep.photo_urls[0]} 
                              alt="Evidencia fotográfica" 
                              className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                              <span className="text-white text-[10px] font-bold">🔍 Clic para abrir foto</span>
                            </div>
                          </a>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          )}
        </MapContainer>
      </div>

      {/* ========================================================================= */}
      {/* LEYENDA OFICIAL FLOTANTE */}
      {/* ========================================================================= */}
      <div className="absolute bottom-6 left-6 z-[1000] hidden sm:block">
        <div className="glass-panel p-3.5 rounded-2xl shadow-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-md space-y-2 text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-bold text-slate-200 text-xs flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Turnos Oficiales de Recolección</span>
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-2 pt-1">
            <div className="flex items-center space-x-2.5">
              <span className="w-3.5 h-3.5 rounded-md border border-white/50 shadow" style={{ backgroundColor: OFFICIAL_PALETTE.MANANA }} />
              <div>
                <p className="font-bold text-emerald-400 text-[11px]">Turno Mañana</p>
                <p className="text-[10px] text-slate-400">06:00 a 12:00 hs (#4ade80)</p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <span className="w-3.5 h-3.5 rounded-md border border-white/50 shadow" style={{ backgroundColor: OFFICIAL_PALETTE.TARDE }} />
              <div>
                <p className="font-bold text-orange-400 text-[11px]">Turno Tarde</p>
                <p className="text-[10px] text-slate-400">12:00 a 18:00 hs (#f97316)</p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <span className="w-3.5 h-3.5 rounded-md border border-white/50 shadow" style={{ backgroundColor: OFFICIAL_PALETTE.NOCHE }} />
              <div>
                <p className="font-bold text-slate-300 text-[11px]">Turno Noche</p>
                <p className="text-[10px] text-slate-400">19:00 a 02:00 hs (#475569)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE 1: TARJETA FLOTANTE "MI BARRIO" ENRIQUECIDA */}
      {/* ========================================================================= */}
      {selectedBarrio && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-[1000] animate-fade-in">
          <div className="glass-panel p-3 sm:p-4 rounded-2xl shadow-2xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-md space-y-2.5 sm:space-y-3">
            
            {/* Cabecera: Nombre y Zona */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                  {selectedBarrio.zone || 'Asunción'}
                </span>
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <span>{selectedBarrio.name}</span>
                  {selectedBarrio.approx && (
                    <span className="text-[9px] font-normal text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded-md">
                      Aproximado
                    </span>
                  )}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedBarrio(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              
              {/* Badge Dinámico: Camión en tu zona ahora (Turf.js) */}
              {hasTruckInSelectedBarrio && (
                <div className="flex items-center space-x-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-2 rounded-xl text-xs font-bold shadow-md">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span>🟢 Camión en tu zona ahora</span>
                </div>
              )}

              {/* Turno y Horario de Recolección */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-slate-400">Turno habitual:</span>
                <span 
                  className="px-2.5 py-0.5 rounded-full font-bold text-white text-[11px]"
                  style={{
                    backgroundColor: selectedBarrio.shift === 'Mañana' 
                      ? OFFICIAL_PALETTE.MANANA 
                      : selectedBarrio.shift === 'Tarde' 
                      ? OFFICIAL_PALETTE.TARDE 
                      : OFFICIAL_PALETTE.NOCHE
                  }}
                >
                  {selectedBarrio.shift} ({selectedBarrio.shiftHours})
                </span>
              </div>

              {/* Días de Servicio */}
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-0.5">
                <p className="text-slate-400 font-semibold text-[11px]">📅 Días de Servicio:</p>
                <p className="text-slate-200 font-bold">{selectedBarrio.groupLabel}</p>
              </div>

              {/* Próxima Recolección Calculada */}
              {nextCollection && (
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs space-y-0.5">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Próxima recolección</p>
                  <p className={`font-bold text-xs ${nextCollection.isToday ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {nextCollection.text}
                  </p>
                </div>
              )}

              {/* Calles Principales de Referencia */}
              {selectedBarrio.mainStreets && (
                <div className="text-[11px] text-slate-300 bg-slate-800/40 p-2 rounded-xl border border-slate-800">
                  <strong>Calles principales:</strong> {selectedBarrio.mainStreets}
                </div>
              )}
            </div>

            {/* Botón de Acción Directa: Reportar Basura */}
            {onOpenReportModal && (
              <button
                onClick={() => onOpenReportModal(selectedBarrio)}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-xl text-xs transition shadow-lg flex items-center justify-center space-x-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Reportar Basura en {selectedBarrio.name}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 3: DRAWER LATERAL DESPLEGABLE DE DENUNCIAS ACTIVAS */}
      {/* ========================================================================= */}
      <ReportsListDrawer
        reports={reports}
        onSelectReport={handleSelectReport}
        isOpen={reportsDrawerOpen}
        onToggle={() => setReportsDrawerOpen((prev) => !prev)}
      />
    </div>
  );
};

export default InteractiveMap;
