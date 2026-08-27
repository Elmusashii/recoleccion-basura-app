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

      const reportIdentifier = report.id || report.ticket_number;
      const response = await ReportsAPI.updateStatus(reportIdentifier, payload);
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
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#111111]/70 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 border border-[#111111] dark:border-slate-700 rounded-sm shadow-sm p-5 overflow-hidden space-y-4 text-[#111111] dark:text-slate-100">

        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5] dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#f5f5f5] dark:bg-slate-900 text-[#111111] dark:text-slate-100 border border-[#e5e5e5] dark:border-slate-800 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100">Cierre y Resolución de Denuncia</h2>
                <span className="font-mono text-xs font-bold text-[#111111] dark:text-slate-200 border border-[#cccccc] dark:border-slate-700 px-2 py-0.5 rounded-sm bg-transparent">
                  {report.ticket_number}
                </span>
              </div>
              <p className="text-[11px] text-[#666666] dark:text-slate-400">Pasa el estado a "RESUELTO" y registra la evidencia final</p>
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
            </div>
            <div className="flex items-center space-x-1 text-[11px] text-[#666666] dark:text-slate-400 font-mono">
              <Clock className="w-3.5 h-3.5 text-[#111111] dark:text-slate-300" />
              <span>
                {report.created_at ? new Date(report.created_at).toLocaleDateString('es-PY') : 'Hoy'}
              </span>
            </div>
          </div>

          <p className="text-[#333333] dark:text-slate-300 line-clamp-2 text-[11px] font-light">
            "{report.description}"
          </p>

          <div className="flex items-center space-x-1.5 text-[#666666] dark:text-slate-400 pt-1 border-t border-[#e5e5e5] dark:border-slate-800 text-[11px] font-mono">
            <MapPin className="w-3.5 h-3.5 text-[#111111] dark:text-slate-300 shrink-0" />
            <span className="truncate">{report.address_reference || 'Asunción'}</span>
          </div>
        </div>

        {/* Formulario de Resolución */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {errorMessage && (
            <div className="p-2.5 bg-[#f5f5f5] dark:bg-slate-900 border border-[#111111] dark:border-slate-700 text-[#111111] dark:text-slate-200 text-xs rounded-sm flex items-center space-x-2 font-mono">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px]">{errorMessage}</span>
            </div>
          )}

          {/* Notas de Cierre / Trabajo Realizado */}
          <div>
            <label className="block text-xs font-mono text-[#666666] dark:text-slate-400 mb-1 uppercase">
              Notas de Cierre y Detalle de Trabajo Realizado *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ej: Se completó la limpieza del vertedero clandestino. Área despejada y desinfectada..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full bg-[#f5f5f5] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-800 text-[#111111] dark:text-slate-200 text-xs rounded-sm p-2.5 focus:outline-none focus:border-[#111111] dark:focus:border-slate-500 transition-colors font-mono"
            />
          </div>

          {/* Adjuntar Fotografía de Evidencia de Limpieza */}
          <div>
            <label className="block text-xs font-mono text-[#666666] dark:text-slate-400 mb-1 uppercase">
              Evidencia Fotográfica de Resolución (Opcional)
            </label>
            <div className="flex items-center space-x-3">
              <label className="flex-1 flex flex-col items-center justify-center p-3 border border-dashed border-[#cccccc] dark:border-slate-700 hover:border-[#111111] dark:hover:border-slate-500 rounded-sm cursor-pointer bg-[#f5f5f5] dark:bg-slate-900 transition-colors">
                <Camera className="w-4 h-4 text-[#666666] dark:text-slate-400 mb-1" />
                <span className="text-xs text-[#111111] dark:text-slate-200 font-medium">Adjuntar Foto de Trabajo Concluido</span>
                <span className="text-[10px] text-[#666666] dark:text-slate-400 font-mono">JPG, PNG, WEBP o HEIC (Máx 8 MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {previewUrl && (
                <div className="relative w-14 h-14 rounded-sm overflow-hidden border border-[#cccccc] dark:border-slate-700 shrink-0">
                  <img src={previewUrl} alt="Vista previa resolución" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-1 right-1 bg-[#111111]/80 text-white p-0.5 rounded-sm hover:bg-[#111111] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
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
