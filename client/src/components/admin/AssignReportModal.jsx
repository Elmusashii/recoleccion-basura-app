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

  useEffect(() => {
    if (report && isOpen) {
      setSelectedTruckId(report.assigned_truck_id || '');
      setAdminNotes(report.admin_notes || '');
      setErrorMessage(null);
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

      const response = await ReportsAPI.updateStatus(report.id, payload);
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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 overflow-hidden space-y-4">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Atender y Asignar Denuncia</span>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {report.ticket_number}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Pasa el estado a "EN PROCESO" y asigna la unidad operativa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de la Denuncia */}
        <div className="bg-slate-800/50 rounded-xl p-3.5 border border-slate-700/60 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <div className="flex items-center space-x-1.5 font-semibold text-white">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{report.citizen_name || 'Ciudadano Anónimo'}</span>
              {report.citizen_phone && <span className="text-[10px] text-slate-400 font-normal">({report.citizen_phone})</span>}
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-medium">
              {report.category?.replace(/_/g, ' ')}
            </span>
          </div>

          <p className="text-slate-300 line-clamp-2">
            "{report.description}"
          </p>

          <div className="flex items-center space-x-1.5 text-slate-400 pt-1 border-t border-slate-700/40 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{report.address_reference || `${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}`}</span>
          </div>
        </div>

        {/* Formulario de Asignación */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Selector de Camión / Cuadrilla */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Camión Recolector / Cuadrilla Asignada
            </label>
            <select
              value={selectedTruckId}
              onChange={(e) => setSelectedTruckId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">-- Sin asignación de camión específico --</option>
              {trucks && trucks.length > 0 ? (
                trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} - Chapa: {t.plate_number || t.plate || 'S/D'} ({t.status || 'Activo'})
                  </option>
                ))
              ) : (
                <>
                  <option value="cam-01">CAM-01 (Mercedes-Benz Atego - Chapa AABC 123)</option>
                  <option value="cam-02">CAM-02 (Iveco Eurocargo - Chapa AABD 456)</option>
                  <option value="cam-03">CAM-03 (Scania P280 - Chapa AABE 789)</option>
                  <option value="cuadrilla-urgencias">Cuadrilla Móvil de Respuesta Rápida</option>
                </>
              )}
            </select>
          </div>

          {/* Instrucciones / Notas Internas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Instrucciones / Notas Operativas Internas
            </label>
            <textarea
              rows={3}
              placeholder="Ej: Asignado a turno mañana. Verificar existencia de escombros sobre acera..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition shadow-lg shadow-amber-900/30 flex items-center space-x-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
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
