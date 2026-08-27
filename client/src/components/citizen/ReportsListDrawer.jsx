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
  ChevronRight
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
  if (diffHour < 24) return `hace ${diffHour} hs`;
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
 * Obtiene el ícono monocromático correspondiente a la categoría de la denuncia
 */
function getCategoryVisuals(category) {
  switch (category) {
    case 'VERTEDERO_CLANDESTINO':
      return { icon: <Trash2 className="w-3.5 h-3.5" /> };
    case 'RECOLECCION_PENDIENTE':
      return { icon: <Clock className="w-3.5 h-3.5" /> };
    case 'CONTENEDOR_DANADO':
      return { icon: <Package className="w-3.5 h-3.5" /> };
    default:
      return { icon: <AlertTriangle className="w-3.5 h-3.5" /> };
  }
}

/**
 * Componente Drawer Colapsable para listar denuncias ciudadanas activas (Monochrome)
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
          className="md:hidden fixed inset-0 bg-[#111111]/50 z-[1040] transition-opacity"
        />
      )}

      {/* Panel Deslizable Lateral (Izquierda) */}
      <aside
        className={`absolute top-0 left-0 bottom-0 z-[1050] w-80 sm:w-96 max-w-[85vw] bg-[#ffffff] dark:bg-slate-950 border-r border-[#111111] dark:border-slate-800 shadow-sm flex flex-col transition-transform duration-300 ease-in-out text-[#111111] dark:text-slate-100 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Cabecera del Drawer */}
        <div className="p-3.5 border-b border-[#e5e5e5] dark:border-slate-800 flex items-center justify-between bg-[#f5f5f5] dark:bg-slate-900">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-red-500/10 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-sm border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100">Denuncias Activas</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-red-500/10 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-500/20 font-bold">
                  {activeReports.length}
                </span>
              </div>
              <p className="text-[10px] text-[#666666] dark:text-slate-400">Puntos de atención ciudadana</p>
            </div>
          </div>

          <button
            onClick={onToggle}
            className="p-1 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 rounded-sm hover:bg-[#e5e5e5] dark:hover:bg-slate-800 transition-colors"
            title="Cerrar panel de denuncias"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Buscador y Filtros Rápidos */}
        <div className="p-3 border-b border-[#e5e5e5] dark:border-slate-800 space-y-2 bg-[#ffffff] dark:bg-slate-950">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar por calle, ticket..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-[#ffffff] dark:bg-slate-900 text-[#111111] dark:text-slate-100 text-xs rounded-sm pl-8 pr-7 py-1.5 border border-[#cccccc] dark:border-slate-700 focus:outline-none focus:border-[#111111] dark:focus:border-slate-500 placeholder:text-[#999999] dark:placeholder:text-slate-500 font-mono"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Mini Filtros de Categoría */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 text-[10px] font-mono">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-2 py-0.5 rounded-sm transition-colors whitespace-nowrap ${categoryFilter === 'ALL'
                  ? 'bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-slate-950 font-medium'
                  : 'bg-[#f5f5f5] dark:bg-slate-900 text-[#666666] dark:text-slate-400 border border-[#e5e5e5] dark:border-slate-800 hover:text-[#111111] dark:hover:text-slate-200'
                }`}
            >
              Todas ({activeReports.length})
            </button>
            <button
              onClick={() => setCategoryFilter('VERTEDERO_CLANDESTINO')}
              className={`px-2 py-0.5 rounded-sm transition-colors whitespace-nowrap ${categoryFilter === 'VERTEDERO_CLANDESTINO'
                  ? 'bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-slate-950 font-medium'
                  : 'bg-[#f5f5f5] dark:bg-slate-900 text-[#666666] dark:text-slate-400 border border-[#e5e5e5] dark:border-slate-800 hover:text-[#111111] dark:hover:text-slate-200'
                }`}
            >
              Vertederos
            </button>
            <button
              onClick={() => setCategoryFilter('RECOLECCION_PENDIENTE')}
              className={`px-2 py-0.5 rounded-sm transition-colors whitespace-nowrap ${categoryFilter === 'RECOLECCION_PENDIENTE'
                  ? 'bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-slate-950 font-medium'
                  : 'bg-[#f5f5f5] dark:bg-slate-900 text-[#666666] dark:text-slate-400 border border-[#e5e5e5] dark:border-slate-800 hover:text-[#111111] dark:hover:text-slate-200'
                }`}
            >
              Recolección
            </button>
            <button
              onClick={() => setCategoryFilter('CONTENEDOR_DANADO')}
              className={`px-2 py-0.5 rounded-sm transition-colors whitespace-nowrap ${categoryFilter === 'CONTENEDOR_DANADO'
                  ? 'bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-slate-950 font-medium'
                  : 'bg-[#f5f5f5] dark:bg-slate-900 text-[#666666] dark:text-slate-400 border border-[#e5e5e5] dark:border-slate-800 hover:text-[#111111] dark:hover:text-slate-200'
                }`}
            >
              Contenedores
            </button>
          </div>
        </div>

        {/* Lista de Tarjetas de Denuncias */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {displayedReports.length > 0 ? (
            displayedReports.map((report) => {
              const visuals = getCategoryVisuals(report.category);
              const relativeTime = getRelativeTimeString(report.created_at);
              const hasPhotos = report.photo_urls && report.photo_urls.length > 0;

              return (
                <div
                  key={report.id || report.ticket_number}
                  onClick={() => onSelectReport && onSelectReport(report)}
                  className="p-3 rounded-sm bg-[#ffffff] dark:bg-slate-900/80 border border-[#e5e5e5] dark:border-slate-800 hover:bg-[#fafafa] dark:hover:bg-slate-850 hover:border-[#111111] dark:hover:border-slate-600 transition-colors cursor-pointer space-y-2 text-[#111111] dark:text-slate-100"
                >
                  {/* Fila 1: Categoría, Ticket y Badge de Estado */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-sm border border-[#e5e5e5] dark:border-slate-700 bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-100">
                        {visuals.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#111111] dark:text-slate-100 line-clamp-1">
                          {formatCategory(report.category)}
                        </h4>
                        <span className="text-[10px] font-mono text-[#666666] dark:text-slate-400 block">
                          {report.ticket_number || 'DEN-ASU'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm ${report.status === 'EN_PROCESO'
                            ? 'bg-[#e5e5e5] dark:bg-slate-800 text-[#111111] dark:text-slate-200'
                            : 'border border-[#111111] dark:border-slate-600 text-[#111111] dark:text-slate-200 bg-transparent'
                          }`}
                      >
                        {report.status}
                      </span>
                      <span className="text-[10px] text-[#999999] dark:text-slate-500 font-mono mt-0.5 flex items-center space-x-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{relativeTime}</span>
                      </span>
                    </div>
                  </div>

                  {/* Descripción */}
                  <p className="text-xs text-[#333333] dark:text-slate-300 line-clamp-2 leading-relaxed bg-[#f5f5f5] dark:bg-slate-950 p-2 rounded-sm border border-[#e5e5e5] dark:border-slate-800">
                    {report.description || 'Sin descripción adicional.'}
                  </p>

                  {/* Ubicación / Referencia & Indicador de Fotos */}
                  <div className="flex items-center justify-between pt-0.5 text-[10px] font-mono text-[#666666] dark:text-slate-400">
                    <div className="flex items-center space-x-1.5 min-w-0 pr-2">
                      <MapPin className="w-3 h-3 text-[#111111] dark:text-slate-200 shrink-0" />
                      <span className="truncate">
                        {report.address_reference || 'Asunción'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {hasPhotos && (
                        <span className="flex items-center space-x-1 text-[9px] font-mono text-[#111111] dark:text-slate-100 bg-[#f5f5f5] dark:bg-slate-800 border border-[#e5e5e5] dark:border-slate-700 px-1 py-0.5 rounded-sm">
                          <Camera className="w-2.5 h-2.5" />
                          <span>{report.photo_urls.length}</span>
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400" />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full min-h-[240px] flex flex-col items-center justify-center p-6 text-center text-[#666666] dark:text-slate-400 space-y-2">
              <div className="p-2.5 bg-[#f5f5f5] dark:bg-slate-900 rounded-sm border border-[#e5e5e5] dark:border-slate-800 text-[#111111] dark:text-slate-100">
                <CheckCircle2 className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[#111111] dark:text-slate-100">
                  {filterQuery ? 'Sin resultados' : 'Sin denuncias activas'}
                </p>
                <p className="text-[11px] text-[#666666] dark:text-slate-400 mt-0.5 font-light">
                  {filterQuery
                    ? 'Prueba con otros términos de búsqueda.'
                    : 'Todas las incidencias reportadas han sido atendidas.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Drawer */}
        <div className="p-2.5 border-t border-[#e5e5e5] dark:border-slate-800 bg-[#f5f5f5] dark:bg-slate-900 flex items-center justify-between text-[10px] font-mono text-[#666666] dark:text-slate-400">
          <span>Monitoreo Activo</span>
          <span>{displayedReports.length} de {activeReports.length}</span>
        </div>
      </aside>
    </>
  );
};

export default ReportsListDrawer;
