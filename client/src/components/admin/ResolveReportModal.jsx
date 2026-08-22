import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Camera, 
  FileText, 
  AlertCircle, 
  Loader2, 
  Clock, 
  MapPin, 
  User,
  Sparkles
} from 'lucide-react';
import { ReportsAPI } from '../../services/api';

export const ResolveReportModal = ({ isOpen, onClose, report, onResolved }) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (report && isOpen) {
      setAdminNotes(report.admin_notes || '');
      setSelectedFile(null);
      setPreviewUrl(null);
      setErrorMessage(null);
    }
  }, [report, isOpen]);

  if (!isOpen || !report) return null;

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

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      let finalPhotoUrls = Array.isArray(report.photo_urls) ? [...report.photo_urls] : [];

      // Si se adjunta nueva foto de resolución, subirla a Supabase Storage
      if (selectedFile) {
        try {
          const uploadRes = await ReportsAPI.uploadPhoto(selectedFile);
          const uploadedUrl = uploadRes.data?.data?.url;
          if (uploadedUrl) {
            finalPhotoUrls.push(uploadedUrl);
          }
        } catch (uploadErr) {
          console.error('Error al subir foto de evidencia final:', uploadErr);
          setErrorMessage(
            uploadErr.response?.data?.message || uploadErr.message || 'No se pudo subir la fotografía de evidencia. Verifica el formato o tamaño e intenta de nuevo.'
          );
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        status: 'RESUELTO',
        admin_notes: adminNotes.trim() || 'Incidencia resuelta y verificada por personal de Servicios Urbanos.',
        photo_urls: finalPhotoUrls
      };

      const response = await ReportsAPI.updateStatus(report.id, payload);
      const updated = response.data?.data || {
        ...report,
        ...payload,
        resolved_at: new Date().toISOString()
      };

      if (onResolved) {
        onResolved(updated);
      }
      onClose();
    } catch (err) {
      console.error('Error al resolver denuncia:', err);
      setErrorMessage(err.response?.data?.message || 'Error al marcar la denuncia como resuelta.');
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
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Cierre y Resolución de Denuncia</span>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {report.ticket_number}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Pasa el estado a "RESUELTO" y registra la evidencia final</p>
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
            </div>
            <div className="flex items-center space-x-1 text-[11px] text-slate-400">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {report.created_at ? new Date(report.created_at).toLocaleDateString('es-PY') : 'Hoy'}
              </span>
            </div>
          </div>

          <p className="text-slate-300 line-clamp-2">
            "{report.description}"
          </p>

          <div className="flex items-center space-x-1.5 text-slate-400 pt-1 border-t border-slate-700/40 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{report.address_reference || 'Asunción'}</span>
          </div>
        </div>

        {/* Formulario de Resolución */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Notas de Cierre / Trabajo Realizado */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notas de Cierre y Detalle de Trabajo Realizado *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ej: Se completó la limpieza del vertedero clandestino. Área despejada y desinfectada por la cuadrilla municipal..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Adjuntar Fotografía de Evidencia de Limpieza */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Evidencia Fotográfica de Resolución (Opcional)
            </label>
            <div className="flex items-center space-x-3">
              <label className="flex-1 flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl cursor-pointer bg-slate-800/40 hover:bg-slate-800/80 transition">
                <Camera className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs text-slate-300 font-medium">Adjuntar Foto de Trabajo Concluido</span>
                <span className="text-[10px] text-slate-500">JPG, PNG, WEBP o HEIC (Máx 8 MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {previewUrl && (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                  <img src={previewUrl} alt="Vista previa resolución" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-1 right-1 bg-slate-950/80 text-white p-0.5 rounded-full hover:bg-rose-600 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
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
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-lg shadow-emerald-900/30 flex items-center space-x-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Marcar como RESUELTO</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResolveReportModal;
