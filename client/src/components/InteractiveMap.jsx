import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  Polyline,
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
import { FleetAPI } from '../services/api';

// Corrección de íconos por defecto de Leaflet en Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Ícono para camiones recolectores (Monochrome)
const truckIcon = new L.DivIcon({
  html: `<div class="relative flex items-center justify-center">
          <div class="bg-[#111111] text-[#ffffff] p-1.5 rounded-sm shadow-sm border border-[#ffffff] flex items-center justify-center">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
          </div>
        </div>`,
  className: 'custom-truck-marker',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Ícono para denuncias ciudadanas individuales (Rojo Alerta)
const reportIcon = L.divIcon({
  className: 'custom-report-marker',
  html: `
    <div class="w-7 h-7 bg-red-600 text-white rounded-sm border-2 border-white shadow-md flex items-center justify-center">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
});

// Creador de íconos personalizados para clusters de denuncias (Rojo Alerta)
const createReportClusterCustomIcon = (cluster) => {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<div class="relative flex items-center justify-center">
            <div class="bg-red-600 text-white border-2 border-white w-7 h-7 rounded-sm shadow-md flex items-center justify-center font-mono font-bold text-xs">
              ${count}
            </div>
          </div>`,
    className: 'custom-report-cluster-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
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
 * Retorna el color sobrio correspondiente al turno oficial de recolección
 * @param {string} turno
 * @returns {string} color hex
 */
export function getTurnoColor(turno) {
  const t = (turno || '').toLowerCase();
  if (t.includes('mañana') || t.includes('manana')) {
    return '#22c55e'; // Verde natural sobrio (Turno Mañana)
  }
  if (t.includes('tarde')) {
    return '#f97316'; // Naranja templado (Turno Tarde)
  }
  if (t.includes('noche')) {
    return '#475569'; // Pizarra / Slate neutro (Turno Noche)
  }
  return '#94a3b8';   // Neutro / Sin turno definido
}

/**
 * InteractiveMap - Componente Cartográfico Vectorial Oficial de Asunción
 * Renderiza los 68 barrios con geometrías reales GeoJSON y visualización de camiones y denuncias
 *
 * @param {Object}   [props.geojsonData] - Colección GeoJSON de polígonos
 * @param {Array}    [props.reports] - Lista de denuncias activas
 * @param {Array}    [props.trucks] - Lista de camiones en ruta
 * @param {Function} [props.onOpenReportModal] - Callback para abrir modal de denuncias
 * @param {Function} [props.onSelectBarrio] - Callback al seleccionar un barrio
 */
export const InteractiveMap = ({
  geojsonData = BARRIOS_ASUNCION_GEOJSON,
  reports = [],
  trucks = null,
  onOpenReportModal,
  onSelectBarrio,
  darkMode
}) => {
  const isDark = typeof darkMode === 'boolean'
    ? darkMode
    : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  // Capa Base Invertida: CARTO Light para Modo Oscuro / CARTO Dark para Modo Claro
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
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

  // Estabilidad de Lista de Camiones
  const defaultTrucks = useMemo(() => getActiveTrucksForCurrentTime(), []);
  const effectiveTrucks = useMemo(() => {
    return (trucks && Array.isArray(trucks) && trucks.length > 0) ? trucks : defaultTrucks;
  }, [trucks, defaultTrucks]);

  // Firma estricta de IDs de camiones para evitar ejecuciones espurias del effect
  const trucksSignature = useMemo(() => {
    return (effectiveTrucks || [])
      .map(t => t.id || t.code)
      .filter(Boolean)
      .sort()
      .join(',');
  }, [effectiveTrucks]);

  // Rutas GeoJSON de Camiones (OpenRouteService)
  const [truckRoutes, setTruckRoutes] = useState({});
  const routesCacheRef = useRef(new Map());

  // Efecto para consultar las rutas de los camiones visibles (con cache TTL 5 min para éxitos y 404s)
  useEffect(() => {
    if (!showTrucks || !effectiveTrucks || effectiveTrucks.length === 0) return;

    let isMounted = true;
    const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutos de TTL

    const fetchAllTruckRoutes = async () => {
      const now = Date.now();
      let newRoutesMap = {};

      await Promise.allSettled(
        effectiveTrucks.map(async (truck) => {
          const truckId = truck.id || truck.code;
          if (!truckId) return;

          const cached = routesCacheRef.current.get(truckId);
          // Si está en cache (éxito o 404/nulo) dentro del TTL de 5 minutos, no reconsultar
          if (cached && (now - cached.timestamp < CACHE_EXPIRY_MS)) {
            if (cached.data) {
              newRoutesMap[truckId] = cached.data;
            }
            return;
          }

          try {
            const res = await FleetAPI.getTruckRoute(truckId);
            const resData = res.data?.data;

            if (resData?.route?.geometry?.coordinates) {
              // ORS devuelve [lng, lat], Leaflet Polyline requiere [lat, lng]
              const polylineCoords = resData.route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
              const routePayload = {
                coordinates: polylineCoords,
                color: resData.routeInfo?.color_hex || '#0284c7',
                distanceKm: resData.route.distanceKm,
                durationMinutes: resData.route.durationMinutes,
                destinationName: resData.destination?.name || resData.routeInfo?.zone || 'Zona Asignada',
                truckCode: resData.truck?.code || truck.code || truckId
              };

              routesCacheRef.current.set(truckId, { data: routePayload, timestamp: Date.now(), isMissing: false });
              newRoutesMap[truckId] = routePayload;
            } else {
              // Camión sin ruta válida: Cachear como nulo para evitar reintentos en bucle
              routesCacheRef.current.set(truckId, { data: null, timestamp: Date.now(), isMissing: true });
            }
          } catch (err) {
            // Manejo silencioso: Cachear también el fallo/404 con TTL para evitar bucle
            routesCacheRef.current.set(truckId, { data: null, timestamp: Date.now(), isMissing: true });
            console.debug(`[InteractiveMap] No se pudo cargar ruta para ${truckId}:`, err.message);
          }
        })
      );

      if (isMounted) {
        setTruckRoutes(prev => ({ ...prev, ...newRoutesMap }));
      }
    };

    fetchAllTruckRoutes();

    // Sincronización periódica cada 5 minutos
    const interval = setInterval(fetchAllTruckRoutes, CACHE_EXPIRY_MS);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [showTrucks, trucksSignature]);

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

  // 1. Cruce de Datos (Join Barrial) y Estilizado Condicional por Turno Oficial
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

    const turnoColor = getTurnoColor(turno);
    const fillColor = isMatched ? turnoColor : '#94a3b8';
    const fillOpacity = isMatched ? 0.55 : 0.15;

    const isSelected = selectedBarrio?.name === schedule.name;
    const isApprox = Boolean(feature?.properties?.approx);

    return {
      color: isSelected ? '#0f172a' : '#ffffff',
      weight: isSelected ? 2.5 : 1.5,
      opacity: 1,
      dashArray: isApprox ? '4, 4' : '',
      fillColor: fillColor,
      fillOpacity: isSelected ? 0.75 : fillOpacity
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
          weight: 2.5,
          fillOpacity: 0.75
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
    <div className="relative w-full h-full min-h-0 overflow-hidden rounded-sm border border-[#e5e5e5] dark:border-slate-800 shadow-sm bg-[#fafafa] dark:bg-[#090d16] flex flex-col font-sans">

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

        {/* Fila 2: Barra de Acciones y Filtros */}
        <div className="flex flex-row md:flex-col 2xl:flex-row md:items-start 2xl:items-center justify-between gap-1.5 sm:gap-2 md:gap-2.5 w-full">

          {/* Lado Izquierdo: Buscador + Filtros Desktop / Botón Filtros Mobile */}
          <div className="p-1 sm:p-1.5 rounded-sm shadow-sm border border-[#e5e5e5] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-900 pointer-events-auto flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial self-start max-w-full overflow-hidden">
            {/* Buscador de Barrio */}
            <div className="relative flex-1 sm:w-48 md:w-56 lg:w-60">
              <Search className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar barrio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#ffffff] dark:bg-slate-800 text-[#111111] dark:text-slate-100 text-[11px] sm:text-xs rounded-sm pl-8 sm:pl-9 pr-6 sm:pr-8 py-1.5 border border-[#cccccc] dark:border-slate-700 focus:outline-none focus:border-[#111111] dark:focus:border-slate-500 placeholder:text-[#999999] dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
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
                  className="bg-[#ffffff] dark:bg-slate-800 text-[#111111] dark:text-slate-100 text-xs rounded-sm px-2.5 py-1.5 border border-[#cccccc] dark:border-slate-700 focus:outline-none focus:border-[#111111] dark:focus:border-slate-500 font-mono appearance-none pr-7 cursor-pointer"
                >
                  <option value="ALL">Todos los Cronogramas</option>
                  <option value="LUNES_MIERCOLES_VIERNES">Lunes, Miércoles y Viernes</option>
                  <option value="MARTES_JUEVES_SABADO">Martes, Jueves y Sábado</option>
                </select>
                <Calendar className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Selector: Filtrar por Turno */}
              <div className="relative">
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="bg-[#ffffff] dark:bg-slate-800 text-[#111111] dark:text-slate-100 text-xs rounded-sm px-2.5 py-1.5 border border-[#cccccc] dark:border-slate-700 focus:outline-none focus:border-[#111111] dark:focus:border-slate-500 font-mono appearance-none pr-7 cursor-pointer"
                >
                  <option value="ALL">Todos los Turnos</option>
                  <option value="Mañana">Turno Mañana (06:00 - 12:00)</option>
                  <option value="Tarde">Turno Tarde (12:00 - 18:00)</option>
                  <option value="Noche">Turno Noche (19:00 - 02:00)</option>
                </select>
                <Clock className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Botón de Filtro Compacto en Mobile (< md) */}
            <div className="md:hidden relative">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((prev) => !prev)}
                className={`p-1.5 rounded-sm border transition-colors flex items-center space-x-1 ${mobileFiltersOpen || (scheduleFilter !== 'ALL' || shiftFilter !== 'ALL')
                    ? 'bg-[#111111] dark:bg-slate-800 text-[#ffffff] border-[#111111] dark:border-slate-700'
                    : 'bg-[#ffffff] dark:bg-slate-800 text-[#111111] dark:text-slate-100 border-[#cccccc] dark:border-slate-700 hover:bg-[#f5f5f5] dark:hover:bg-slate-700'
                  }`}
                title="Filtrar por cronograma y turno"
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Lado Derecho: Toggles de Capas y Botones de Acción */}
          <div className="p-1 sm:px-3 sm:py-1.5 rounded-sm shadow-sm border border-[#e5e5e5] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-900 pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 md:gap-3 text-xs shrink-0 self-start text-[#111111] dark:text-slate-100">

            {/* Toggles en Desktop/Tablet (md:) */}
            <div className="hidden md:flex items-center space-x-2.5 lg:space-x-3">
              {trucks.length > 0 && (
                <label className="flex items-center space-x-1.5 cursor-pointer text-[#111111] dark:text-slate-200 font-mono text-[11px]">
                  <input
                    type="checkbox"
                    checked={showTrucks}
                    onChange={(e) => setShowTrucks(e.target.checked)}
                    className="rounded-none border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-200 focus:ring-0 w-3.5 h-3.5 bg-transparent"
                  />
                  <span>Camiones ({trucks.length})</span>
                </label>
              )}

              {reports.length > 0 && (
                <label className="flex items-center space-x-1.5 cursor-pointer text-[#111111] dark:text-slate-200 font-mono text-[11px]">
                  <input
                    type="checkbox"
                    checked={showReports}
                    onChange={(e) => setShowReports(e.target.checked)}
                    className="rounded-none border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-200 focus:ring-0 w-3.5 h-3.5 bg-transparent"
                  />
                  <span>Denuncias ({reports.length})</span>
                </label>
              )}
            </div>

            {/* Toggles Compactos en Mobile (< md) */}
            <div className="flex md:hidden items-center space-x-1 font-mono">
              {trucks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTrucks((prev) => !prev)}
                  className={`p-1.5 rounded-sm border transition-colors flex items-center space-x-1 text-[11px] ${showTrucks
                      ? 'bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-slate-950 border-[#111111] dark:border-slate-100'
                      : 'bg-[#ffffff] dark:bg-slate-800 text-[#666666] dark:text-slate-400 border-[#e5e5e5] dark:border-slate-700'
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
                  className={`p-1.5 rounded-sm border transition-colors flex items-center space-x-1 text-[11px] ${showReports
                      ? 'bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-slate-950 border-[#111111] dark:border-slate-100'
                      : 'bg-[#ffffff] dark:bg-slate-800 text-[#666666] dark:text-slate-400 border-[#e5e5e5] dark:border-slate-700'
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
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-sm font-mono transition-colors flex items-center space-x-1 text-xs ${reportsDrawerOpen
                    ? 'bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-slate-950'
                    : 'bg-[#ffffff] dark:bg-slate-800 hover:bg-[#f5f5f5] dark:hover:bg-slate-700 text-[#111111] dark:text-slate-200 border border-[#cccccc] dark:border-slate-700'
                  }`}
                title="Ver lista de denuncias activas"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Denuncias</span>
                <span className="px-1 py-0.2 rounded-sm text-[10px] bg-[#f5f5f5] dark:bg-slate-900 text-[#111111] dark:text-slate-200 border border-[#e5e5e5] dark:border-slate-700">
                  {activeReportsCount}
                </span>
              </button>
            )}

            {/* Botón de Acción: Nueva Denuncia */}
            {onOpenReportModal && (
              <button
                onClick={() => onOpenReportModal(selectedBarrio)}
                className="bg-red-600 hover:bg-red-700 text-white font-medium text-xs uppercase tracking-wider px-4 py-2 rounded-sm shadow-sm transition-colors flex items-center space-x-1.5 shrink-0 font-mono"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">+ Nueva Denuncia</span>
                <span className="inline sm:hidden">Denunciar</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal / Bottom Sheet Desplegable de Filtros en Mobile */}
        {mobileFiltersOpen && (
          <div className="md:hidden p-3 rounded-sm shadow-sm border border-[#111111] dark:border-slate-700 bg-[#ffffff] dark:bg-slate-950 pointer-events-auto space-y-2.5 animate-fadeIn text-[#111111] dark:text-slate-100">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#e5e5e5] dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100 flex items-center space-x-1.5">
                <Filter className="w-3.5 h-3.5 text-[#111111] dark:text-slate-200" />
                <span>Filtros de Cronograma y Turno</span>
              </span>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 rounded-sm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-mono uppercase text-[#666666] dark:text-slate-400 block mb-1">
                  Cronograma de Días
                </label>
                <select
                  value={scheduleFilter}
                  onChange={(e) => setScheduleFilter(e.target.value)}
                  className="w-full bg-[#ffffff] dark:bg-slate-900 text-[#111111] dark:text-slate-100 text-xs rounded-sm p-2 border border-[#cccccc] dark:border-slate-700 focus:outline-none focus:border-[#111111] dark:focus:border-slate-500 font-mono"
                >
                  <option value="ALL">Todos los Cronogramas</option>
                  <option value="LUNES_MIERCOLES_VIERNES">Lunes, Miércoles y Viernes</option>
                  <option value="MARTES_JUEVES_SABADO">Martes, Jueves y Sábado</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-[#666666] dark:text-slate-400 block mb-1">
                  Turno Horario
                </label>
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="w-full bg-[#ffffff] dark:bg-slate-900 text-[#111111] dark:text-slate-100 text-xs rounded-sm p-2 border border-[#cccccc] dark:border-slate-700 focus:outline-none focus:border-[#111111] dark:focus:border-slate-500 font-mono"
                >
                  <option value="ALL">Todos los Turnos</option>
                  <option value="Mañana">Turno Mañana (06:00 - 12:00)</option>
                  <option value="Tarde">Turno Tarde (12:00 - 18:00)</option>
                  <option value="Noche">Turno Noche (19:00 - 02:00)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#e5e5e5] dark:border-slate-800">
              {(scheduleFilter !== 'ALL' || shiftFilter !== 'ALL') ? (
                <button
                  onClick={() => {
                    setScheduleFilter('ALL');
                    setShiftFilter('ALL');
                  }}
                  className="text-[11px] text-[#666666] dark:text-slate-400 hover:underline font-mono"
                >
                  Limpiar filtros
                </button>
              ) : <div />}
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="bg-[#111111] hover:opacity-80 dark:bg-slate-100 dark:text-slate-950 text-[#fafafa] font-medium px-3 py-1.5 rounded-sm text-xs font-mono uppercase"
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
      <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden bg-[#fafafa]">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          scrollWheelZoom={true}
          closePopupOnClick={false}
          className="w-full h-full z-0"
        >
          {/* Capa Base Dinámica Invertida CARTO (Light en Dark Mode / Dark en Light Mode) */}
          <TileLayer
            key={isDark ? 'light-tiles' : 'dark-tiles'}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            url={tileUrl}
            maxZoom={19}
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

          {/* Trazado de Rutas Reales de Camiones (OpenRouteService) */}
          {showTrucks && Object.entries(truckRoutes).map(([truckId, routeData]) => {
            if (!routeData?.coordinates || routeData.coordinates.length === 0) return null;
            return (
              <Polyline
                key={`route-polyline-${truckId}`}
                positions={routeData.coordinates}
                pathOptions={{
                  color: '#111111',
                  weight: 2.5,
                  opacity: 0.8,
                  dashArray: '4, 6',
                  lineCap: 'square',
                  lineJoin: 'miter'
                }}
              >
                <Popup>
                  <div className="p-2 text-xs text-[#111111] space-y-1 font-mono">
                    <div className="font-bold flex items-center space-x-1 text-[#111111]">
                      <Truck className="w-3.5 h-3.5 inline" />
                      <span>Ruta de {routeData.truckCode || truckId}</span>
                    </div>
                    <p className="text-[11px] text-[#666666]">
                      Zona: <span className="font-semibold text-[#111111]">{routeData.destinationName}</span>
                    </p>
                    {routeData.distanceKm !== undefined && (
                      <p className="text-[11px] text-[#666666]">
                        Distancia: <span className="font-bold text-[#111111]">{routeData.distanceKm} km</span> (~{routeData.durationMinutes} min)
                      </p>
                    )}
                  </div>
                </Popup>
              </Polyline>
            );
          })}

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
                <div className="p-2 space-y-2 text-[#111111] font-mono text-xs min-w-[210px]">
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-sm bg-[#f5f5f5] text-[#111111] flex items-center justify-center border border-[#e5e5e5]">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-[#666666] block">Unidad</span>
                        <span className="font-bold text-sm text-[#111111]">{truck.code || truck.plate || 'Camión'}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-sm font-mono text-[10px] bg-[#f5f5f5] text-[#111111] border border-[#e5e5e5]">
                      {truck.status || 'EN_RUTA'}
                    </span>
                  </div>

                  <div className="space-y-1 pt-0.5 text-xs">
                    <div className="flex justify-between items-center bg-[#fafafa] px-2 py-1 rounded-sm border border-[#e5e5e5]">
                      <span className="text-[#666666]">Chofer:</span>
                      <span className="font-bold text-[#111111]">{truck.driver || 'Personal Municipal'}</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#fafafa] px-2 py-1 rounded-sm border border-[#e5e5e5]">
                      <span className="text-[#666666]">Barrio:</span>
                      <span className="font-bold text-[#111111]">{truck.barrio || 'En ruta'}</span>
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
                      <div className="p-2 space-y-2 text-[#111111] font-mono text-xs max-w-xs min-w-[240px]">
                        <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-2">
                          <div className="flex items-center space-x-1.5">
                            <div className="w-6 h-6 rounded-sm bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[#111111] bg-[#f5f5f5] border border-[#cccccc] px-1.5 py-0.5 rounded-sm font-bold text-[11px]">
                              {rep.ticket_number || 'DEN-ASU'}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-sm text-[10px] bg-[#ffffff] text-[#111111] border border-[#cccccc]">
                            {rep.status}
                          </span>
                        </div>

                        <div>
                          <div className="mb-1">
                            <span className="border border-red-600/30 text-red-600 dark:text-red-400 bg-red-500/10 font-mono text-[10px] px-1.5 py-0.5 rounded-sm font-bold uppercase">
                              {rep.category?.replace(/_/g, ' ') || 'Denuncia Ciudadana'}
                            </span>
                          </div>
                          <p className="text-[#333333] text-xs mt-1 leading-relaxed bg-[#f5f5f5] p-2 rounded-sm border border-[#e5e5e5]">
                            {rep.description}
                          </p>
                        </div>

                        {rep.address_reference && (
                          <div className="flex items-start space-x-1.5 text-[11px] text-[#666666] bg-[#fafafa] p-1.5 rounded-sm border border-[#e5e5e5]">
                            <MapPin className="w-3.5 h-3.5 text-[#111111] shrink-0 mt-0.5" />
                            <span><strong>Ref:</strong> {rep.address_reference}</span>
                          </div>
                        )}

                        {rep.photo_urls && rep.photo_urls.length > 0 && (
                          <div className="pt-1">
                            <a
                              href={rep.photo_urls[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block group relative overflow-hidden rounded-sm border border-[#cccccc] shadow-sm"
                            >
                              <img
                                src={rep.photo_urls[0]}
                                alt="Evidencia fotográfica"
                                className="w-full h-32 object-cover"
                              />
                              <div className="absolute inset-0 bg-[#111111]/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <span className="text-white text-[10px] font-mono font-bold">Abrir foto</span>
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
        <div className="p-3 rounded-sm shadow-sm border border-[#111111] dark:border-slate-700 bg-[#ffffff] dark:bg-slate-900 space-y-2 text-xs font-mono text-[#111111] dark:text-slate-100">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#e5e5e5] dark:border-slate-800">
            <span className="font-bold text-[#111111] dark:text-slate-100 text-xs flex items-center space-x-1.5 uppercase tracking-tight">
              <Layers className="w-3.5 h-3.5 text-[#111111] dark:text-slate-200" />
              <span>Turnos Oficiales de Recolección</span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1">
            <div className="flex items-center space-x-2.5">
              <span className="w-3.5 h-3.5 rounded-sm border border-[#111111] dark:border-slate-700 shadow-sm" style={{ backgroundColor: '#22c55e' }} />
              <div>
                <p className="font-bold text-[#111111] dark:text-slate-100 text-[11px]">Turno Mañana</p>
                <p className="text-[10px] text-[#666666] dark:text-slate-400">06:00 a 12:00 hs (Verde)</p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <span className="w-3.5 h-3.5 rounded-sm border border-[#111111] dark:border-slate-700 shadow-sm" style={{ backgroundColor: '#f97316' }} />
              <div>
                <p className="font-bold text-[#111111] dark:text-slate-100 text-[11px]">Turno Tarde</p>
                <p className="text-[10px] text-[#666666] dark:text-slate-400">12:00 a 18:00 hs (Naranja)</p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <span className="w-3.5 h-3.5 rounded-sm border border-[#111111] dark:border-slate-700 shadow-sm" style={{ backgroundColor: '#475569' }} />
              <div>
                <p className="font-bold text-[#111111] dark:text-slate-100 text-[11px]">Turno Noche</p>
                <p className="text-[10px] text-[#666666] dark:text-slate-400">19:00 a 02:00 hs (Pizarra)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE 1: TARJETA FLOTANTE "MI BARRIO" ENRIQUECIDA */}
      {/* ========================================================================= */}
      {selectedBarrio && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-[1000] animate-fadeIn">
          <div className="p-4 rounded-sm shadow-sm border border-[#111111] dark:border-slate-700 bg-[#ffffff] dark:bg-slate-950 space-y-3 text-[#111111] dark:text-slate-100">

            {/* Cabecera: Nombre y Zona */}
            <div className="flex items-start justify-between border-b border-[#e5e5e5] dark:border-slate-800 pb-2">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#666666] dark:text-slate-400">
                  {selectedBarrio.zone || 'Asunción'}
                </span>
                <h3 className="text-base font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100 flex items-center space-x-2">
                  <span>{selectedBarrio.name}</span>
                  {selectedBarrio.approx && (
                    <span className="text-[9px] font-mono text-[#666666] dark:text-slate-400 bg-[#f5f5f5] dark:bg-slate-800 border border-[#e5e5e5] dark:border-slate-700 px-1.5 py-0.2 rounded-sm">
                      Aproximado
                    </span>
                  )}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBarrio(null)}
                className="p-1 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 rounded-sm hover:bg-[#f5f5f5] dark:hover:bg-slate-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">

              {/* Badge Dinámico: Camión en tu zona ahora (Turf.js) */}
              {hasTruckInSelectedBarrio && (
                <div className="flex items-center space-x-2 bg-[#111111] dark:bg-slate-800 text-[#ffffff] dark:text-slate-100 p-2 rounded-sm text-xs font-mono">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Camión en tu zona ahora</span>
                </div>
              )}

              {/* Turno y Horario de Recolección */}
              <div className="flex items-center justify-between p-2 rounded-sm bg-[#f5f5f5] dark:bg-slate-900 border border-[#e5e5e5] dark:border-slate-800 font-mono text-xs">
                <span className="text-[#666666] dark:text-slate-400">Turno:</span>
                <span className="font-bold text-[#111111] dark:text-slate-100">
                  {selectedBarrio.shift} ({selectedBarrio.shiftHours})
                </span>
              </div>

              {/* Días de Servicio */}
              <div className="p-2 rounded-sm bg-[#f5f5f5] dark:bg-slate-900 border border-[#e5e5e5] dark:border-slate-800 font-mono text-xs">
                <p className="text-[#666666] dark:text-slate-400 text-[10px] uppercase">Días de Servicio:</p>
                <p className="text-[#111111] dark:text-slate-100 font-bold mt-0.5">{selectedBarrio.groupLabel}</p>
              </div>

              {/* Próxima Recolección Calculada */}
              {nextCollection && (
                <div className="p-2 rounded-sm bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 font-mono text-xs">
                  <p className="text-[10px] text-[#666666] dark:text-slate-400 uppercase">Próxima recolección</p>
                  <p className="font-bold text-[#111111] dark:text-slate-100 mt-0.5">
                    {nextCollection.text}
                  </p>
                </div>
              )}

              {/* Calles Principales de Referencia */}
              {selectedBarrio.mainStreets && (
                <div className="text-[11px] text-[#333333] dark:text-slate-300 bg-[#f5f5f5] dark:bg-slate-900 p-2 rounded-sm border border-[#e5e5e5] dark:border-slate-800 font-mono">
                  <strong className="text-[#111111] dark:text-slate-100">Calles principales:</strong> {selectedBarrio.mainStreets}
                </div>
              )}
            </div>

            {/* Botón de Acción Directa: Reportar Basura */}
            {onOpenReportModal && (
              <button
                onClick={() => onOpenReportModal(selectedBarrio)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-sm text-xs transition-colors shadow-sm flex items-center justify-center space-x-1.5 uppercase font-mono tracking-wider"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
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
