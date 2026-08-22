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
  Check, 
  Sparkles,
  Layers
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
        color: schedule.color,
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
      const schedule = getBarrioSchedule(barrioName);
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

    // Validación de tamaño (Máx 8MB)
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('El archivo excede el tamaño máximo permitido de 8MB.');
      e.target.value = '';
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validación de formato
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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Denuncia Ciudadana</h2>
              <p className="text-xs text-slate-400">Reporta vertederos o problemas de recolección en Asunción</p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal de Confirmación / Ticket generado */}
        {createdTicket ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">¡Denuncia Registrada con Éxito!</h3>
            <p className="text-sm text-slate-300">
              Tu denuncia ha sido incorporada al sistema de fiscalización municipal de Asunción.
            </p>
            <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 inline-block">
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Código de Seguimiento (Ticket)</span>
              <span className="text-lg font-mono font-bold text-emerald-400">{createdTicket}</span>
            </div>
            <div className="pt-2">
              <button
                onClick={resetAndClose}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition shadow-lg"
              >
                Aceptar y Volver al Mapa
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de Denuncia */
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Categoría de Incidente */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Incidencia *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="VERTEDERO_CLANDESTINO">⚠️ Vertedero Clandestino en Vía Pública</option>
                <option value="RECOLECCION_PENDIENTE">🚛 Basura no recolectada en fecha fijada</option>
                <option value="CONTENEDOR_DANADO">🗑️ Contenedor municipal dañado o desbordado</option>
                <option value="OTROS">📋 Otro reclamo municipal</option>
              </select>
            </div>

            {/* Selección de Barrio Oficial con Buscador Autocomplete */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Barrio de Asunción * <span className="text-[10px] text-slate-400 font-normal">(Selecciona o busca escribiendo)</span>
              </label>

              {/* Botón / Input disparador del Combobox */}
              <div
                onClick={() => setIsBarrioDropdownOpen(prev => !prev)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2.5 flex items-center justify-between cursor-pointer hover:border-slate-600 transition"
              >
                {formData.barrio ? (
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedBarrioData?.color || '#10b981' }} />
                    <span className="font-bold text-white truncate">{formData.barrio}</span>
                    {selectedBarrioData && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({selectedBarrioData.shift})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">Buscar o seleccionar barrio ({allBarrios.length} disponibles)...</span>
                )}

                <div className="flex items-center space-x-1.5 ml-2">
                  {formData.barrio && (
                    <button
                      type="button"
                      onClick={handleClearBarrio}
                      className="p-1 text-slate-400 hover:text-white rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isBarrioDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Menú Desplegable con Campo de Búsqueda */}
              {isBarrioDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fadeIn">
                  {/* Input de Búsqueda */}
                  <div className="p-2 border-b border-slate-700 flex items-center space-x-2 bg-slate-900/60">
                    <Search className="w-4 h-4 text-emerald-400 shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Escribe el nombre del barrio (ej: Villa Morra, Sajonia)..."
                      value={barrioSearchQuery}
                      onChange={(e) => setBarrioSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none"
                    />
                    {barrioSearchQuery && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBarrioSearchQuery('');
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Lista de Opciones Filtradas */}
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-700/50">
                    {filteredBarrios.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No se encontró ningún barrio con ese nombre.
                      </div>
                    ) : (
                      filteredBarrios.map((b) => {
                        const isSelected = formData.barrio === b.name;
                        return (
                          <div
                            key={b.id}
                            onClick={() => handleSelectBarrio(b)}
                            className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition ${
                              isSelected
                                ? 'bg-emerald-600/20 text-emerald-300 font-bold'
                                : 'text-slate-200 hover:bg-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                              <span>{b.name}</span>
                              <span className="text-[10px] text-slate-400">({b.zone})</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">
                                {b.shift}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción del Problema *</label>
              <textarea
                required
                rows={3}
                placeholder="Describe la situación (ej: Gran acumulación de ramas y basura sobre la acera...)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Dirección / Referencia */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Dirección o Referencia</label>
              <input
                type="text"
                placeholder="Ej: Av. Fernando de la Mora y Bartolomé de las Casas"
                value={formData.address_reference}
                onChange={(e) => setFormData({ ...formData, address_reference: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Geolocalización GPS */}
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-slate-300">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  <span>Ubicación GPS del Incidente:</span>
                </div>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={geoLoading}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1"
                >
                  {geoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Auto-detectar mi GPS</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
                <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  Lat: {formData.latitude !== undefined && formData.latitude !== null ? formData.latitude.toFixed(5) : coordinates.lat.toFixed(5)}
                </div>
                <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  Lng: {formData.longitude !== undefined && formData.longitude !== null ? formData.longitude.toFixed(5) : coordinates.lng.toFixed(5)}
                </div>
              </div>
            </div>

            {/* Fotografía de Evidencia */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Foto de Evidencia (Opcional pero Recomendado)
              </label>
              <div className="flex items-center space-x-3">
                <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl cursor-pointer bg-slate-800/40 hover:bg-slate-800/80 transition">
                  <Camera className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-300 font-medium">Adjuntar Foto o Tomar con Cámara</span>
                  <span className="text-[10px] text-slate-500">JPG, PNG, WEBP o HEIC (Máx 8 MB)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {previewUrl && (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                    <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-1 right-1 bg-slate-950/80 text-white p-0.5 rounded-full hover:bg-rose-600 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Datos de Contacto (Opcionales) */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <p className="text-[11px] text-slate-400 font-semibold">Tus Datos de Contacto (Opcionales para seguimiento)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    placeholder="Tu nombre completo"
                    value={formData.citizen_name}
                    onChange={(e) => setFormData({ ...formData, citizen_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Celular (ej: 0981 123456)"
                    value={formData.citizen_phone}
                    onChange={(e) => setFormData({ ...formData, citizen_phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Botón de Envío */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando denuncia a la Municipalidad...</span>
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
