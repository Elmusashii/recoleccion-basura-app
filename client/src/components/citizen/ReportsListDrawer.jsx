import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  X, 
  Search, 
  Camera, 
  Trash2, 
  Package, 
  CheckCircle2, 
  ChevronRight,
  ListFilter,
  Layers
} from 'lucide-react';

/**
 * Calcula el tiempo relativo en español con JavaScript puro
 */
function getRelativeTimeString(dateString) {
  if (!dateString) return 'reciente';
  const now = Date.now();
  const past = new Date(dateString).getTime();
  if (isNaN(past)) return 'reciente';

  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHour === 1) return 'hace 1 hora';
  if (diffHour < 24) return `hace ${diffHour} horas`;
  if (diffDay === 1) return 'hace 1 día';
  if (diffDay < 7) return `hace ${diffDay} días`;
  
  const diffWeeks = Math.floor(diffDay / 7);
  if (diffWeeks === 1) return 'hace 1 sem';
  if (diffWeeks < 4) return `hace ${diffWeeks} sem`;

  const dateObj = new Date(dateString);
  return dateObj.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' });
}

/**
 * Formatea el nombre de la categoría para presentación amigable
 */
function formatCategory(category) {
  if (!category) return 'Denuncia Ciudadana';
  const mapping = {
    'VERTEDERO_CLANDESTINO': 'Vertedero Clandestino',
    'RECOLECCION_PENDIENTE': 'Recolección Pendiente',
    'CONTENEDOR_DANADO': 'Contenedor Dañado'
  };
  if (mapping[category]) return mapping[category];
  return category
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Obtiene el ícono y color correspondiente a la categoría de la denuncia
 */
function getCategoryVisuals(category) {
  switch (category) {
    case 'VERTEDERO_CLANDESTINO':
      return {
        icon: <Trash2 className="w-4 h-4" />,
        badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        cardBorder: 'hover:border-rose-500/40'
      };
    case 'RECOLECCION_PENDIENTE':
      return {
        icon: <Clock className="w-4 h-4" />,
        badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        cardBorder: 'hover:border-amber-500/40'
      };
    case 'CONTENEDOR_DANADO':
      return {
        icon: <Package className="w-4 h-4" />,
        badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        cardBorder: 'hover:border-purple-500/40'
      };
    default:
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        cardBorder: 'hover:border-rose-500/40'
      };
  }
}

/**
 * Componente Drawer Colapsable para listar denuncias ciudadanas activas
 */
export const ReportsListDrawer = ({ 
  reports = [], 
  onSelectReport, 
  isOpen, 
  onToggle 
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Filtrar solo activas (excluye RESUELTO y RECHAZADO) y ordenar descendente por fecha
  const activeReports = useMemo(() => {
    return (reports || [])
      .filter(r => r && r.status !== 'RESUELTO' && r.status !== 'RECHAZADO')
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [reports]);

  // Filtro interno por búsqueda o categoría
  const displayedReports = useMemo(() => {
    return activeReports.filter(r => {
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        const desc = (r.description || '').toLowerCase();
        const addr = (r.address_reference || '').toLowerCase();
        const tkt = (r.ticket_number || '').toLowerCase();
        const cat = (r.category || '').toLowerCase();
        if (!desc.includes(q) && !addr.includes(q) && !tkt.includes(q) && !cat.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [activeReports, filterQuery, categoryFilter]);

  return (
    <>
      {/* Backdrop para mobile cuando el drawer está abierto */}
      {isOpen && (
        <div 
          onClick={onToggle}
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-xs z-[1040] transition-opacity"
        />
      )}

      {/* Panel Deslizable Lateral (Izquierda) */}
      <aside
        className={`absolute top-0 left-0 bottom-0 z-[1050] w-80 sm:w-96 max-w-[85vw] bg-slate-900/95 backdrop-blur-md border-r border-slate-700/60 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out font-sans ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabecera del Drawer */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white">Denuncias Activas</h3>
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {activeReports.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Puntos de atención ciudadana en Asunción</p>
            </div>
          </div>

          <button
            onClick={onToggle}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="Cerrar panel de denuncias"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Buscador y Filtros Rápidos */}
        <div className="p-3 border-b border-slate-800/80 space-y-2 bg-slate-900/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar por calle, ticket o detalle..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-slate-800/90 text-slate-100 text-xs rounded-xl pl-8 pr-7 py-1.5 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Mini Filtros de Categoría */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 text-[10px] custom-scrollbar">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-2 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                categoryFilter === 'ALL'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas ({activeReports.length})
            </button>
            <button
              onClick={() => setCategoryFilter('VERTEDERO_CLANDESTINO')}
              className={`px-2 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                categoryFilter === 'VERTEDERO_CLANDESTINO'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-slate-800/70 text-slate-400 hover:text-rose-300'
              }`}
            >
              Vertederos
            </button>
            <button
              onClick={() => setCategoryFilter('RECOLECCION_PENDIENTE')}
              className={`px-2 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                categoryFilter === 'RECOLECCION_PENDIENTE'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-slate-800/70 text-slate-400 hover:text-amber-300'
              }`}
            >
              Recolección
            </button>
            <button
              onClick={() => setCategoryFilter('CONTENEDOR_DANADO')}
              className={`px-2 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                categoryFilter === 'CONTENEDOR_DANADO'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-slate-800/70 text-slate-400 hover:text-purple-300'
              }`}
            >
              Contenedores
            </button>
          </div>
        </div>

        {/* Lista de Tarjetas de Denuncias */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
          {displayedReports.length > 0 ? (
            displayedReports.map((report) => {
              const visuals = getCategoryVisuals(report.category);
              const relativeTime = getRelativeTimeString(report.created_at);
              const hasPhotos = report.photo_urls && report.photo_urls.length > 0;

              return (
                <div
                  key={report.id || report.ticket_number}
                  onClick={() => onSelectReport && onSelectReport(report)}
                  className={`group p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 hover:shadow-lg transition-all duration-200 cursor-pointer space-y-2 relative overflow-hidden ${visuals.cardBorder}`}
                >
                  {/* Fila 1: Categoría, Ticket y Badge de Estado */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg border ${visuals.badgeBg}`}>
                        {visuals.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-400 transition-colors line-clamp-1">
                          {formatCategory(report.category)}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 font-semibold block">
                          {report.ticket_number || 'DEN-ASU'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                          report.status === 'EN_PROCESO'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {report.status}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{relativeTime}</span>
                      </span>
                    </div>
                  </div>

                  {/* Descripción */}
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-900/40 p-2 rounded-xl border border-slate-800/80">
                    {report.description || 'Sin descripción adicional.'}
                  </p>

                  {/* Ubicación / Referencia & Indicador de Fotos */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                    <div className="flex items-center space-x-1.5 min-w-0 pr-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">
                        {report.address_reference || 'Asunción'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {hasPhotos && (
                        <span className="flex items-center space-x-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                          <Camera className="w-3 h-3" />
                          <span>{report.photo_urls.length}</span>
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
              <div className="p-3 bg-slate-800 rounded-full border border-slate-700 text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">
                  {filterQuery ? 'Sin resultados para la búsqueda' : 'No hay denuncias activas por el momento'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {filterQuery 
                    ? 'Prueba modificando los términos de búsqueda o los filtros de categoría.'
                    : 'Todas las incidencias han sido atendidas o no se registran reportes pendientes.'}
                </p>
              </div>
              {filterQuery && (
                <button
                  onClick={() => { setFilterQuery(''); setCategoryFilter('ALL'); }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pie del Drawer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Actualización en tiempo real</span>
          </span>
          <span className="font-mono text-slate-400">
            {displayedReports.length} de {activeReports.length}
          </span>
        </div>
      </aside>
    </>
  );
};

export default ReportsListDrawer;
