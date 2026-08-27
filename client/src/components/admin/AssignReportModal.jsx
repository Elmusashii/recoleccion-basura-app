import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  FileText,
  AlertCircle,
  MapPin,
  User,
  Loader2,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { ReportsAPI } from '../../services/api';

export const AssignReportModal = ({ isOpen, onClose, report, trucks = [], onAssigned }) => {
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [nearestTrucks, setNearestTrucks] = useState([]);
  const [loadingNearest, setLoadingNearest] = useState(false);

  useEffect(() => {
    if (report && isOpen) {
      setSelectedTruckId(report.assigned_truck_id || '');
      setAdminNotes(report.admin_notes || '');
      setErrorMessage(null);
      setNearestTrucks([]);

      // Consultar matriz de distancias reales hacia la denuncia con OpenRouteService
      if (report.id) {
        setLoadingNearest(true);
        ReportsAPI.getNearestTrucks(report.id)
          .then((res) => {
            const list = res.data?.data?.nearestTrucks;
            if (Array.isArray(list) && list.length > 0) {
              setNearestTrucks(list);
            }
          })
          .catch((err) => {
            console.debug('[AssignReportModal] Fallback a lista convencional:', err.message);
          })
          .finally(() => {
            setLoadingNearest(false);
          });
      }
    }
  }, [report, isOpen]);

  if (!isOpen || !report) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        status: 'EN_PROCESO',
        assigned_truck_id: selectedTruckId || null,
        admin_notes: adminNotes.trim() || null
      };

      const reportIdentifier = report.id || report.ticket_number;
      console.log('[DEBUG Frontend AssignReportModal] report prop received:', JSON.stringify(report, null, 2));
      console.log('[DEBUG Frontend AssignReportModal] Submitting reportIdentifier:', reportIdentifier, 'payload:', payload);
      const response = await ReportsAPI.updateStatus(reportIdentifier, payload);
      console.log('[DEBUG Frontend AssignReportModal] Backend response:', response.data);
      const updated = response.data?.data || {
        ...report,
        ...payload
      };

      if (onAssigned) {
        onAssigned(updated);
      }
      onClose();
    } catch (err) {
      console.error('Error al asignar denuncia:', err);
      setErrorMessage(err.response?.data?.message || 'No se pudo actualizar el estado de la denuncia.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#111111]/70 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 border border-[#111111] dark:border-slate-700 rounded-sm shadow-sm p-5 overflow-hidden space-y-4 text-[#111111] dark:text-slate-100">

        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5] dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#f5f5f5] dark:bg-slate-900 text-[#111111] dark:text-slate-100 border border-[#e5e5e5] dark:border-slate-800 flex items-center justify-center">
              <Truck className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100">Atender y Asignar Denuncia</h2>
                <span className="font-mono text-xs font-bold text-[#111111] dark:text-slate-200 border border-[#cccccc] dark:border-slate-700 px-2 py-0.5 rounded-sm bg-transparent">
                  {report.ticket_number}
                </span>
              </div>
              <p className="text-[11px] text-[#666666] dark:text-slate-400">Pasa el estado a "EN PROCESO" y asigna la unidad operativa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 rounded-sm hover:bg-[#f5f5f5] dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen de la Denuncia */}
        <div className="bg-[#f5f5f5] dark:bg-slate-900/60 rounded-sm p-3 border border-[#e5e5e5] dark:border-slate-800 space-y-1.5 text-xs text-[#111111] dark:text-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 font-bold">
              <User className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400" />
              <span>{report.citizen_name || 'Ciudadano Anónimo'}</span>
              {report.citizen_phone && <span className="text-[10px] text-[#666666] dark:text-slate-400 font-mono font-normal">({report.citizen_phone})</span>}
            </div>
            <span className="px-2 py-0.5 rounded-sm bg-white dark:bg-slate-800 text-[#111111] dark:text-slate-200 font-mono text-[10px] border border-[#e5e5e5] dark:border-slate-700">
              {report.category?.replace(/_/g, ' ')}
            </span>
          </div>

          <p className="text-[#333333] dark:text-slate-300 line-clamp-2 text-[11px] font-light">
            "{report.description}"
          </p>

          <div className="flex items-center space-x-1.5 text-[#666666] dark:text-slate-400 pt-1 border-t border-[#e5e5e5] dark:border-slate-800 text-[11px] font-mono">
            <MapPin className="w-3.5 h-3.5 text-[#111111] dark:text-slate-300 shrink-0" />
            <span className="truncate">{report.address_reference || `${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}`}</span>
          </div>
        </div>

        {/* Formulario de Asignación */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {errorMessage && (
            <div className="p-2.5 bg-[#f5f5f5] dark:bg-slate-900 border border-[#111111] dark:border-slate-700 text-[#111111] dark:text-slate-200 text-xs rounded-sm flex items-center space-x-2 font-mono">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px]">{errorMessage}</span>
            </div>
          )}

          {/* Selector de Camión / Cuadrilla */}
          <div>
            <div className="flex items-center justify-between mb-1 font-mono text-xs">
              <label className="block text-[#666666] dark:text-slate-400 uppercase">
                Camión Recolector / Cuadrilla Asignada
              </label>
              {loadingNearest && (
                <span className="text-[10px] text-[#666666] dark:text-slate-400 font-mono flex items-center space-x-1">
                  <Loader2 className="w-3 h-3 animate-spin inline" />
                  <span>Calculando distancias viales...</span>
                </span>
              )}
              {!loadingNearest && nearestTrucks.length > 0 && (
                <span className="text-[10px] text-[#111111] dark:text-slate-200 font-mono flex items-center space-x-1">
                  <span>[Ordenado por cercanía vial]</span>
                </span>
              )}
            </div>

            <select
              value={selectedTruckId}
              onChange={(e) => setSelectedTruckId(e.target.value)}
              className="w-full bg-[#f5f5f5] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-800 text-[#111111] dark:text-slate-200 text-xs font-mono rounded-sm px-3 py-2.5 focus:outline-none focus:border-[#111111] dark:focus:border-slate-500 transition-colors"
            >
              <option value="">-- Sin asignación de camión específico --</option>
              {nearestTrucks && nearestTrucks.length > 0 ? (
                nearestTrucks.map((t, idx) => (
                  <option key={t.id || t.code} value={t.id}>
                    {t.code} — {t.formattedDistance} ({t.formattedDuration}) • {t.status || 'DISPONIBLE'} {idx === 0 ? '★ [Más cercano]' : ''}
                  </option>
                ))
              ) : trucks && trucks.length > 0 ? (
                trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} - Chapa: {t.plate_number || t.plate || 'S/D'} ({t.status || 'Activo'})
                  </option>
                ))
              ) : (
                <option disabled value="">(No hay unidades disponibles en la flota)</option>
              )}
            </select>
          </div>

          {/* Instrucciones / Notas Internas */}
          <div>
            <label className="block text-xs font-mono text-[#666666] dark:text-slate-400 mb-1 uppercase">
              Instrucciones / Notas Operativas Internas
            </label>
            <textarea
              rows={3}
              placeholder="Ej: Asignado a turno mañana. Verificar existencia de escombros sobre acera..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full bg-[#f5f5f5] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-800 text-[#111111] dark:text-slate-200 text-xs rounded-sm p-2.5 focus:outline-none focus:border-[#111111] dark:focus:border-slate-500 transition-colors font-mono"
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#e5e5e5] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#f5f5f5] dark:bg-slate-900 text-[#666666] dark:text-slate-400 border border-[#e5e5e5] dark:border-slate-800 hover:text-[#111111] dark:hover:text-slate-200 text-xs font-medium px-4 py-2.5 rounded-sm transition-colors font-mono uppercase tracking-wider"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="bg-[#111111] text-[#fafafa] dark:bg-slate-100 dark:text-slate-950 hover:opacity-85 text-xs font-medium px-4 py-2.5 rounded-sm transition-colors flex items-center justify-center space-x-2 font-mono uppercase tracking-wider disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Asignando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Pasar a EN PROCESO</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignReportModal;
