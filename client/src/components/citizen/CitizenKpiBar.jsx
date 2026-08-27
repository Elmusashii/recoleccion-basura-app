import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Truck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { ReportsAPI } from '../../services/api';

/**
 * CitizenKpiBar - Barra de Métricas y KPIs en Tiempo Real para el Portal Ciudadano (Monochrome)
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
      .catch(() => {
        if (isMounted) {
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
      <div className="bg-[#ffffff] dark:bg-slate-900 border border-[#e5e5e5] dark:border-slate-800 p-3 rounded-sm shadow-sm flex items-center space-x-3 shrink-0 snap-start w-[140px] sm:w-[160px] md:w-auto transition-colors hover:border-[#111111] dark:hover:border-slate-600">
        <div className="p-2 rounded-sm bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 border border-[#e5e5e5] dark:border-slate-700 shrink-0">
          <MapPin className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-[#666666] dark:text-slate-400 font-mono uppercase tracking-wider">Barrios</p>
          <p className="font-bold tracking-tight text-base text-[#111111] dark:text-slate-100 font-mono leading-tight">
            <span>{matchedBarrios}</span>
            <span className="text-[#999999] dark:text-slate-500 text-xs font-normal"> / {totalBarrios}</span>
          </p>
        </div>
      </div>

      {/* KPI 2: Camiones en Ruta */}
      <div className="bg-[#ffffff] dark:bg-slate-900 border border-[#e5e5e5] dark:border-slate-800 p-3 rounded-sm shadow-sm flex items-center space-x-3 shrink-0 snap-start w-[140px] sm:w-[160px] md:w-auto transition-colors hover:border-[#111111] dark:hover:border-slate-600">
        <div className="p-2 rounded-sm bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 border border-[#e5e5e5] dark:border-slate-700 shrink-0">
          <Truck className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-[#666666] dark:text-slate-400 font-mono uppercase tracking-wider">En ruta</p>
          <p className="font-bold tracking-tight text-base text-[#111111] dark:text-slate-100 font-mono leading-tight">
            {activeTrucksInRoute} {activeTrucksInRoute === 1 ? 'unidad' : 'unidades'}
          </p>
        </div>
      </div>

      {/* KPI 3: Resueltas esta Semana */}
      <div className="bg-[#ffffff] dark:bg-slate-900 border border-[#e5e5e5] dark:border-slate-800 p-3 rounded-sm shadow-sm flex items-center space-x-3 shrink-0 snap-start w-[140px] sm:w-[160px] md:w-auto transition-colors hover:border-[#111111] dark:hover:border-slate-600">
        <div className="p-2 rounded-sm bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 border border-[#e5e5e5] dark:border-slate-700 shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-[#666666] dark:text-slate-400 font-mono uppercase tracking-wider">Resueltas (7d)</p>
          <p className="font-bold tracking-tight text-base text-[#111111] dark:text-slate-100 font-mono leading-tight">
            {isLoadingStats ? '...' : `${weeklyResolvedCount} den.`}
          </p>
        </div>
      </div>

      {/* KPI 4: Denuncias Pendientes */}
      <div className="bg-[#ffffff] dark:bg-slate-900 border border-[#e5e5e5] dark:border-slate-800 p-3 rounded-sm shadow-sm flex items-center space-x-3 shrink-0 snap-start w-[140px] sm:w-[160px] md:w-auto transition-colors hover:border-[#111111] dark:hover:border-slate-600">
        <div className="p-2 rounded-sm bg-red-500/10 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
          <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-[#666666] dark:text-slate-400 font-mono uppercase tracking-wider">Pendientes</p>
          <p className="font-bold tracking-tight text-base text-red-600 dark:text-red-400 font-mono leading-tight">
            {pendingReportsCount} activas
          </p>
        </div>
      </div>
    </div>
  );
};

export default CitizenKpiBar;
