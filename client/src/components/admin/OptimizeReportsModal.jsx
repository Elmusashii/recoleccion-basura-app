import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Route,
  Truck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Loader2,
  ChevronRight,
  TrendingUp,
  Scale,
  Navigation
} from 'lucide-react';
import { FleetAPI } from '../../services/api';

export const OptimizeReportsModal = ({
  isOpen,
  onClose,
  selectedReportIds = [],
  reports = [],
  trucks = [],
  onOptimizationApplied
}) => {
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [dispatchConflicts, setDispatchConflicts] = useState([]);
  const [result, setResult] = useState(null);

  // Lista de denuncias seleccionadas completas
  const selectedReports = useMemo(() => {
    return (reports || []).filter((r) => selectedReportIds.includes(r.id));
  }, [reports, selectedReportIds]);

  // Cálculo de peso total estimado
  const totalWeightKg = useMemo(() => {
    return selectedReports.reduce((acc, r) => {
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
  }, [selectedReports]);

  const totalWeightTons = Number((totalWeightKg / 1000).toFixed(2));

  // Datos del camión seleccionado actualmente
  const selectedTruck = useMemo(() => {
    return (trucks || []).find((t) => t.id === selectedTruckId || t.code === selectedTruckId);
  }, [trucks, selectedTruckId]);

  const truckCapacityTons = selectedTruck?.capacity_tons || 12;
  const isWeightExceeded = selectedTruck && totalWeightTons > truckCapacityTons;

  // Efecto 1: Reinicio estricto de estados solo cuando el modal se ABRE
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setDispatchConflicts([]);
      setResult(null);
    }
  }, [isOpen]);

  // Efecto 2: Autoselección de camión en background sin afectar el resultado calculado
  useEffect(() => {
    if (isOpen && !selectedTruckId && trucks && trucks.length > 0) {
      setSelectedTruckId(trucks[0].id || trucks[0].code);
    }
  }, [isOpen, trucks, selectedTruckId]);

  if (!isOpen) return null;

  const handleRunOptimization = async (e) => {
    e.preventDefault();
    if (!selectedTruckId) {
      setErrorMessage('Selecciona un camión recolector para el cálculo.');
      return;
    }
    if (selectedReportIds.length === 0) {
      setErrorMessage('No hay denuncias seleccionadas.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    let optimizationData = null;

    // 1. Bloque estrictamente dedicado a la llamada HTTP y a setear el resultado interno
    try {
      const payload = {
        reportIds: selectedReportIds,
        startCoords: selectedTruck?.current_lat && selectedTruck?.current_lng ? {
          lat: selectedTruck.current_lat,
          lng: selectedTruck.current_lng
        } : { lat: -25.2867, lng: -57.6470 }, // Base Central
        endCoords: { lat: -25.3350, lng: -57.6580 } // Vertedero Cateura
      };

      const res = await FleetAPI.optimizeReports(selectedTruckId, payload);
      optimizationData = res.data?.data;

      if (optimizationData) {
        setResult(optimizationData);
      } else {
        throw new Error('Respuesta del servidor sin datos de optimización.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al optimizar ruta';
      setErrorMessage(msg);
      return;
    } finally {
      setLoading(false);
    }

    // 2. Notificación externa aislada (si falla el callback del padre, no afecta el modal)
    if (optimizationData && typeof onOptimizationApplied === 'function') {
      try {
        onOptimizationApplied(optimizationData);
      } catch (callbackErr) {
        console.warn('[OptimizeReportsModal] Error no bloqueante en onOptimizationApplied callback:', callbackErr);
      }
    }
  };

  const handleDispatchRoute = async () => {
    if (!result || !result.stops || result.stops.length === 0) {
      setErrorMessage('No hay paradas calculadas para despachar.');
      return;
    }

    // Extraer IDs de denuncias asignadas en los jobs optimizados
    const reportIdsToDispatch = (result.stops || [])
      .filter((s) => s.type === 'job')
      .map((s) => s.denuncia_id || s.job_id || s.denuncia?.id)
      .filter(Boolean);

    if (reportIdsToDispatch.length === 0) {
      setErrorMessage('No se encontraron IDs válidos de denuncias en las paradas.');
      return;
    }

    setIsDispatching(true);
    setErrorMessage(null);

    try {
      const res = await FleetAPI.dispatchRoute(selectedTruckId, { reportIds: reportIdsToDispatch });
      const dispatchData = res.data?.data;
      const conflicts = dispatchData?.skipped_conflicts || [];

      if (conflicts.length > 0) {
        setDispatchConflicts(conflicts);
        if (dispatchData?.updated_count === 0) {
          setErrorMessage('Atención: Ninguna denuncia pudo ser despachada porque todas ya estaban asignadas a otra unidad.');
          return;
        }
      }

      if (onOptimizationApplied && typeof onOptimizationApplied === 'function') {
        try {
          onOptimizationApplied(result, conflicts);
        } catch (e) {
          console.warn('Error en callback onOptimizationApplied tras despacho:', e);
        }
      }

      if (conflicts.length === 0) {
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al despachar la ruta al camión.';
      setErrorMessage(msg);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#ffffff] dark:bg-slate-900 border border-[#e5e5e5] dark:border-slate-800 rounded-sm shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5] dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#111111] text-[#ffffff] dark:bg-slate-100 dark:text-slate-950 rounded-sm">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-[#111111] dark:text-slate-100 uppercase tracking-tight">
                Optimización de Ruta de Recolección (VROOM)
              </h3>
              <p className="text-xs text-[#666666] dark:text-slate-400 font-mono">
                Cálculo de secuencia óptima respetando la capacidad del camión
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#666666] hover:text-[#111111] dark:text-slate-400 dark:hover:text-white rounded-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerta de Error si ocurre */}
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-sm text-xs font-mono text-red-700 dark:text-red-400 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Alerta de Conflictos de Despacho Parcial */}
        {dispatchConflicts.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-sm space-y-1.5 font-mono text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center space-x-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Aviso de Despacho Parcial: {dispatchConflicts.length} denuncias omitidas por estar asignadas a otra unidad</span>
            </div>
            <p className="text-[11px] opacity-90">
              Las siguientes denuncias ya se encontraban en proceso con otra cuadrilla y no fueron sobreescritas:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {dispatchConflicts.map((c) => (
                <span
                  key={c.id}
                  className="bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-[10px] px-2 py-0.5 rounded-sm border border-amber-300 dark:border-amber-700"
                >
                  {c.ticket_number || c.id.slice(0, 8)} (En proceso)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Resumen de Denuncias Seleccionadas */}
        <div className="p-3.5 bg-[#f5f5f5] dark:bg-slate-800/60 border border-[#e5e5e5] dark:border-slate-800 rounded-sm space-y-2 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-[#111111] dark:text-slate-200">
              {selectedReports.length} Denuncias Seleccionadas en el Mapa
            </span>
            <span className="text-[#666666] dark:text-slate-400">
              Carga Total Estimada: <strong className="text-[#111111] dark:text-slate-100">{totalWeightTons} Tn</strong> ({totalWeightKg} kg)
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
            {selectedReports.map((r) => (
              <span
                key={r.id}
                className="bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-300 text-[11px] px-2 py-0.5 rounded-sm flex items-center space-x-1"
              >
                <span>{r.ticket_number || r.id.slice(0, 8)}</span>
                <span className="text-[10px] text-[#666666] dark:text-slate-400">
                  ({r.category === 'VERTEDERO_CLANDESTINO' ? '1.2Tn' : '0.5Tn'})
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Formulario de Selección de Camión y Parámetros */}
        {!result && (
          <form onSubmit={handleRunOptimization} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-[#111111] dark:text-slate-300 font-bold mb-1.5">
                Seleccionar Camión Asignado para la Ruta *
              </label>
              <select
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
                className="w-full bg-[#ffffff] dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 rounded-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-[#111111] dark:focus:ring-slate-400"
                required
              >
                <option value="">-- Seleccionar Unidad de Flota --</option>
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} ({t.plate_number || 'S/D'}) — Capacidad: {t.capacity_tons || 12} Tn [{t.status}]
                  </option>
                ))}
              </select>
            </div>

            {/* Aviso si la carga estimada excede la capacidad del camión */}
            {isWeightExceeded && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-sm text-xs font-mono text-amber-800 dark:text-amber-300 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-bold">Advertencia de Capacidad</p>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    La carga estimada ({totalWeightTons} Tn) supera la capacidad del camión seleccionado ({truckCapacityTons} Tn). El motor VROOM priorizará las paradas hasta llenar el vehículo y marcará el resto como no asignadas.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px] text-[#666666] dark:text-slate-400">
              <div className="p-2.5 bg-[#f5f5f5] dark:bg-slate-800/40 border border-[#e5e5e5] dark:border-slate-800 rounded-sm space-y-1">
                <span className="font-bold text-[#111111] dark:text-slate-300 block">
                  📍 Punto de Inicio
                </span>
                <span className="truncate block">
                  {selectedTruck?.current_lat ? `Ubicación GPS actual del ${selectedTruck.code}` : 'Base Central de Servicios Urbanos (-25.2867, -57.6470)'}
                </span>
              </div>

              <div className="p-2.5 bg-[#f5f5f5] dark:bg-slate-800/40 border border-[#e5e5e5] dark:border-slate-800 rounded-sm space-y-1">
                <span className="font-bold text-[#111111] dark:text-slate-300 block">
                  🏁 Destino Final de Descarga
                </span>
                <span className="truncate block">
                  Vertedero Cateura / Planta de Transferencia (-25.3350, -57.6580)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#e5e5e5] dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-[#e5e5e5] text-[#111111] dark:text-slate-200 border border-[#cccccc] dark:border-slate-700 rounded-sm font-medium transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-[#111111] text-[#ffffff] dark:bg-slate-100 dark:text-slate-950 hover:opacity-90 rounded-sm font-bold transition-all shadow-md flex items-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Optimizando con VROOM...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Calcular Secuencia Óptima</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Vista de Resultados de la Optimización */}
        {result && (
          <div className="space-y-4 font-mono text-xs animate-fadeIn">
            {/* KPIs de la Ruta Calculada */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-[#f5f5f5] dark:bg-slate-800/60 border border-[#e5e5e5] dark:border-slate-800 rounded-sm">
                <span className="text-[10px] text-[#666666] dark:text-slate-400 block uppercase">Distancia Total</span>
                <span className="text-base font-bold text-[#111111] dark:text-slate-100 mt-0.5 block">
                  {result.summary?.total_distance_km} km
                </span>
              </div>

              <div className="p-3 bg-[#f5f5f5] dark:bg-slate-800/60 border border-[#e5e5e5] dark:border-slate-800 rounded-sm">
                <span className="text-[10px] text-[#666666] dark:text-slate-400 block uppercase">Tiempo Estimado</span>
                <span className="text-base font-bold text-[#111111] dark:text-slate-100 mt-0.5 block">
                  {result.summary?.total_duration_minutes} min
                </span>
              </div>

              <div className="p-3 bg-[#f5f5f5] dark:bg-slate-800/60 border border-[#e5e5e5] dark:border-slate-800 rounded-sm">
                <span className="text-[10px] text-[#666666] dark:text-slate-400 block uppercase">Carga Recolectada</span>
                <span className="text-base font-bold text-[#111111] dark:text-slate-100 mt-0.5 block">
                  {result.summary?.total_weight_tons} Tn
                </span>
              </div>

              <div className="p-3 bg-[#f5f5f5] dark:bg-slate-800/60 border border-[#e5e5e5] dark:border-slate-800 rounded-sm">
                <span className="text-[10px] text-[#666666] dark:text-slate-400 block uppercase">Uso de Capacidad</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {result.summary?.capacity_utilization_percent}%
                </span>
              </div>
            </div>

            {/* Secuencia Ordenada de Paradas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#111111] dark:text-slate-200 uppercase">
                  Secuencia Óptima de Paradas ({result.stops?.length || 0})
                </span>
                <span className="text-[10px] text-[#666666] dark:text-slate-400">
                  Motor: {result.engine || 'VROOM'}
                </span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {(result.stops || []).map((stop) => (
                  <div
                    key={stop.stop_order}
                    className="p-2.5 bg-[#f5f5f5] dark:bg-slate-800/40 border border-[#e5e5e5] dark:border-slate-800 rounded-sm flex items-center justify-between text-xs hover:bg-[#e5e5e5] dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-sm bg-[#111111] text-[#ffffff] dark:bg-slate-100 dark:text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
                        {stop.stop_order}
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-[#111111] dark:text-slate-200 truncate">
                          {stop.ticket_number} • {stop.category?.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[10px] text-[#666666] dark:text-slate-400 truncate">
                          {stop.address_reference || `${stop.latitude?.toFixed(4)}, ${stop.longitude?.toFixed(4)}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 text-[11px] font-mono">
                      <span className="font-semibold block text-[#111111] dark:text-slate-200">
                        +{stop.weight_kg} kg
                      </span>
                      <span className="text-[10px] text-[#666666] dark:text-slate-400 block">
                        Acum: {stop.accumulated_weight_kg} kg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Denuncias No Asignadas por Exceso de Capacidad */}
            {result.unassigned && result.unassigned.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-sm space-y-1.5">
                <span className="font-bold text-red-800 dark:text-red-400 text-xs flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{result.unassigned.length} Denuncias Fuera de Capacidad (No Asignadas)</span>
                </span>
                <p className="text-[11px] text-red-700 dark:text-red-300">
                  Estas denuncias superaron la capacidad del camión y deberán ser asignadas en un segundo turno o a otra unidad.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {result.unassigned.map((u) => (
                    <span
                      key={u.denuncia_id || u.job_id}
                      className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-[10px] px-2 py-0.5 rounded-sm"
                    >
                      {u.ticket_number || `Job #${u.job_id}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Acciones Finales */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-3 border-t border-[#e5e5e5] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setResult(null)}
                disabled={isDispatching}
                className="px-3.5 py-2 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-[#e5e5e5] text-[#111111] dark:text-slate-200 border border-[#cccccc] dark:border-slate-700 rounded-sm font-medium transition-colors text-xs disabled:opacity-50"
              >
                ← Recalcular
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDispatching}
                  className="px-4 py-2 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-[#e5e5e5] text-[#111111] dark:text-slate-200 border border-[#cccccc] dark:border-slate-700 rounded-sm font-medium transition-colors text-xs disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleDispatchRoute}
                  disabled={isDispatching}
                  className="px-5 py-2 bg-[#111111] text-[#ffffff] dark:bg-slate-100 dark:text-slate-950 hover:opacity-90 rounded-sm font-bold transition-all shadow-md flex items-center space-x-1.5 text-xs disabled:opacity-50"
                >
                  {isDispatching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Despachando Ruta...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar y Despachar Ruta ({result.stops?.length || 0})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizeReportsModal;
