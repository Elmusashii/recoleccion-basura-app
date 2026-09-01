import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import * as turf from '@turf/turf';
import {
  Route,
  Trash2,
  CheckCircle2,
  AlertOctagon,
  Layers,
  MapPin,
  Maximize2,
  Info,
  Truck,
  Sparkles
} from 'lucide-react';

// Corrección de íconos por defecto de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Ícono para denuncias pendientes no seleccionadas (Alerta Roja / Monochrome)
const pendingMarkerIcon = L.divIcon({
  className: 'custom-pending-marker',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="w-7 h-7 bg-red-600 text-white rounded-sm border-2 border-white dark:border-slate-900 shadow-md flex items-center justify-center transition-transform hover:scale-110">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
});

// Ícono para denuncias pendientes SELECCIONADAS (Monochrome Activo con Check)
const selectedMarkerIcon = L.divIcon({
  className: 'custom-selected-marker',
  html: `
    <div class="relative flex items-center justify-center animate-bounce-short">
      <div class="w-8 h-8 bg-[#111111] text-[#ffffff] dark:bg-slate-100 dark:text-slate-950 rounded-sm border-2 border-[#ffffff] dark:border-slate-800 shadow-xl flex items-center justify-center font-bold">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <span class="absolute -top-1 -right-1 flex h-3 w-3">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
      </span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

/**
 * Subcomponente para integrar Leaflet Draw con FeatureGroup y controles de Polígono/Rectángulo
 */
function MapDrawSelector({ onPolygonDrawn, onClearDrawnLayer, drawnFeatureGroupRef }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const drawnItems = drawnFeatureGroupRef.current || new L.FeatureGroup();
    drawnFeatureGroupRef.current = drawnItems;

    if (!map.hasLayer(drawnItems)) {
      map.addLayer(drawnItems);
    }

    // Configuración exclusiva de Polígono y Rectángulo (deshabilitando el resto)
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          drawError: {
            color: '#ef4444',
            message: '<strong>Error:</strong> No puedes cruzar los bordes del polígono.'
          },
          shapeOptions: {
            color: '#111111',
            fillColor: '#111111',
            fillOpacity: 0.18,
            weight: 2,
            dashArray: '4, 4'
          }
        },
        rectangle: {
          shapeOptions: {
            color: '#111111',
            fillColor: '#111111',
            fillOpacity: 0.18,
            weight: 2,
            dashArray: '4, 4'
          }
        },
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false
      },
      edit: {
        featureGroup: drawnItems,
        remove: true
      }
    });

    map.addControl(drawControl);

    const handleCreated = (e) => {
      // Limpiar capas anteriores para mantener un área de selección activa a la vez
      drawnItems.clearLayers();
      const layer = e.layer;
      drawnItems.addLayer(layer);

      const geoJson = layer.toGeoJSON();
      if (onPolygonDrawn) {
        onPolygonDrawn(geoJson);
      }
    };

    const handleDeleted = () => {
      if (onClearDrawnLayer) {
        onClearDrawnLayer();
      }
    };

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.removeControl(drawControl);
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.DELETED, handleDeleted);
    };
  }, [map, onPolygonDrawn, onClearDrawnLayer, drawnFeatureGroupRef]);

  return null;
}

/**
 * Componente principal del Visor Cartográfico para Selección Espacial y Despacho VROOM
 */
export const ReportsMapView = ({
  reports = [],
  trucks = [],
  selectedReportIds = [],
  onSelectionChange,
  onOpenOptimizeModal
}) => {
  const drawnFeatureGroupRef = useRef(new L.FeatureGroup());
  const [lastSelectionCount, setLastSelectionCount] = useState(0);

  // Filtrar exclusivamente denuncias con status === 'PENDIENTE'
  const pendingReports = useMemo(() => {
    return (reports || []).filter(
      (r) =>
        r.status === 'PENDIENTE' &&
        r.latitude !== undefined &&
        r.longitude !== undefined &&
        !isNaN(parseFloat(r.latitude)) &&
        !isNaN(parseFloat(r.longitude))
    );
  }, [reports]);

  // Cálculo de peso total estimado de las denuncias seleccionadas
  const selectedMetrics = useMemo(() => {
    const selectedList = pendingReports.filter((r) => selectedReportIds.includes(r.id));
    const totalWeightKg = selectedList.reduce((acc, r) => {
      let w = r.estimated_weight_kg ?? r.weight_kg;
      if (!w) {
        switch (r.category) {
          case 'VERTEDERO_CLANDESTINO':
            w = 1200;
            break;
          case 'CONTENEDOR_DANADO':
            w = 800;
            break;
          case 'RECOLECCION_PENDIENTE':
            w = 500;
            break;
          default:
            w = 500;
        }
      }
      return acc + (Number(w) || 500);
    }, 0);

    return {
      count: selectedList.length,
      totalWeightKg,
      totalWeightTons: Number((totalWeightKg / 1000).toFixed(2))
    };
  }, [pendingReports, selectedReportIds]);

  /**
   * Cruce espacial con Turf.js cuando el usuario dibuja un Polígono o Rectángulo
   */
  const handlePolygonDrawn = (polygonGeoJSON) => {
    if (!polygonGeoJSON || pendingReports.length === 0) {
      if (onSelectionChange) onSelectionChange([]);
      return;
    }

    try {
      // 1. Construir FeatureCollection de puntos con Turf.js
      const pointsFc = turf.featureCollection(
        pendingReports.map((r) =>
          turf.point([parseFloat(r.longitude), parseFloat(r.latitude)], {
            reportId: r.id,
            ticketNumber: r.ticket_number
          })
        )
      );

      // 2. Normalizar la figura dibujada a Feature de Polígono
      const polyFeature =
        polygonGeoJSON.type === 'Feature'
          ? polygonGeoJSON
          : turf.feature(polygonGeoJSON.geometry || polygonGeoJSON);

      // 3. Ejecutar intersección espacial con pointsWithinPolygon
      const matched = turf.pointsWithinPolygon(pointsFc, polyFeature);
      const matchedIds = (matched.features || []).map((f) => f.properties.reportId);

      setLastSelectionCount(matchedIds.length);
      if (onSelectionChange) {
        onSelectionChange(matchedIds);
      }
    } catch (err) {
      console.error('[ReportsMapView] Error en cruce espacial con Turf.js:', err);
    }
  };

  /**
   * Limpiar la selección activa y las figuras dibujadas
   */
  const handleClearSelection = () => {
    if (drawnFeatureGroupRef.current) {
      drawnFeatureGroupRef.current.clearLayers();
    }
    if (onSelectionChange) {
      onSelectionChange([]);
    }
    setLastSelectionCount(0);
  };

  /**
   * Alternar selección de una denuncia individual desde su Popup
   */
  const handleToggleSingleReport = (reportId) => {
    const isSelected = selectedReportIds.includes(reportId);
    let next;
    if (isSelected) {
      next = selectedReportIds.filter((id) => id !== reportId);
    } else {
      next = [...selectedReportIds, reportId];
    }
    if (onSelectionChange) {
      onSelectionChange(next);
    }
  };

  return (
    <div className="relative w-full h-[620px] rounded-sm border border-[#e5e5e5] dark:border-slate-800 overflow-hidden bg-[#ffffff] dark:bg-slate-950">
      {/* Barra de Instrucciones Superior */}
      <div className="absolute top-3 left-3 z-[1000] bg-[#ffffff]/95 dark:bg-slate-900/95 backdrop-blur-sm border border-[#e5e5e5] dark:border-slate-800 px-3.5 py-2 rounded-sm shadow-sm flex items-center space-x-3 text-xs font-mono text-[#111111] dark:text-slate-200">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></span>
          <span>
            <strong>{pendingReports.length}</strong> Denuncias Pendientes
          </span>
        </div>
        <span className="text-[#cccccc] dark:text-slate-700">|</span>
        <span className="text-[11px] text-[#666666] dark:text-slate-400 hidden sm:inline">
          Dibuja un <strong>Polígono</strong> o <strong>Rectángulo</strong> (arriba a la derecha) para seleccionar un área.
        </span>
      </div>

      {/* Mapa Interactivo Leaflet */}
      <MapContainer
        center={[-25.2867, -57.6470]}
        zoom={13}
        className="w-full h-full z-0"
        scrollWheelZoom={true}
      >
        <TileLayer
          key="admin-reports-esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          maxZoom={19}
        />

        {/* Controlador de Dibujo y Selección Espacial */}
        <MapDrawSelector
          onPolygonDrawn={handlePolygonDrawn}
          onClearDrawnLayer={handleClearSelection}
          drawnFeatureGroupRef={drawnFeatureGroupRef}
        />

        {/* Marcadores de Denuncias Pendientes */}
        {pendingReports.map((report) => {
          const isSelected = selectedReportIds.includes(report.id);
          return (
            <Marker
              key={report.id}
              position={[parseFloat(report.latitude), parseFloat(report.longitude)]}
              icon={isSelected ? selectedMarkerIcon : pendingMarkerIcon}
            >
              <Popup className="custom-monochrome-popup">
                <div className="p-1 space-y-2 text-xs font-mono text-[#111111] min-w-[220px]">
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-1.5">
                    <span className="font-bold text-[11px] bg-[#f5f5f5] px-1.5 py-0.5 rounded-sm">
                      {report.ticket_number || 'S/N'}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-sm font-semibold ${
                        isSelected
                          ? 'bg-[#111111] text-[#ffffff]'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {isSelected ? '✓ SELECCIONADA' : 'PENDIENTE'}
                    </span>
                  </div>

                  <div>
                    <p className="font-semibold text-xs text-[#111111]">
                      {report.category?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] text-[#666666] line-clamp-2 mt-0.5">
                      {report.description || 'Sin descripción detallada.'}
                    </p>
                  </div>

                  {report.address_reference && (
                    <div className="flex items-start space-x-1 text-[10px] text-[#666666]">
                      <MapPin className="w-3 h-3 text-[#111111] shrink-0 mt-0.5" />
                      <span className="truncate">{report.address_reference}</span>
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-[#e5e5e5] flex items-center justify-between">
                    <span className="text-[10px] text-[#666666]">
                      Peso est: <strong>{report.estimated_weight_kg || (report.category === 'VERTEDERO_CLANDESTINO' ? 1200 : 500)} kg</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleSingleReport(report.id)}
                      className={`text-[10px] font-medium px-2 py-1 rounded-sm transition-colors ${
                        isSelected
                          ? 'bg-[#f5f5f5] text-[#111111] border border-[#cccccc] hover:bg-[#e5e5e5]'
                          : 'bg-[#111111] text-[#ffffff] hover:opacity-85'
                      }`}
                    >
                      {isSelected ? 'Quitar' : '+ Seleccionar'}
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Barra Flotante de Despacho al Motor VROOM (Monochrome) */}
      {selectedReportIds.length > 0 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-xl animate-fadeIn">
          <div className="bg-[#111111] text-[#fafafa] dark:bg-slate-100 dark:text-slate-950 p-3.5 rounded-sm shadow-2xl border border-[#ffffff]/20 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#ffffff]/10 dark:bg-slate-900/10 rounded-sm">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-sm">
                    {selectedMetrics.count} {selectedMetrics.count === 1 ? 'Denuncia' : 'Denuncias'}
                  </span>
                  <span className="text-xs opacity-75 font-mono">
                    (~{selectedMetrics.totalWeightTons} Tn estimadas)
                  </span>
                </div>
                <p className="text-[11px] opacity-75 font-mono">
                  Área capturada con polígono espacial
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1.5 rounded-sm text-xs font-mono opacity-80 hover:opacity-100 hover:bg-[#ffffff]/10 dark:hover:bg-slate-900/10 transition-colors flex items-center space-x-1"
                title="Limpiar selección"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>

              <button
                type="button"
                onClick={onOpenOptimizeModal}
                className="bg-[#ffffff] text-[#111111] dark:bg-slate-950 dark:text-slate-100 hover:opacity-90 px-4 py-1.5 rounded-sm text-xs font-mono font-bold transition-all shadow-md flex items-center space-x-2 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Optimizar Ruta ({selectedMetrics.count})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsMapView;
