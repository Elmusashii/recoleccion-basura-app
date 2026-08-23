import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, 
  AlertTriangle, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Camera, 
  UploadCloud, 
  RefreshCw, 
  LogOut, 
  X, 
  Eye, 
  Clock, 
  AlertOctagon, 
  CheckCircle,
  FileText,
  HelpCircle,
  PhoneCall
} from 'lucide-react';
import { FleetAPI, ReportsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ISSUE_TYPES = [
  { value: 'MECANICA', label: '🔧 Falla Mecánica (Motor, Caja, Frenos)' },
  { value: 'NEUMATICOS', label: '🛞 Neumáticos / Pinchadura / Llanta' },
  { value: 'HIDRAULICA', label: '💧 Sistema Hidráulico / Compactador' },
  { value: 'ELECTRICA', label: '⚡ Falla Eléctrica / Luces / Batería' },
  { value: 'OTRO', label: '⚠️ Otra Avería / Incidencia' }
];

export const DriverDashboard = () => {
  const { user, logout } = useAuth();
  const [truck, setTruck] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modales
  const [isReportIssueOpen, setIsReportIssueOpen] = useState(false);
  const [selectedReportForResolve, setSelectedReportForResolve] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Formulario Reportar Avería
  const [issueData, setIssueData] = useState({
    issueType: 'MECANICA',
    description: '',
    photoFile: null,
    photoPreview: null
  });
  const [submittingIssue, setSubmittingIssue] = useState(false);

  // Formulario Resolver Denuncia
  const [resolveData, setResolveData] = useState({
    notes: '',
    photoFile: null,
    photoPreview: null
  });
  const [resolvingReport, setResolvingReport] = useState(false);

  // Carga de datos del chofer (Camión + Denuncias asignadas)
  const loadDriverData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Obtener camión asignado
      const truckRes = await FleetAPI.getMyTruck();
      const myTruck = truckRes.data?.data?.truck || truckRes.data?.data || null;
      setTruck(myTruck);

      // 2. Si tiene camión, obtener denuncias asignadas
      if (myTruck) {
        const reportsRes = await ReportsAPI.getAssignedToMe();
        setReports(reportsRes.data?.data?.reports || []);
      } else {
        setReports([]);
      }
    } catch (err) {
      console.warn('Error al cargar datos del chofer:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDriverData();
  }, [loadDriverData]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Manejador: Reportar Avería de Camión
  const handlePhotoSelectIssue = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La fotografía supera el límite de 5MB.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setIssueData(prev => ({ ...prev, photoFile: file, photoPreview: previewUrl }));
  };

  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (!truck) return;
    if (!issueData.description.trim()) {
      alert('Por favor describe brevemente la avería detectada.');
      return;
    }

    setSubmittingIssue(true);
    try {
      const formData = new FormData();
      formData.append('issueType', issueData.issueType);
      formData.append('description', issueData.description.trim());
      if (issueData.photoFile) {
        formData.append('photo', issueData.photoFile);
      }

      const res = await FleetAPI.reportIssue(truck.id, formData);
      if (res.data?.success) {
        showToast('🚨 Avería reportada con éxito. Unidad marcada como FUERA DE SERVICIO.');
        setIsReportIssueOpen(false);
        setIssueData({
          issueType: 'MECANICA',
          description: '',
          photoFile: null,
          photoPreview: null
        });
        loadDriverData(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al enviar reporte de avería.');
    } finally {
      setSubmittingIssue(false);
    }
  };

  // Manejador: Resolver Denuncia
  const handlePhotoSelectResolve = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La fotografía supera el límite de 5MB.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setResolveData(prev => ({ ...prev, photoFile: file, photoPreview: previewUrl }));
  };

  const handleOpenResolveModal = (report) => {
    setSelectedReportForResolve(report);
    setResolveData({
      notes: '',
      photoFile: null,
      photoPreview: null
    });
  };

  const handleSubmitResolve = async (e) => {
    e.preventDefault();
    if (!selectedReportForResolve) return;

    setResolvingReport(true);
    try {
      let uploadedPhotoUrl = null;
      if (resolveData.photoFile) {
        const uploadRes = await ReportsAPI.uploadPhoto(resolveData.photoFile);
        uploadedPhotoUrl = uploadRes.data?.data?.url;
      }

      const payload = {
        status: 'RESUELTO',
        admin_notes: resolveData.notes.trim() || 'Recolectado y despejado por chofer de unidad asignada.'
      };

      if (uploadedPhotoUrl) {
        const currentPhotos = selectedReportForResolve.photo_urls || [];
        payload.photo_urls = [...currentPhotos, uploadedPhotoUrl];
      }

      const updateRes = await ReportsAPI.updateStatus(selectedReportForResolve.id, payload);
      if (updateRes.data?.success) {
        showToast(`✅ Denuncia ${selectedReportForResolve.ticket_number || ''} marcada como Resuelta.`);
        setSelectedReportForResolve(null);
        // Remover de la lista local
        setReports(prev => prev.filter(r => r.id !== selectedReportForResolve.id));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al marcar denuncia como resuelta.');
    } finally {
      setResolvingReport(false);
    }
  };

  // Estado de Carga Inicial
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-300">Cargando panel del chofer...</p>
      </div>
    );
  }

  // Estado: Sin Camión Asignado
  if (!truck) {
    return (
      <div className="max-w-md mx-auto my-8 p-6 glass-panel rounded-3xl border border-slate-800 text-center space-y-5 animate-fadeIn shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 text-3xl">
          🚚
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">Hola, {user?.name || 'Chofer'}</h2>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            ⚠️ Sin Camión Asignado
          </span>
          <p className="text-xs text-slate-400 leading-relaxed pt-2">
            No tienes un camión recolector asignado a tu usuario actualmente. Por favor, contacta a tu <strong>Supervisor de Rutas</strong> o al Administrador para que te asigne una unidad en servicio.
          </p>
        </div>

        <div className="pt-2 space-y-2">
          <button
            onClick={() => loadDriverData(true)}
            disabled={refreshing}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-2xl text-xs transition shadow-lg shadow-cyan-950/50 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Comprobando...' : 'Comprobar Asignación Nuevamente'}</span>
          </button>

          <button
            onClick={logout}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-2xl text-xs transition flex items-center justify-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    );
  }

  const isTruckOut = truck.status === 'FUERA_DE_SERVICIO' || truck.status === 'EN_MANTENIMIENTO';

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-16 animate-fadeIn">
      
      {/* TARJETA CABECERA: CHOFER Y CAMIÓN ASIGNADO */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-cyan-900/40 shrink-0">
              🚚
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-white">{user?.name || 'Chofer Municipal'}</h2>
                <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-mono uppercase">
                  Chofer
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Unidad Asignada: <strong className="text-white font-mono text-sm">{truck.code}</strong>
                {truck.plate_number && <span className="font-mono text-slate-400"> [{truck.plate_number}]</span>}
              </p>
            </div>
          </div>

          <button
            onClick={() => loadDriverData(true)}
            disabled={refreshing}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Ficha técnica rápida del camión */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Estado Unidad</span>
            <span className={`font-bold mt-0.5 block ${
              isTruckOut ? 'text-rose-400' : truck.status === 'EN_RUTA' ? 'text-amber-300 animate-pulse' : 'text-emerald-400'
            }`}>
              {isTruckOut ? '⚠️ FUERA DE SERVICIO' : truck.status === 'EN_RUTA' ? '🔴 EN RUTA' : '🟢 DISPONIBLE'}
            </span>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Capacidad</span>
            <span className="font-bold text-slate-200 mt-0.5 block">
              {truck.capacity_tons || 12} Toneladas
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Ruta Asignada</span>
            <span className="font-bold text-cyan-300 mt-0.5 block truncate">
              {truck.routes?.name || truck.routes?.zone || 'Ruta General'}
            </span>
          </div>
        </div>

        {/* BOTÓN DESTACADO: REPORTAR AVERÍA */}
        <button
          onClick={() => setIsReportIssueOpen(true)}
          className="w-full bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold py-3 px-4 rounded-2xl shadow-lg shadow-rose-950/40 text-xs sm:text-sm flex items-center justify-center space-x-2 transition active:scale-[0.98]"
        >
          <AlertOctagon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span>🚨 Reportar Avería / Incidencia Mecánica</span>
        </button>
      </div>

      {/* SECCIÓN: MIS DENUNCIAS ASIGNADAS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-black text-white text-base">Mis Denuncias Asignadas</h3>
            <span className="bg-cyan-500/20 text-cyan-300 text-xs font-bold px-2 py-0.5 rounded-full border border-cyan-500/30 font-mono">
              {reports.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">En proceso de atención</span>
        </div>

        {reports.length === 0 ? (
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">¡Al día! No tienes denuncias pendientes</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Cuando el supervisor asigne reclamos ciudadanos o vertederos a tu camión, aparecerán aquí para que los visites y marques como resueltos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800/90 bg-slate-900/70 hover:border-slate-700 transition space-y-3 shadow-lg"
              >
                {/* Cabecera del Reclamo */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-cyan-400 text-xs sm:text-sm">
                        {report.ticket_number || 'TICKET'}
                      </span>
                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                        {report.status}
                      </span>
                    </div>
                    <span className="inline-block mt-1 bg-slate-800 text-slate-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border border-slate-700">
                      {report.category?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {report.created_at && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(report.created_at).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' })} • {new Date(report.created_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Descripción y Dirección */}
                <div className="space-y-1.5 text-xs">
                  <p className="text-slate-200 leading-relaxed">
                    {report.description}
                  </p>
                  
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] pt-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{report.address_reference || 'Ubicación georreferenciada'}</span>
                  </div>
                </div>

                {/* Foto adjunta del ciudadano si existe */}
                {report.photo_urls && report.photo_urls.length > 0 && (
                  <div className="pt-1">
                    <button
                      onClick={() => setSelectedPhoto(report.photo_urls[0])}
                      className="flex items-center space-x-1.5 text-cyan-400 hover:text-cyan-300 font-semibold bg-cyan-950/40 px-2.5 py-1.5 rounded-xl border border-cyan-500/30 text-xs transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Foto Denuncia ({report.photo_urls.length})</span>
                    </button>
                  </div>
                )}

                {/* BOTONES DE ACCIÓN OPERATIVA */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  {/* Botón Google Maps */}
                  {report.latitude && report.longitude ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition border border-slate-700"
                    >
                      <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Navegar GPS</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="bg-slate-900 text-slate-600 font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 border border-slate-800"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Sin Coordenadas</span>
                    </button>
                  )}

                  {/* Botón Marcar como Resuelta */}
                  <button
                    onClick={() => handleOpenResolveModal(report)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md transition shadow-emerald-950/40"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Marcar Resuelta</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: REPORTAR AVERÍA DE LA UNIDAD */}
      {/* ========================================================================= */}
      {isReportIssueOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reportar Avería en {truck.code}</h3>
                  <p className="text-xs text-slate-400">La unidad pasará a FUERA DE SERVICIO</p>
                </div>
              </div>
              <button
                onClick={() => setIsReportIssueOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitIssue} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tipo de Avería *</label>
                <select
                  value={issueData.issueType}
                  onChange={(e) => setIssueData({ ...issueData, issueType: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                >
                  {ISSUE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Detalle del Desperfecto *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe qué ocurrió, ruidos extraños, pérdida de fluidos, pinchazo..."
                  value={issueData.description}
                  onChange={(e) => setIssueData({ ...issueData, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Fotografía de la Avería (Opcional)</label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl p-3 text-center transition flex items-center justify-center space-x-2 text-slate-300">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span>{issueData.photoFile ? 'Cambiar Foto' : 'Tomar / Subir Foto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelectIssue}
                      className="hidden"
                    />
                  </label>
                  {issueData.photoFile && (
                    <button
                      type="button"
                      onClick={() => setIssueData({ ...issueData, photoFile: null, photoPreview: null })}
                      className="p-3 bg-slate-800 text-rose-400 rounded-xl border border-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {issueData.photoPreview && (
                  <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-700 max-h-36">
                    <img
                      src={issueData.photoPreview}
                      alt="Vista previa avería"
                      className="w-full h-36 object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReportIssueOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingIssue}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-950/50 transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {submittingIssue ? (
                    <span>Registrando...</span>
                  ) : (
                    <>
                      <AlertOctagon className="w-4 h-4" />
                      <span>Confirmar Avería</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MARCAR DENUNCIA COMO RESUELTA */}
      {/* ========================================================================= */}
      {selectedReportForResolve && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Completar Denuncia</h3>
                  <p className="text-xs font-mono text-cyan-400">{selectedReportForResolve.ticket_number}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReportForResolve(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitResolve} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-slate-300 text-xs">
                <p className="font-semibold text-white mb-0.5">{selectedReportForResolve.category?.replace(/_/g, ' ')}</p>
                <p className="text-slate-400 text-[11px]">{selectedReportForResolve.address_reference}</p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notas de Limpieza / Despeje</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Zona completamente despejada y cargada al camión."
                  value={resolveData.notes}
                  onChange={(e) => setResolveData({ ...resolveData, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Foto de Evidencia Limpia (Recomendada)</label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl p-3 text-center transition flex items-center justify-center space-x-2 text-slate-300">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>{resolveData.photoFile ? 'Cambiar Foto' : 'Tomar Foto del Lugar Limpio'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelectResolve}
                      className="hidden"
                    />
                  </label>
                  {resolveData.photoFile && (
                    <button
                      type="button"
                      onClick={() => setResolveData({ ...resolveData, photoFile: null, photoPreview: null })}
                      className="p-3 bg-slate-800 text-rose-400 rounded-xl border border-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {resolveData.photoPreview && (
                  <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-700 max-h-36">
                    <img
                      src={resolveData.photoPreview}
                      alt="Vista previa evidencia"
                      className="w-full h-36 object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedReportForResolve(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resolvingReport}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/50 transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {resolvingReport ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Completar y Cerrar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VER FOTO COMPLETA */}
      {/* ========================================================================= */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white">Foto de la Denuncia</h4>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center">
              <img
                src={selectedPhoto}
                alt="Foto"
                className="max-h-[55vh] w-auto object-contain rounded-lg"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/600x400?text=Foto+No+Disponible';
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TOAST DE FEEDBACK */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[3000] bg-slate-900 border border-emerald-500/50 text-emerald-300 text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 animate-fadeIn max-w-[90vw]">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
