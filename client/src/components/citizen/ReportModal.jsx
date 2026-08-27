import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Camera,
  MapPin,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  ChevronDown,
  Check
} from 'lucide-react';
import { uploadReportPhoto } from '../../services/supabase';
import { ReportsAPI } from '../../services/api';
import { useGeolocation } from '../../hooks/useGeolocation';
import { BARRIOS_ASUNCION_GEOJSON } from '../../data/barriosAsuncionGeoJSON';
import { getBarrioSchedule, normalizeBarrioName } from '../../data/barrioScheduleMap';

export const ReportModal = ({ isOpen, onClose, onReportCreated, initialBarrio = null }) => {
  const { coordinates, loading: geoLoading, getPosition } = useGeolocation();

  // Lista consolidada y ordenada de todos los barrios oficiales de Asunción
  const allBarrios = useMemo(() => {
    const features = BARRIOS_ASUNCION_GEOJSON?.features || [];
    const list = features.map((f) => {
      const p = f.properties || {};
      const schedule = getBarrioSchedule(p);
      const coords = f.geometry?.coordinates[0] || [];
      const centerLat = coords.reduce((acc, c) => acc + c[1], 0) / (coords.length || 1);
      const centerLng = coords.reduce((acc, c) => acc + c[0], 0) / (coords.length || 1);

      return {
        id: p.id || schedule.name,
        name: schedule.name || p.barrio,
        shift: schedule.shift,
        shiftHours: schedule.shiftHours,
        groupLabel: schedule.groupLabel,
        zone: schedule.zone || p.zona,
        center: [centerLat, centerLng]
      };
    });

    // Eliminar duplicados y ordenar alfabéticamente
    const unique = [];
    const seen = new Set();
    list.forEach(b => {
      if (!seen.has(b.name)) {
        seen.add(b.name);
        unique.push(b);
      }
    });

    return unique.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const [formData, setFormData] = useState({
    citizen_name: '',
    citizen_phone: '',
    citizen_email: '',
    category: 'VERTEDERO_CLANDESTINO',
    description: '',
    barrio: '',
    address_reference: '',
    latitude: coordinates.lat,
    longitude: coordinates.lng
  });

  // Estado del combobox / buscador de barrios
  const [barrioSearchQuery, setBarrioSearchQuery] = useState('');
  const [isBarrioDropdownOpen, setIsBarrioDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Auto-cargar el barrio si el usuario hizo clic en "Reportar Basura en [Barrio]" desde el mapa
  useEffect(() => {
    if (initialBarrio && isOpen) {
      const barrioName = initialBarrio.name || initialBarrio.barrio || '';
      const matched = allBarrios.find(b => normalizeBarrioName(b.name) === normalizeBarrioName(barrioName)) || initialBarrio;

      setFormData(prev => ({
        ...prev,
        barrio: matched.name || barrioName,
        address_reference: prev.address_reference ? prev.address_reference : `Barrio ${matched.name || barrioName}`,
        latitude: matched.center ? matched.center[0] : prev.latitude,
        longitude: matched.center ? matched.center[1] : prev.longitude
      }));
      setBarrioSearchQuery('');
    }
  }, [initialBarrio, isOpen, allBarrios]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsBarrioDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Filtrado reactivo de barrios en tiempo real según lo que escribe el usuario
  const filteredBarrios = allBarrios.filter(b => {
    if (!barrioSearchQuery.trim()) return true;
    const q = normalizeBarrioName(barrioSearchQuery);
    const bName = normalizeBarrioName(b.name);
    const bZone = normalizeBarrioName(b.zone || '');
    return bName.includes(q) || bZone.includes(q);
  });

  const handleSelectBarrio = (barrioObj) => {
    setFormData(prev => ({
      ...prev,
      barrio: barrioObj.name,
      address_reference: prev.address_reference && !prev.address_reference.startsWith('Barrio ')
        ? prev.address_reference
        : `Barrio ${barrioObj.name}`,
      latitude: barrioObj.center ? barrioObj.center[0] : prev.latitude,
      longitude: barrioObj.center ? barrioObj.center[1] : prev.longitude
    }));
    setIsBarrioDropdownOpen(false);
    setBarrioSearchQuery('');
  };

  const handleClearBarrio = (e) => {
    e.stopPropagation();
    setFormData(prev => ({ ...prev, barrio: '' }));
    setBarrioSearchQuery('');
  };

  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
  const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('El archivo excede el tamaño máximo permitido de 8MB.');
      e.target.value = '';
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    const ext = '.' + (file.name ? file.name.split('.').pop().toLowerCase() : '');
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type?.toLowerCase());
    const isExtValid = ALLOWED_EXTS.includes(ext);

    if (!isMimeValid && !isExtValid) {
      setErrorMessage('Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG, WEBP o HEIC.');
      e.target.value = '';
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUseCurrentLocation = () => {
    getPosition();
    setFormData(prev => ({
      ...prev,
      latitude: coordinates.lat,
      longitude: coordinates.lng
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      let photoUrls = [];
      if (selectedFile) {
        try {
          const uploadedUrl = await uploadReportPhoto(selectedFile);
          if (uploadedUrl) {
            photoUrls.push(uploadedUrl);
          }
        } catch (storageErr) {
          console.error('Error al subir imagen de evidencia:', storageErr);
          setErrorMessage(
            storageErr.message || 'No se pudo subir la fotografía adjunta. Verifica el formato o tamaño e intenta nuevamente.'
          );
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        ...formData,
        latitude: formData.latitude !== undefined && formData.latitude !== null ? formData.latitude : coordinates.lat,
        longitude: formData.longitude !== undefined && formData.longitude !== null ? formData.longitude : coordinates.lng,
        photo_urls: photoUrls
      };

      const response = await ReportsAPI.create(payload);
      const created = response.data?.data;
      console.log('[DEBUG Frontend ReportModal] Created report response from POST /api/reports:', JSON.stringify(created, null, 2));

      setCreatedTicket(created?.ticket_number || `ASU-${Date.now().toString().slice(-6)}`);
      if (onReportCreated) onReportCreated(created);
    } catch (err) {
      console.error('Error al registrar denuncia:', err);
      setErrorMessage(
        err.response?.data?.message || 'Error al enviar la denuncia. Verifica la conexión con el servidor.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setCreatedTicket(null);
    setErrorMessage(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setBarrioSearchQuery('');
    setIsBarrioDropdownOpen(false);
    setFormData({
      citizen_name: '',
      citizen_phone: '',
      citizen_email: '',
      category: 'VERTEDERO_CLANDESTINO',
      description: '',
      barrio: '',
      address_reference: '',
      latitude: coordinates.lat,
      longitude: coordinates.lng
    });
    onClose();
  };

  const selectedBarrioData = allBarrios.find(b => b.name === formData.barrio);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#111111]/75 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#ffffff] dark:bg-slate-950 border border-[#111111] dark:border-slate-700 rounded-sm shadow-sm p-6 overflow-hidden space-y-4 text-[#111111] dark:text-slate-100">

        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5] dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-red-500/10 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-500/20 rounded-sm">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100">Denuncia Ciudadana</h2>
              <p className="text-xs text-[#666666] dark:text-slate-400 font-light">Reporta vertederos o incidencias de recolección en Asunción</p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 rounded-sm hover:bg-[#f5f5f5] dark:hover:bg-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal de Confirmación / Ticket generado */}
        {createdTicket ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-[#f5f5f5] dark:bg-slate-900 text-[#111111] dark:text-slate-100 rounded-sm flex items-center justify-center border border-[#e5e5e5] dark:border-slate-800">
              <CheckCircle className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100">Denuncia Registrada</h3>
              <p className="text-xs text-[#666666] dark:text-slate-400 font-light mt-1">
                Tu reporte ha sido incorporado al sistema operativo de la Municipalidad de Asunción.
              </p>
            </div>
            <div className="p-4 bg-[#f5f5f5] dark:bg-slate-900 rounded-sm border border-[#e5e5e5] dark:border-slate-800 inline-block">
              <span className="text-[10px] text-[#666666] dark:text-slate-400 uppercase font-mono tracking-wider block">Código de Seguimiento (Ticket)</span>
              <span className="text-lg font-mono font-bold text-[#111111] dark:text-slate-100">{createdTicket}</span>
            </div>
            <div className="pt-2">
              <button
                onClick={resetAndClose}
                className="w-full bg-[#111111] hover:opacity-80 dark:bg-slate-100 dark:text-slate-950 text-[#fafafa] font-medium py-2.5 rounded-sm transition-colors text-xs font-mono uppercase tracking-wider"
              >
                Aceptar y Volver al Mapa
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de Denuncia */
          <form onSubmit={handleSubmit} className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1 text-xs">
            {errorMessage && (
              <div className="p-2.5 bg-red-500/10 dark:bg-red-950/40 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-sm flex items-center space-x-2 font-mono">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Categoría de Incidente */}
            <div>
              <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">Tipo de Incidencia *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 text-xs rounded-sm p-2.5 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-mono"
              >
                <option value="VERTEDERO_CLANDESTINO">Vertedero Clandestino en Vía Pública</option>
                <option value="RECOLECCION_PENDIENTE">Basura no recolectada en fecha fijada</option>
                <option value="CONTENEDOR_DANADO">Contenedor municipal dañado o desbordado</option>
                <option value="OTROS">Otro reclamo operativo</option>
              </select>
            </div>

            {/* Selección de Barrio Oficial con Buscador Autocomplete */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">
                Barrio de Asunción *
              </label>

              {/* Botón / Input disparador del Combobox */}
              <div
                onClick={() => setIsBarrioDropdownOpen(prev => !prev)}
                className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 text-xs rounded-sm p-2.5 flex items-center justify-between cursor-pointer focus:border-[#111111] dark:focus:border-slate-500"
              >
                {formData.barrio ? (
                  <div className="flex items-center space-x-2 truncate">
                    <span className="font-bold text-[#111111] dark:text-slate-100 truncate">{formData.barrio}</span>
                    {selectedBarrioData && (
                      <span className="text-[10px] text-[#666666] dark:text-slate-400 font-mono">
                        ({selectedBarrioData.shift})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[#999999] dark:text-slate-500">Buscar o seleccionar barrio ({allBarrios.length} disponibles)...</span>
                )}

                <div className="flex items-center space-x-1.5 ml-2">
                  {formData.barrio && (
                    <button
                      type="button"
                      onClick={handleClearBarrio}
                      className="p-0.5 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 rounded-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-[#666666] dark:text-slate-400 transition-transform ${isBarrioDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Menú Desplegable con Campo de Búsqueda */}
              {isBarrioDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#ffffff] dark:bg-slate-900 border border-[#111111] dark:border-slate-700 rounded-sm shadow-sm overflow-hidden animate-fadeIn">
                  {/* Input de Búsqueda */}
                  <div className="p-2 border-b border-[#e5e5e5] dark:border-slate-800 flex items-center space-x-2 bg-[#f5f5f5] dark:bg-slate-800">
                    <Search className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400 shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Escribe el nombre del barrio..."
                      value={barrioSearchQuery}
                      onChange={(e) => setBarrioSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-transparent text-xs text-[#111111] dark:text-slate-100 placeholder:text-[#999999] dark:placeholder:text-slate-500 focus:outline-none"
                    />
                    {barrioSearchQuery && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBarrioSearchQuery('');
                        }}
                        className="text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Lista de Opciones Filtradas */}
                  <div className="max-h-48 overflow-y-auto divide-y divide-[#e5e5e5] dark:divide-slate-800">
                    {filteredBarrios.length === 0 ? (
                      <div className="p-3 text-center text-xs text-[#999999] dark:text-slate-500 font-mono">
                        No se encontró ningún barrio con ese nombre.
                      </div>
                    ) : (
                      filteredBarrios.map((b) => {
                        const isSelected = formData.barrio === b.name;
                        return (
                          <div
                            key={b.id}
                            onClick={() => handleSelectBarrio(b)}
                            className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${isSelected
                                ? 'bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-slate-950 font-bold'
                                : 'text-[#333333] dark:text-slate-200 hover:bg-[#f5f5f5] dark:hover:bg-slate-800'
                              }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span>{b.name}</span>
                              <span className={`text-[10px] ${isSelected ? 'text-[#cccccc] dark:text-slate-600' : 'text-[#666666] dark:text-slate-400'}`}>({b.zone})</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${isSelected ? 'bg-[#333333] dark:bg-slate-300 text-[#ffffff] dark:text-slate-900' : 'bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-100'}`}>
                                {b.shift}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#ffffff] dark:text-slate-950" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Descripción detallada */}
            <div>
              <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">Descripción del Problema *</label>
              <textarea
                required
                rows={3}
                placeholder="Describe la situación (ej: Gran acumulación de ramas y basura sobre la acera...)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 text-xs rounded-sm p-2.5 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none"
              />
            </div>

            {/* Dirección / Referencia */}
            <div>
              <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">Dirección o Referencia</label>
              <input
                type="text"
                placeholder="Ej: Av. Fernando de la Mora y Bartolomé de las Casas"
                value={formData.address_reference}
                onChange={(e) => setFormData({ ...formData, address_reference: e.target.value })}
                className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 text-xs rounded-sm px-3 py-2 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none"
              />
            </div>

            {/* Geolocalización GPS */}
            <div className="p-3 bg-[#f5f5f5] dark:bg-slate-900 rounded-sm border border-[#e5e5e5] dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs text-[#111111] dark:text-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-[#111111] dark:text-slate-100" />
                  <span className="font-mono text-[11px] uppercase">Ubicación GPS:</span>
                </div>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={geoLoading}
                  className="text-xs font-mono text-[#111111] dark:text-slate-100 hover:underline flex items-center space-x-1"
                >
                  {geoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  <span>Auto-detectar GPS</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#666666] dark:text-slate-400">
                <div className="bg-[#ffffff] dark:bg-slate-800 px-2 py-1 rounded-sm border border-[#e5e5e5] dark:border-slate-700 text-[#111111] dark:text-slate-200">
                  Lat: {formData.latitude !== undefined && formData.latitude !== null ? formData.latitude.toFixed(5) : coordinates.lat.toFixed(5)}
                </div>
                <div className="bg-[#ffffff] dark:bg-slate-800 px-2 py-1 rounded-sm border border-[#e5e5e5] dark:border-slate-700 text-[#111111] dark:text-slate-200">
                  Lng: {formData.longitude !== undefined && formData.longitude !== null ? formData.longitude.toFixed(5) : coordinates.lng.toFixed(5)}
                </div>
              </div>
            </div>

            {/* Fotografía de Evidencia */}
            <div>
              <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">
                Foto de Evidencia (Opcional)
              </label>
              <div className="flex items-center space-x-3">
                <label className="flex-1 flex flex-col items-center justify-center p-3 border border-dashed border-[#cccccc] dark:border-slate-700 hover:border-[#111111] dark:hover:border-slate-500 rounded-sm cursor-pointer bg-[#fafafa] dark:bg-slate-900 hover:bg-[#f5f5f5] dark:hover:bg-slate-800 transition-colors">
                  <Camera className="w-4 h-4 text-[#666666] dark:text-slate-400 mb-1" />
                  <span className="text-xs text-[#111111] dark:text-slate-200 font-medium">Adjuntar Foto o Tomar con Cámara</span>
                  <span className="text-[10px] text-[#999999] dark:text-slate-500 font-mono">JPG, PNG, WEBP o HEIC (Máx 8 MB)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {previewUrl && (
                  <div className="relative w-16 h-16 rounded-sm overflow-hidden border border-[#cccccc] dark:border-slate-700 shrink-0">
                    <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-1 right-1 bg-[#111111] dark:bg-slate-800 text-[#ffffff] p-0.5 rounded-sm hover:opacity-80 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Datos de Contacto (Opcionales) */}
            <div className="pt-2 border-t border-[#e5e5e5] dark:border-slate-800 space-y-2">
              <p className="text-[11px] text-[#666666] dark:text-slate-400 font-mono uppercase">Datos de Contacto (Opcionales)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    placeholder="Tu nombre completo"
                    value={formData.citizen_name}
                    onChange={(e) => setFormData({ ...formData, citizen_name: e.target.value })}
                    className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 text-xs rounded-sm px-3 py-1.5 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Celular (ej: 0981 123456)"
                    value={formData.citizen_phone}
                    onChange={(e) => setFormData({ ...formData, citizen_phone: e.target.value })}
                    className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 text-xs rounded-sm px-3 py-1.5 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Botón de Envío */}
            <div className="pt-2 border-t border-[#e5e5e5] dark:border-slate-800">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-sm transition-colors text-xs font-mono uppercase tracking-wider shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando denuncia...</span>
                  </>
                ) : (
                  <span>Enviar Denuncia Oficial</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
