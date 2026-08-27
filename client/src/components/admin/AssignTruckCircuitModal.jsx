import React, { useState, useEffect } from 'react';
import {
  X,
  Map,
  Search,
  CheckSquare,
  Square,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { FleetAPI } from '../../services/api';

const SHIFTS = [
  { value: 'Mañana', label: 'Mañana (06:00 - 14:00)' },
  { value: 'Tarde', label: 'Tarde (14:00 - 22:00)' },
  { value: 'Noche', label: 'Noche (22:00 - 06:00)' }
];

const SCHEDULE_DAYS_OPTIONS = [
  {
    value: 'Lunes, Miércoles, Viernes',
    shortLabel: 'L-M-V',
    label: 'Lunes, Miércoles, Viernes'
  },
  {
    value: 'Martes, Jueves, Sábado',
    shortLabel: 'M-J-S',
    label: 'Martes, Jueves, Sábado'
  }
];

export const AssignTruckCircuitModal = ({ isOpen, onClose, truck, onSaved }) => {
  const [shift, setShift] = useState('Mañana');
  const [days, setDays] = useState('Martes, Jueves, Sábado');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [selectedRouteIds, setSelectedRouteIds] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflictError, setConflictError] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Inicializar con la configuración actual del camión
  useEffect(() => {
    if (truck && isOpen) {
      setConflictError(null);
      setErrorMessage(null);
      setSearchQuery('');

      const currentRoutes = truck.assigned_routes || [];
      if (currentRoutes.length > 0) {
        const first = currentRoutes[0];
        if (first.shift) setShift(first.shift);

        const daysStr = Array.isArray(first.schedule_days)
          ? first.schedule_days.join(', ')
          : (first.schedule_days || '');
        if (daysStr.includes('Lunes')) {
          setDays('Lunes, Miércoles, Viernes');
        } else if (daysStr.includes('Martes')) {
          setDays('Martes, Jueves, Sábado');
        }

        setSelectedRouteIds(currentRoutes.map(r => r.id));
      } else {
        setSelectedRouteIds([]);
      }
    }
  }, [truck, isOpen]);

  // Cargar barrios disponibles cada vez que cambia el turno o los días
  useEffect(() => {
    if (!isOpen || !truck) return;

    let isMounted = true;
    setLoadingRoutes(true);
    setConflictError(null);

    FleetAPI.getAvailableRoutesForTruck({
      shift,
      days,
      excludeTruckId: truck.id
    })
      .then((res) => {
        if (isMounted) {
          const list = res.data?.data || [];
          setAvailableRoutes(list);
        }
      })
      .catch((err) => {
        console.error('Error al cargar rutas disponibles:', err);
        if (isMounted) {
          setErrorMessage('No se pudieron consultar los barrios disponibles para este turno y cronograma.');
        }
      })
      .finally(() => {
        if (isMounted) setLoadingRoutes(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, truck, shift, days]);

  if (!isOpen || !truck) return null;

  // Filtrado por buscador
  const filteredRoutes = availableRoutes.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.zone && r.zone.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleRouteSelection = (routeId) => {
    setConflictError(null);
    setErrorMessage(null);
    setSelectedRouteIds(prev =>
      prev.includes(routeId)
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredRoutes.map(r => r.id);
    const allSelected = filteredIds.every(id => selectedRouteIds.includes(id));
    if (allSelected) {
      setSelectedRouteIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedRouteIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleClearCircuit = async () => {
    if (!window.confirm(`¿Estás seguro de desasignar todo el circuito del camión ${truck.code}?`)) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setConflictError(null);

    let cleared = false;
    try {
      await FleetAPI.updateTruckRoutes(truck.id, []);
      cleared = true;
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Error al limpiar el circuito');
      setSaving(false);
      return;
    }

    try {
      if (onSaved) onSaved([]);
      onClose();
    } catch (cbErr) {
      console.warn('[AssignTruckCircuitModal] Error en callback onSaved:', cbErr);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setConflictError(null);

    let savedRoutes = [];
    try {
      const res = await FleetAPI.updateTruckRoutes(truck.id, selectedRouteIds);
      savedRoutes = res.data?.data || [];
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictError(err.response.data);
      } else {
        setErrorMessage(err.response?.data?.message || err.message || 'Error al guardar la asignación de circuito.');
      }
      setSaving(false);
      return;
    }

    try {
      if (onSaved) onSaved(savedRoutes);
      onClose();
    } catch (cbErr) {
      console.warn('[AssignTruckCircuitModal] Error en callback onSaved:', cbErr);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#111111]/70 animate-fadeIn">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-950 border border-[#111111] dark:border-slate-700 rounded-sm shadow-sm overflow-hidden flex flex-col max-h-[90vh] text-[#111111] dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="p-4 border-b border-[#e5e5e5] dark:border-slate-800 flex items-center justify-between bg-[#ffffff] dark:bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-sm bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-100 border border-[#e5e5e5] dark:border-slate-700 flex items-center justify-center">
              <Map className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100">Asignar Circuito de Barrios</h2>
                <span className="font-mono text-xs uppercase tracking-wider text-[#666666] dark:text-slate-400 border border-[#cccccc] dark:border-slate-800 px-2 py-0.5 rounded-sm bg-transparent">
                  {truck.code}
                </span>
              </div>
              <p className="text-[11px] text-[#666666] dark:text-slate-400 font-mono">
                {truck.model || 'Camión Recolector'} • {truck.plate_number || 'S/D'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-sm text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 hover:bg-[#f5f5f5] dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido Principal con Scroll */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mensajes de Conflicto o Error */}
          {conflictError && (
            <div className="p-3 rounded-sm bg-[#f5f5f5] dark:bg-slate-900 border border-[#111111] dark:border-slate-700 text-[#111111] dark:text-slate-200 text-xs font-mono space-y-1">
              <div className="flex items-center space-x-2 font-bold uppercase">
                <AlertTriangle className="w-3.5 h-3.5 text-[#111111] dark:text-slate-200 shrink-0" />
                <span>Conflicto de Asignación Barrial</span>
              </div>
              <p className="leading-relaxed text-[11px]">{conflictError.message}</p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-sm bg-[#f5f5f5] dark:bg-slate-900 border border-[#111111] dark:border-slate-700 text-[#111111] dark:text-slate-200 text-xs font-mono flex items-center space-x-2">
              <AlertCircle className="w-3.5 h-3.5 text-[#111111] dark:text-slate-200 shrink-0" />
              <span className="text-[11px]">{errorMessage}</span>
            </div>
          )}

          {/* Selectores de Turno y Días */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Turno */}
            <div className="space-y-1">
              <label className="block text-xs font-mono text-[#666666] dark:text-slate-400 flex items-center space-x-1.5 uppercase">
                <Clock className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400" />
                <span>Turno Operativo</span>
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full bg-[#f5f5f5] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-800 text-[#111111] dark:text-slate-200 text-xs font-mono rounded-sm p-2.5 focus:outline-none focus:border-[#111111] dark:focus:border-slate-500 transition-colors"
              >
                {SHIFTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Cronograma de Días */}
            <div className="space-y-1">
              <label className="block text-xs font-mono text-[#666666] dark:text-slate-400 flex items-center space-x-1.5 uppercase">
                <Calendar className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400" />
                <span>Frecuencia de Días</span>
              </label>
              <select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full bg-[#f5f5f5] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-800 text-[#111111] dark:text-slate-200 text-xs font-mono rounded-sm p-2.5 focus:outline-none focus:border-[#111111] dark:focus:border-slate-500 transition-colors"
              >
                {SCHEDULE_DAYS_OPTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Buscador y Selección Rápida de Barrios */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-tight text-[#111111] dark:text-slate-200">
                  Barrios Compatibles Disponibles ({availableRoutes.length})
                </h3>
                <p className="text-[11px] text-[#666666] dark:text-slate-400 font-mono">
                  Seleccionados: <strong className="text-[#111111] dark:text-slate-100 font-mono">{selectedRouteIds.length} barrios</strong>
                </p>
              </div>

              {availableRoutes.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-xs font-mono font-medium text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 transition-colors underline"
                >
                  {filteredRoutes.every(r => selectedRouteIds.includes(r.id)) ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                </button>
              )}
            </div>

            {/* Barra de búsqueda */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar barrio por nombre o sector..."
                className="w-full bg-[#f5f5f5] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-800 pl-9 pr-3 py-2 text-xs text-[#111111] dark:text-slate-200 placeholder-[#999999] dark:placeholder-slate-500 rounded-sm focus:outline-none focus:border-[#111111] dark:focus:border-slate-500 transition-colors"
              />
            </div>

            {/* Listado con Checkboxes */}
            <div className="border border-[#e5e5e5] dark:border-slate-800 rounded-sm bg-[#ffffff] dark:bg-slate-900/40 p-1 max-h-60 overflow-y-auto space-y-1 divide-y divide-[#e5e5e5] dark:divide-slate-800">
              {loadingRoutes ? (
                <div className="py-8 text-center text-xs text-[#666666] dark:text-slate-400 flex flex-col items-center justify-center space-y-2 font-mono">
                  <Loader2 className="w-4 h-4 text-[#111111] dark:text-slate-200 animate-spin" />
                  <span>Consultando barrios disponibles...</span>
                </div>
              ) : filteredRoutes.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#666666] dark:text-slate-500 space-y-1 font-mono">
                  <Info className="w-4 h-4 mx-auto text-[#666666] dark:text-slate-600" />
                  <p>No se encontraron barrios libres en este turno y frecuencia.</p>
                </div>
              ) : (
                filteredRoutes.map((r) => {
                  const isSelected = selectedRouteIds.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleRouteSelection(r.id)}
                      className={`flex items-center justify-between p-2.5 rounded-sm cursor-pointer transition select-none ${
                        isSelected
                          ? 'bg-[#f5f5f5] dark:bg-slate-800 border border-[#111111] dark:border-slate-600 text-[#111111] dark:text-slate-100'
                          : 'hover:bg-[#f5f5f5] dark:hover:bg-slate-900/50 text-[#666666] dark:text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <button
                          type="button"
                          className="shrink-0 text-[#111111] dark:text-slate-200"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#111111] dark:text-slate-100" />
                          ) : (
                            <Square className="w-4 h-4 text-[#999999] dark:text-slate-600" />
                          )}
                        </button>
                        <div className="truncate">
                          <p className="text-xs font-bold truncate">{r.name}</p>
                          <p className="text-[10px] text-[#666666] dark:text-slate-400 truncate font-mono">
                            Sector: {r.zone || 'Asunción'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 text-[10px] font-mono">
                        <span className="text-[10px] uppercase font-mono border border-[#cccccc] dark:border-slate-700 px-1.5 py-0.5 rounded-sm text-[#666666] dark:text-slate-400 bg-transparent">
                          {r.shift}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-[#e5e5e5] dark:border-slate-800 flex items-center justify-between gap-3">
            {truck.assigned_routes?.length > 0 && (
              <button
                type="button"
                onClick={handleClearCircuit}
                disabled={saving}
                className="bg-transparent text-[#666666] dark:text-slate-400 border border-[#cccccc] dark:border-slate-700 hover:bg-[#111111] hover:text-[#ffffff] text-xs font-medium px-3 py-2 rounded-sm transition-colors font-mono uppercase tracking-wider flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar Circuito</span>
              </button>
            )}

            <div className="flex items-center space-x-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="bg-[#f5f5f5] dark:bg-slate-900 text-[#666666] dark:text-slate-400 border border-[#e5e5e5] dark:border-slate-800 hover:text-[#111111] dark:hover:text-slate-200 text-xs font-medium px-4 py-2.5 rounded-sm transition-colors font-mono uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#111111] text-[#fafafa] dark:bg-slate-100 dark:text-slate-950 hover:opacity-85 text-xs font-medium px-4 py-2.5 rounded-sm transition-colors flex items-center justify-center space-x-2 font-mono uppercase tracking-wider disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Guardar Circuito ({selectedRouteIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignTruckCircuitModal;
