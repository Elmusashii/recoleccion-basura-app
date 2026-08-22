import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Truck, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { ReportsAPI } from '../../services/api';

/**
 * CitizenKpiBar - Barra de Métricas y KPIs en Tiempo Real para el Portal Ciudadano
 * 
 * @param {Object} props
 * @param {Array}  [props.reports] - Lista de denuncias
 * @param {Array}  [props.trucks] - Lista de camiones recolectores
 * @param {number} [props.totalBarrios] - Total oficial de barrios de Asunción (68)
 * @param {number} [props.matchedBarrios] - Cantidad de barrios activos en el mapa
 */
export const CitizenKpiBar = ({
  reports = [],
  trucks = [],
  totalBarrios = 68,
  matchedBarrios = 64
}) => {
  const [weeklyResolvedCount, setWeeklyResolvedCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Consulta de estadísticas de denuncias resueltas en los últimos 7 días
  useEffect(() => {
    let isMounted = true;
    
    ReportsAPI.getWeeklyStats()
      .then((res) => {
        if (isMounted) {
          const count = res.data?.count ?? res.data?.data?.count ?? 0;
          setWeeklyResolvedCount(count);
          setIsLoadingStats(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          // Fallback seguro calculando con las denuncias en memoria
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const fallbackCount = reports.filter(r => {
            if (r.status !== 'RESUELTO') return false;
            const resDate = r.resolved_at ? new Date(r.resolved_at) : new Date(r.created_at || Date.now());
            return resDate >= sevenDaysAgo;
          }).length;
          setWeeklyResolvedCount(fallbackCount);
          setIsLoadingStats(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reports]);

  // Cálculos reactivos de flota y denuncias
  const activeTrucksInRoute = trucks.filter(t => t.status === 'EN_RUTA' || t.status === 'En Ruta').length;
  const pendingReportsCount = reports.filter(r => r.status === 'PENDIENTE').length;

  return (
    <div className="flex md:grid md:grid-cols-2 2xl:grid-cols-4 gap-2 md:gap-2.5 w-full overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-1 md:pb-0 scrollbar-none [-webkit-overflow-scrolling:touch]">
      {/* KPI 1: Barrios Cubiertos */}
      <div className="glass-panel p-2 md:p-2.5 rounded-xl border border-slate-700/60 bg-slate-900/90 backdrop-blur-md flex items-center space-x-2 md:space-x-2.5 shadow-md shrink-0 snap-start w-[140px] sm:w-[160px] md:w-auto">
        <div className="p-1.5 md:p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
          <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] md:text-[10px] text-slate-400 font-medium truncate uppercase tracking-wider">Barrios</p>
          <p className="text-xs md:text-sm font-extrabold text-white font-mono leading-tight">
            <span className="text-emerald-400">{matchedBarrios}</span>
            <span className="text-slate-500 text-[10px] md:text-xs font-normal"> / {totalBarrios}</span>
          </p>
        </div>
      </div>

      {/* KPI 2: Camiones en Ruta */}
      <div className="glass-panel p-2 md:p-2.5 rounded-xl border border-slate-700/60 bg-slate-900/90 backdrop-blur-md flex items-center space-x-2 md:space-x-2.5 shadow-md shrink-0 snap-start w-[140px] sm:w-[160px] md:w-auto">
        <div className="p-1.5 md:p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 relative">
          <Truck className="w-3.5 h-3.5 md:w-4 md:h-4" />
          {activeTrucksInRoute > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[9px] md:text-[10px] text-slate-400 font-medium truncate uppercase tracking-wider">En ruta</p>
          <p className="text-xs md:text-sm font-extrabold text-blue-400 font-mono leading-tight">
            {activeTrucksInRoute} {activeTrucksInRoute === 1 ? 'unidad' : 'unidades'}
          </p>
        </div>
      </div>

      {/* KPI 3: Resueltas esta Semana */}
      <div className="glass-panel p-2 md:p-2.5 rounded-xl border border-slate-700/60 bg-slate-900/90 backdrop-blur-md flex items-center space-x-2 md:space-x-2.5 shadow-md shrink-0 snap-start w-[140px] sm:w-[160px] md:w-auto">
        <div className="p-1.5 md:p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] md:text-[10px] text-slate-400 font-medium truncate uppercase tracking-wider">Resueltas (7d)</p>
          <p className="text-xs md:text-sm font-extrabold text-emerald-300 font-mono leading-tight">
            {isLoadingStats ? '...' : `${weeklyResolvedCount} den.`}
          </p>
        </div>
      </div>

      {/* KPI 4: Denuncias Pendientes */}
      <div className="glass-panel p-2 md:p-2.5 rounded-xl border border-slate-700/60 bg-slate-900/90 backdrop-blur-md flex items-center space-x-2 md:space-x-2.5 shadow-md shrink-0 snap-start w-[140px] sm:w-[160px] md:w-auto">
        <div className="p-1.5 md:p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
          <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] md:text-[10px] text-slate-400 font-medium truncate uppercase tracking-wider">Pendientes</p>
          <p className="text-xs md:text-sm font-extrabold text-amber-300 font-mono leading-tight">
            {pendingReportsCount} activas
          </p>
        </div>
      </div>
    </div>
  );
};

export default CitizenKpiBar;
