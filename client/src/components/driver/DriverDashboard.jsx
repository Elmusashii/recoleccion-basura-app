import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  AlertTriangle,
  MapPin,
  Navigation,
  CheckCircle2,
  Camera,
  RefreshCw,
  LogOut,
  X,
  Eye,
  Clock,
  AlertOctagon,
  CheckCircle,
  Wrench,
  Disc,
  Droplet,
  Zap,
  HelpCircle
} from 'lucide-react';
import { FleetAPI, ReportsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DriverCircuitMap } from './DriverCircuitMap';
import { handleNavigate } from '../../utils/navigationUtils';

const ISSUE_TYPES = [
  { value: 'MECANICA', label: 'Falla Mecánica (Motor, Caja, Frenos)' },
  { value: 'NEUMATICOS', label: 'Neumáticos / Pinchadura / Llanta' },
  { value: 'HIDRAULICA', label: 'Sistema Hidráulico / Compactador' },
  { value: 'ELECTRICA', label: 'Falla Eléctrica / Luces / Batería' },
  { value: 'OTRO', label: 'Otra Avería / Incidencia Operativa' }
];

export const DriverDashboard = () => {
  const { user, logout } = useAuth();
  const [truck, setTruck] = useState(null);
  const [myRoutes, setMyRoutes] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Estados de Conexión Degradada y Caché Local
  const [isOfflineCache, setIsOfflineCache] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);

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

  // Carga de datos del chofer (Paso 1: Camión -> Paso 2: Rutas + Denuncias concurrentes con fallback de caché)
  const loadDriverData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    const cacheKey = `asuncion_driver_cache_${user?.id || 'current'}`;

    try {
      // 1. PASO 1: Obtener camión asignado
      const truckRes = await FleetAPI.getMyTruck();
      const myTruck = truckRes.data?.data?.truck || truckRes.data?.data || null;

      let fetchedRoutes = [];
      let fetchedReports = [];

      // 2. PASO 2: Solo si se resuelve camión, disparar simultáneamente rutas y denuncias
      if (myTruck) {
        const [routesRes, reportsRes] = await Promise.all([
          FleetAPI.getMyRoutes().catch((rErr) => {
            console.debug('Error obteniendo rutas del chofer:', rErr.message);
            return { data: { data: { routes: [] } } };
          }),
          ReportsAPI.getAssignedToMe().catch((repErr) => {
            console.debug('Error obteniendo denuncias del chofer:', repErr.message);
            return { data: { data: { reports: [] } } };
          })
        ]);

        fetchedRoutes = routesRes.data?.data?.routes || [];
        fetchedReports = reportsRes.data?.data?.reports || [];
      }

      setTruck(myTruck);
      setMyRoutes(fetchedRoutes);
      setReports(fetchedReports);
      setIsOfflineCache(false);
      setCacheTimestamp(null);

      // Guardar copia exitosa en localStorage
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          truck: myTruck,
          routes: fetchedRoutes,
          reports: fetchedReports,
          timestamp: Date.now()
        }));
      } catch (storageErr) {
        console.warn('No se pudo persistir en localStorage:', storageErr);
      }
    } catch (err) {
      console.warn('Fallo de red/servidor al cargar chofer. Verificando caché local...', err);

      // Fallback de lectura degradada desde localStorage
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setTruck(parsed.truck || null);
          setMyRoutes(parsed.routes || []);
          setReports(parsed.reports || []);
          setIsOfflineCache(true);
          setCacheTimestamp(parsed.timestamp || Date.now());
          showToast('Modo sin conexión: mostrando datos guardados previamente.');
        } catch (parseErr) {
          console.error('Error parseando caché local:', parseErr);
        }
      } else {
        showToast('Error de conexión y sin datos locales previos.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

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
    if (submittingIssue) return;
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
        showToast('Avería reportada con éxito. Unidad marcada como FUERA DE SERVICIO.');
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
      const errorMsg = err.response?.data?.message || 'Error de conexión al enviar reporte de avería. Por favor reintenta manualmente.';
      alert(errorMsg);
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
    if (resolvingReport) return;
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
        showToast(`Denuncia ${selectedReportForResolve.ticket_number || ''} marcada como Resuelta.`);
        setSelectedReportForResolve(null);
        setReports(prev => prev.filter(r => r.id !== selectedReportForResolve.id));
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error de conexión al marcar denuncia como resuelta. Por favor reintenta manualmente.';
      alert(errorMsg);
    } finally {
      setResolvingReport(false);
    }
  };

  // Estado de Carga Inicial
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 text-[#111111] dark:text-slate-200 animate-spin" />
        <p className="text-xs font-mono uppercase text-[#666666] dark:text-slate-400">Cargando panel de chofer...</p>
      </div>
    );
  }

  // Estado: Sin Camión Asignado
  if (!truck) {
    return (
      <div className="space-y-4 max-w-md mx-auto my-8 animate-fadeIn">
        {isOfflineCache && (
          <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-3.5 py-2.5 rounded-sm text-xs font-mono flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Sin conexión. Mostrando datos guardados {cacheTimestamp ? `hace ${Math.max(1, Math.round((Date.now() - cacheTimestamp) / 60000))} min` : 'previamente'}.
              </span>
            </div>
            <button
              onClick={() => loadDriverData(true)}
              disabled={refreshing}
              className="underline hover:text-amber-950 dark:hover:text-white font-bold ml-2 shrink-0 flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Reintentar</span>
            </button>
          </div>
        )}

        <div className="p-6 bg-[#ffffff] dark:bg-slate-900 rounded-sm border border-[#111111] dark:border-slate-800 text-center space-y-4 shadow-sm text-[#111111] dark:text-slate-100">
          <div className="w-12 h-12 mx-auto rounded-sm bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 flex items-center justify-center border border-[#e5e5e5] dark:border-slate-700">
            <Truck className="w-6 h-6" strokeWidth={1.5} />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-[#111111] dark:text-slate-100 uppercase tracking-tight">Hola, {user?.name || 'Chofer'}</h2>
            <span className="inline-block px-2.5 py-0.5 rounded-sm text-[10px] font-mono uppercase border border-[#111111] dark:border-slate-600 text-[#111111] dark:text-slate-200 bg-transparent">
              Sin Camión Asignado
            </span>
            <p className="text-xs text-[#666666] dark:text-slate-400 leading-relaxed pt-2 font-light">
              No tienes un camión recolector asignado a tu usuario actualmente. Por favor, contacta a tu <strong>Supervisor de Rutas</strong> o al Administrador para que te asigne una unidad.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={() => loadDriverData(true)}
              disabled={refreshing}
              className="w-full bg-[#111111] hover:opacity-80 dark:bg-slate-100 dark:text-slate-950 text-[#fafafa] font-medium py-2.5 rounded-sm text-xs transition-colors shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 uppercase font-mono tracking-wider"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Comprobando...' : 'Comprobar Asignación'}</span>
            </button>

            <button
              onClick={logout}
              className="w-full bg-[#f5f5f5] hover:bg-[#e5e5e5] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#111111] dark:text-slate-200 font-medium py-2 rounded-sm text-xs transition-colors flex items-center justify-center space-x-1.5 border border-[#e5e5e5] dark:border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isTruckOut = truck.status === 'FUERA_DE_SERVICIO' || truck.status === 'EN_MANTENIMIENTO';

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-16 animate-fadeIn text-[#111111] dark:text-slate-100">
      {/* BANNER DE AVISO DE CONEXIÓN DEGRADADA / CACHÉ LOCAL */}
      {isOfflineCache && (
        <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-3.5 py-2.5 rounded-sm text-xs font-mono flex items-center justify-between animate-fadeIn shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Sin conexión. Mostrando datos guardados {cacheTimestamp ? `hace ${Math.max(1, Math.round((Date.now() - cacheTimestamp) / 60000))} min` : 'previamente'}.
            </span>
          </div>
          <button
            onClick={() => loadDriverData(true)}
            disabled={refreshing}
            className="underline hover:text-amber-950 dark:hover:text-white font-bold ml-2 shrink-0 flex items-center space-x-1"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* TARJETA CABECERA: CHOFER Y CAMIÓN ASIGNADO */}
      <div className="bg-[#ffffff] dark:bg-slate-900 p-4 sm:p-5 rounded-sm border border-[#e5e5e5] dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-sm bg-[#111111] dark:bg-slate-800 text-[#ffffff] dark:text-slate-100 flex items-center justify-center shrink-0 border border-[#111111] dark:border-slate-700">
              <Truck className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100">{user?.name || 'Chofer Municipal'}</h2>
                <span className="text-[10px] font-mono uppercase bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 px-2 py-0.5 rounded-sm border border-[#e5e5e5] dark:border-slate-700">
                  Chofer
                </span>
              </div>
              <p className="text-xs text-[#666666] dark:text-slate-400 font-mono">
                Unidad: <strong className="text-[#111111] dark:text-slate-100 font-mono">{truck.code}</strong>
                {truck.plate_number && <span className="text-[#666666] dark:text-slate-400"> [{truck.plate_number}]</span>}
              </p>
            </div>
          </div>

          <button
            onClick={() => loadDriverData(true)}
            disabled={refreshing}
            className="p-1.5 bg-[#ffffff] hover:bg-[#f5f5f5] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#111111] dark:text-slate-200 rounded-sm border border-[#e5e5e5] dark:border-slate-700 transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Ficha técnica rápida del camión */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
          <div className="bg-[#f5f5f5] dark:bg-slate-800/80 p-2.5 rounded-sm border border-[#e5e5e5] dark:border-slate-700">
            <span className="text-[10px] font-mono uppercase text-[#666666] dark:text-slate-400 block">Estado</span>
            <span className="font-bold font-mono text-[11px] mt-0.5 block text-[#111111] dark:text-slate-100">
              {isTruckOut ? 'FUERA DE SERVICIO' : truck.status === 'EN_RUTA' ? 'EN RUTA' : 'DISPONIBLE'}
            </span>
          </div>

          <div className="bg-[#f5f5f5] dark:bg-slate-800/80 p-2.5 rounded-sm border border-[#e5e5e5] dark:border-slate-700">
            <span className="text-[10px] font-mono uppercase text-[#666666] dark:text-slate-400 block">Capacidad</span>
            <span className="font-bold font-mono text-[11px] text-[#111111] dark:text-slate-100 mt-0.5 block">
              {truck.capacity_tons || 12} Toneladas
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-[#f5f5f5] dark:bg-slate-800/80 p-2.5 rounded-sm border border-[#e5e5e5] dark:border-slate-700">
            <span className="text-[10px] font-mono uppercase text-[#666666] dark:text-slate-400 block">Circuito</span>
            <span className="font-bold font-mono text-[11px] text-[#111111] dark:text-slate-100 mt-0.5 block truncate">
              {myRoutes.length > 0
                ? `${myRoutes.length} ${myRoutes.length === 1 ? 'barrio' : 'barrios'}`
                : 'Sin circuito'}
            </span>
          </div>
        </div>

        {/* BOTÓN DESTACADO: REPORTAR AVERÍA */}
        <button
          onClick={() => setIsReportIssueOpen(true)}
          className="w-full bg-transparent hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white border border-red-600 dark:border-red-500 text-xs font-mono uppercase tracking-wider py-2.5 rounded-sm transition-colors flex items-center justify-center space-x-2"
        >
          <AlertOctagon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>Reportar Avería o Incidencia</span>
        </button>
      </div>

      {/* SECCIÓN: MAPA DE MI CIRCUITO OPERATIVO Y DENUNCIAS */}
      <DriverCircuitMap
        routes={myRoutes}
        reports={reports}
        truck={truck}
        onSelectReport={(rep) => setSelectedReportForResolve(rep)}
      />

      {/* SECCIÓN: MIS DENUNCIAS ASIGNADAS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100 text-xs">Mis Denuncias Asignadas</h3>
            <span className="bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 text-xs font-mono px-2 py-0.5 rounded-sm border border-[#e5e5e5] dark:border-slate-700">
              {reports.length}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#666666] dark:text-slate-400 uppercase">En proceso de atención</span>
        </div>

        {reports.length === 0 ? (
          <div className="bg-[#ffffff] dark:bg-slate-900 p-6 rounded-sm border border-[#e5e5e5] dark:border-slate-800 text-center space-y-2 shadow-sm">
            <div className="w-10 h-10 mx-auto rounded-sm bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 flex items-center justify-center border border-[#e5e5e5] dark:border-slate-700">
              <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h4 className="text-xs font-bold uppercase text-[#111111] dark:text-slate-100">Sin denuncias pendientes</h4>
            <p className="text-xs text-[#666666] dark:text-slate-400 font-light max-w-sm mx-auto">
              Cuando el supervisor asigne reclamos ciudadanos a tu unidad, aparecerán aquí para ser atendidos.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-[#ffffff] dark:bg-slate-900 p-4 rounded-sm border border-[#e5e5e5] dark:border-slate-800 space-y-3 shadow-sm"
              >
                {/* Cabecera del Reclamo */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[#111111] dark:text-slate-100 text-xs">
                        {report.ticket_number || 'TICKET'}
                      </span>
                      <span className="text-[10px] font-mono bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 px-2 py-0.5 rounded-sm border border-[#e5e5e5] dark:border-slate-700">
                        {report.status}
                      </span>
                    </div>
                    <span className="inline-block mt-1 bg-[#ffffff] dark:bg-slate-800 text-[#666666] dark:text-slate-400 text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm border border-[#e5e5e5] dark:border-slate-700">
                      {report.category?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {report.created_at && (
                    <span className="text-[10px] text-[#999999] dark:text-slate-500 font-mono">
                      {new Date(report.created_at).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' })} • {new Date(report.created_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Descripción y Dirección */}
                <div className="space-y-1 text-xs">
                  <p className="text-[#333333] dark:text-slate-300 leading-relaxed">
                    {report.description}
                  </p>

                  <div className="flex items-center space-x-1.5 text-[#666666] dark:text-slate-400 text-[11px] pt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#111111] dark:text-slate-200 shrink-0" />
                    <span className="truncate">{report.address_reference || 'Ubicación georreferenciada'}</span>
                  </div>
                </div>

                {/* Foto adjunta del ciudadano si existe */}
                {report.photo_urls && report.photo_urls.length > 0 && (
                  <div className="pt-1">
                    <button
                      onClick={() => setSelectedPhoto(report.photo_urls[0])}
                      className="flex items-center space-x-1.5 text-[#111111] dark:text-slate-200 font-mono bg-[#f5f5f5] dark:bg-slate-800 hover:bg-[#e5e5e5] dark:hover:bg-slate-700 px-2.5 py-1 rounded-sm border border-[#cccccc] dark:border-slate-700 text-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Foto Denuncia ({report.photo_urls.length})</span>
                    </button>
                  </div>
                )}

                {/* BOTONES DE ACCIÓN OPERATIVA (Monochrome Deep Linking) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#e5e5e5] dark:border-slate-800">
                  {/* Botones de Navegación GPS (Deep Linking) */}
                  {report.latitude && report.longitude ? (
                    <div className="flex items-center space-x-1.5 flex-1">
                      <button
                        type="button"
                        onClick={() => handleNavigate(report.latitude, report.longitude, 'google')}
                        className="flex-1 bg-[#f5f5f5] hover:bg-[#e5e5e5] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#111111] dark:text-slate-200 border border-[#cccccc] dark:border-slate-700 font-medium py-2 px-2.5 rounded-sm text-xs flex items-center justify-center space-x-1 transition-colors font-mono"
                        title="Abrir destino en Google Maps"
                      >
                        <Navigation className="w-3.5 h-3.5 text-[#111111] dark:text-slate-200 shrink-0" />
                        <span>G. Maps</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNavigate(report.latitude, report.longitude, 'waze')}
                        className="flex-1 bg-[#f5f5f5] hover:bg-[#e5e5e5] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#111111] dark:text-slate-200 border border-[#cccccc] dark:border-slate-700 font-medium py-2 px-2.5 rounded-sm text-xs flex items-center justify-center space-x-1 transition-colors font-mono"
                        title="Abrir destino en Waze"
                      >
                        <Navigation className="w-3.5 h-3.5 text-[#111111] dark:text-slate-200 shrink-0" />
                        <span>Waze</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <button
                        disabled
                        className="w-full bg-[#f5f5f5] dark:bg-slate-800/60 text-[#999999] dark:text-slate-500 font-medium py-2 px-3 rounded-sm text-xs flex items-center justify-center space-x-1.5 border border-[#e5e5e5] dark:border-slate-700 font-mono"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Sin Coords</span>
                      </button>
                    </div>
                  )}

                  {/* Botón Marcar como Resuelta */}
                  <button
                    type="button"
                    onClick={() => handleOpenResolveModal(report)}
                    className="flex-1 bg-[#111111] hover:opacity-85 dark:bg-slate-100 dark:text-slate-950 text-[#fafafa] font-medium py-2 px-3 rounded-sm text-xs flex items-center justify-center space-x-1.5 transition-colors font-mono uppercase"
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
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#111111]/75 animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#ffffff] dark:bg-slate-950 border border-[#111111] dark:border-slate-700 rounded-sm shadow-sm p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto text-[#111111] dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5] dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-red-500/10 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-sm border border-red-500/20">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100">Reportar Avería en {truck.code}</h3>
                  <p className="text-xs text-[#666666] dark:text-slate-400 font-light">La unidad pasará a FUERA DE SERVICIO</p>
                </div>
              </div>
              <button
                onClick={() => setIsReportIssueOpen(false)}
                className="p-1 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 rounded-sm hover:bg-[#f5f5f5] dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitIssue} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">Tipo de Avería *</label>
                <select
                  value={issueData.issueType}
                  onChange={(e) => setIssueData({ ...issueData, issueType: e.target.value })}
                  className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 rounded-sm p-2 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-mono"
                >
                  {ISSUE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">Detalle del Desperfecto *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe qué ocurrió, ruidos, fluidos, pinchazo..."
                  value={issueData.description}
                  onChange={(e) => setIssueData({ ...issueData, description: e.target.value })}
                  className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 rounded-sm p-2 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">Fotografía de la Avería (Opcional)</label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 cursor-pointer bg-[#fafafa] hover:bg-[#f5f5f5] dark:bg-slate-900 dark:hover:bg-slate-800 border border-dashed border-[#cccccc] dark:border-slate-700 rounded-sm p-2.5 text-center transition-colors flex items-center justify-center space-x-2 text-[#333333] dark:text-slate-300">
                    <Camera className="w-4 h-4 text-[#666666] dark:text-slate-400" />
                    <span className="font-mono text-xs">{issueData.photoFile ? 'Cambiar Foto' : 'Subir Foto'}</span>
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
                      className="p-2.5 bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 rounded-sm border border-[#cccccc] dark:border-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {issueData.photoPreview && (
                  <div className="mt-2 relative rounded-sm overflow-hidden border border-[#cccccc] dark:border-slate-700 max-h-36">
                    <img
                      src={issueData.photoPreview}
                      alt="Vista previa avería"
                      className="w-full h-36 object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#e5e5e5] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReportIssueOpen(false)}
                  className="px-3.5 py-1.5 bg-[#f5f5f5] hover:bg-[#e5e5e5] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#111111] dark:text-slate-200 rounded-sm border border-[#e5e5e5] dark:border-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingIssue}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-sm shadow-sm transition-colors disabled:opacity-50 flex items-center space-x-1.5 uppercase font-mono tracking-wider"
                >
                  {submittingIssue ? (
                    <span>Registrando...</span>
                  ) : (
                    <>
                      <AlertOctagon className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#111111]/75 animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#ffffff] dark:bg-slate-950 border border-[#111111] dark:border-slate-700 rounded-sm shadow-sm p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto text-[#111111] dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5] dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#f5f5f5] dark:bg-slate-900 text-[#111111] dark:text-slate-200 rounded-sm border border-[#e5e5e5] dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100">Completar Denuncia</h3>
                  <p className="text-xs font-mono text-[#666666] dark:text-slate-400">{selectedReportForResolve.ticket_number}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReportForResolve(null)}
                className="p-1 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 rounded-sm hover:bg-[#f5f5f5] dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitResolve} className="space-y-3 text-xs">
              <div className="p-2.5 bg-[#f5f5f5] dark:bg-slate-800/80 rounded-sm border border-[#e5e5e5] dark:border-slate-700 text-[#333333] dark:text-slate-300 text-xs">
                <p className="font-semibold text-[#111111] dark:text-slate-100 mb-0.5">{selectedReportForResolve.category?.replace(/_/g, ' ')}</p>
                <p className="text-[#666666] dark:text-slate-400 text-[11px]">{selectedReportForResolve.address_reference}</p>
              </div>

              <div>
                <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">Notas de Limpieza / Despeje</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Zona completamente despejada y cargada al camión."
                  value={resolveData.notes}
                  onChange={(e) => setResolveData({ ...resolveData, notes: e.target.value })}
                  className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 rounded-sm p-2 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">Foto de Evidencia (Opcional)</label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 cursor-pointer bg-[#fafafa] hover:bg-[#f5f5f5] dark:bg-slate-900 dark:hover:bg-slate-800 border border-dashed border-[#cccccc] dark:border-slate-700 rounded-sm p-2.5 text-center transition-colors flex items-center justify-center space-x-2 text-[#333333] dark:text-slate-300">
                    <Camera className="w-4 h-4 text-[#666666] dark:text-slate-400" />
                    <span className="font-mono text-xs">{resolveData.photoFile ? 'Cambiar Foto' : 'Subir Foto'}</span>
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
                      className="p-2.5 bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 rounded-sm border border-[#cccccc] dark:border-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {resolveData.photoPreview && (
                  <div className="mt-2 relative rounded-sm overflow-hidden border border-[#cccccc] dark:border-slate-700 max-h-36">
                    <img
                      src={resolveData.photoPreview}
                      alt="Vista previa evidencia"
                      className="w-full h-36 object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#e5e5e5] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedReportForResolve(null)}
                  className="px-3.5 py-1.5 bg-[#f5f5f5] hover:bg-[#e5e5e5] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#111111] dark:text-slate-200 rounded-sm border border-[#e5e5e5] dark:border-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resolvingReport}
                  className="px-4 py-1.5 bg-[#111111] hover:opacity-80 dark:bg-slate-100 dark:text-slate-950 text-[#fafafa] font-medium rounded-sm shadow-sm transition-colors disabled:opacity-50 flex items-center space-x-1.5 uppercase font-mono tracking-wider"
                >
                  {resolvingReport ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#111111]/75 animate-fadeIn">
          <div className="relative max-w-lg w-full bg-[#ffffff] dark:bg-slate-950 border border-[#111111] dark:border-slate-700 rounded-sm p-4 shadow-sm space-y-3 text-[#111111] dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5] dark:border-slate-800">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#111111] dark:text-slate-100">Foto de la Denuncia</h4>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded-sm text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 hover:bg-[#f5f5f5] dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-hidden rounded-sm bg-[#fafafa] dark:bg-slate-900 border border-[#e5e5e5] dark:border-slate-800 flex items-center justify-center">
              <img
                src={selectedPhoto}
                alt="Foto"
                className="max-h-[55vh] w-auto object-contain"
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[3000] bg-[#111111] dark:bg-slate-900 border border-[#111111] dark:border-slate-700 text-[#ffffff] dark:text-slate-100 text-xs font-mono px-4 py-3 rounded-sm shadow-sm flex items-center space-x-2.5 animate-fadeIn max-w-[90vw]">
          <CheckCircle2 className="w-4 h-4 text-[#ffffff] dark:text-slate-100 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
