import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Truck,
  AlertOctagon,
  CheckCircle2,
  TrendingUp,
  Clock,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Flame,
  FileText,
  RefreshCw,
  Map,
  Table,
  Calendar,
  Search,
  MapPin,
  Users,
  Shield,
  UserCheck,
  UserPlus,
  Wrench,
  AlertTriangle,
  Eye,
  Download,
  X
} from 'lucide-react';
import { ReportsAPI, FleetAPI, RoutesAPI, UsersAPI } from '../../services/api';
import { OFFICIAL_BARRIOS } from '../../data/officialRoutes';
import { UserManagement } from './UserManagement';
import { AssignReportModal } from './AssignReportModal';
import { ResolveReportModal } from './ResolveReportModal';
import { AssignTruckCircuitModal } from './AssignTruckCircuitModal';
import { ReportsMapView } from './ReportsMapView';
import { OptimizeReportsModal } from './OptimizeReportsModal';
import { useAuth } from '../../context/AuthContext';
import { exportToExcel } from '../../utils/exportUtils';

export const AdminDashboard = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('REPORTS'); // REPORTS, FLEET, ROUTES, USERS, HEATMAP
  const [reports, setReports] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [fleetLogs, setFleetLogs] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routeSearch, setRouteSearch] = useState('');
  const [routeDayFilter, setRouteDayFilter] = useState('ALL');
  const [routeShiftFilter, setRouteShiftFilter] = useState('ALL');

  // Modo de visualización de denuncias ('TABLE' o 'MAP') y selección espacial
  const [reportViewMode, setReportViewMode] = useState('TABLE');
  const [selectedReportIds, setSelectedReportIds] = useState([]);
  const [isOptimizeModalOpen, setIsOptimizeModalOpen] = useState(false);

  // Modales operativos de denuncias
  const [selectedReportForAssign, setSelectedReportForAssign] = useState(null);
  const [selectedReportForResolve, setSelectedReportForResolve] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Modal para ver foto de denuncia
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Modal para asignación de chofer a camión (Admin / Supervisor)
  const [selectedTruckForDriver, setSelectedTruckForDriver] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [savingDriver, setSavingDriver] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // Modal para asignación de circuito de rutas a camión (Admin / Supervisor)
  const [selectedTruckForCircuit, setSelectedTruckForCircuit] = useState(null);
  const [resettingMaintenanceId, setResettingMaintenanceId] = useState(null);

  // Formulario rápido de Bitácora
  const [newLog, setNewLog] = useState({
    truck_id: '',
    driver_name: '',
    action: 'SALIDA',
    odometer_km: '',
    fuel_level_percent: 100,
    waste_weight_kg: 0,
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportsRes, trucksRes, logsRes, routesRes, usersRes] = await Promise.allSettled([
        ReportsAPI.getAdmin({ limit: 100 }),
        FleetAPI.getTrucks(),
        FleetAPI.getLogs({ limit: 50 }),
        RoutesAPI.getAll(),
        UsersAPI.getAll()
      ]);

      if (reportsRes.status === 'fulfilled') {
        setReports(reportsRes.value.data?.data?.reports || []);
      }
      if (trucksRes.status === 'fulfilled') {
        setTrucks(trucksRes.value.data?.data || []);
      }
      if (logsRes.status === 'fulfilled') {
        setFleetLogs(logsRes.value.data?.data || []);
      }
      if (routesRes.status === 'fulfilled') {
        setRoutes(routesRes.value.data?.data || []);
      }
      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.data?.data || []);
      }
    } catch (err) {
      console.error('Error al cargar datos administrativos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleReportAssigned = (updatedReport) => {
    setReports(prev =>
      prev.map(r => (r.id === updatedReport.id ? { ...r, ...updatedReport } : r))
    );
    showToast(`Denuncia ${updatedReport.ticket_number || ''} asignada y pasada a EN PROCESO.`);
  };

  const handleReportResolved = (updatedReport) => {
    setReports(prev =>
      prev.map(r => (r.id === updatedReport.id ? { ...r, ...updatedReport } : r))
    );
    showToast(`Denuncia ${updatedReport.ticket_number || ''} marcada como RESUELTA.`);
  };

  const handleResetMaintenance = async (truckId) => {
    if (!confirm('¿Confirmas el registro del servicio/mantenimiento preventivo para este camión? Se reiniciará el contador del odómetro para el próximo intervalo.')) {
      return;
    }
    setResettingMaintenanceId(truckId);
    try {
      const res = await FleetAPI.resetMaintenance(truckId);
      if (res.data?.success) {
        const updatedTruck = res.data.data;
        setTrucks(prev => prev.map(t => (t.id === truckId || t.code === updatedTruck?.code ? { ...t, ...updatedTruck } : t)));
        showToast(`Mantenimiento preventivo registrado para la unidad.`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al registrar el mantenimiento del camión.');
    } finally {
      setResettingMaintenanceId(null);
    }
  };

  const handleOpenAssignDriverModal = async (truck) => {
    setSelectedTruckForDriver(truck);
    setSelectedDriverId(truck.assigned_user_id || '');
    setLoadingDrivers(true);
    try {
      const res = await FleetAPI.getAvailableDrivers(truck.id);
      setAvailableDrivers(res.data?.data || []);
    } catch (err) {
      console.warn('No se pudo cargar choferes disponibles:', err.message);
      const occupiedIds = trucks
        .filter(t => t.assigned_user_id && t.id !== truck.id)
        .map(t => t.assigned_user_id);
      setAvailableDrivers(users.filter(u => u.role === 'chofer' && !occupiedIds.includes(u.id)));
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleSaveDriverAssignment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTruckForDriver) return;
    setSavingDriver(true);
    try {
      const res = await FleetAPI.assignDriver(selectedTruckForDriver.id, selectedDriverId || null);
      const updated = res.data?.data;
      if (updated) {
        setTrucks(prev => prev.map(t => {
          if (t.id === selectedTruckForDriver.id) {
            return { ...t, ...updated, assigned_user_id: selectedDriverId || null };
          }
          if (selectedDriverId && t.assigned_user_id === selectedDriverId && t.id !== selectedTruckForDriver.id) {
            return { ...t, assigned_user_id: null };
          }
          return t;
        }));
        const choferObj = availableDrivers.find(u => u.id === selectedDriverId)
          || users.find(u => u.id === selectedDriverId);
        showToast(
          selectedDriverId
            ? `Chofer ${choferObj?.name || 'municipal'} asignado al camión ${selectedTruckForDriver.code}`
            : `Camión ${selectedTruckForDriver.code} desasignado correctamente`
        );
      }
      setSelectedTruckForDriver(null);
      setAvailableDrivers([]);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al asignar chofer');
    } finally {
      setSavingDriver(false);
    }
  };

  const getAssignedReportsForTruck = (truckId, truckCode) => {
    if (!truckId && !truckCode) return [];
    return (reports || []).filter(r => {
      if (r.status === 'RESUELTO') return false;
      return r.assigned_truck_id === truckId || (truckCode && r.assigned_truck_id === truckCode);
    });
  };

  const handleTruckSelect = (truckId) => {
    const selected = trucks.find(t => t.id === truckId);
    if (!selected) {
      setNewLog(prev => ({ ...prev, truck_id: '', action: 'SALIDA' }));
      return;
    }

    const isEnRuta = selected.status === 'EN_RUTA';
    const nextAction = isEnRuta ? 'ENTRADA' : 'SALIDA';
    const lastLog = fleetLogs.find(l => l.truck_id === truckId || l.trucks?.id === truckId);

    setNewLog(prev => ({
      ...prev,
      truck_id: truckId,
      action: nextAction,
      driver_name: prev.driver_name || lastLog?.driver_name || '',
      odometer_km: lastLog?.odometer_km ? (isEnRuta ? lastLog.odometer_km + 15 : lastLog.odometer_km) : prev.odometer_km,
      fuel_level_percent: isEnRuta ? Math.max(10, (lastLog?.fuel_level_percent || 100) - 25) : 100,
      waste_weight_kg: isEnRuta ? 4200 : 0
    }));
  };

  const handleCreateFleetLog = async (e) => {
    e.preventDefault();
    if (!newLog.truck_id || !newLog.driver_name) {
      showToast('Selecciona un camión y escribe el nombre del chofer');
      return;
    }

    try {
      const res = await FleetAPI.createLog(newLog);
      const created = res.data?.data;
      const newStatus = newLog.action === 'SALIDA' ? 'EN_RUTA' : 'DISPONIBLE';

      setTrucks(prev => prev.map(t => t.id === newLog.truck_id ? { ...t, status: newStatus } : t));

      if (created) {
        setFleetLogs(prev => [created, ...prev]);
      } else {
        fetchData();
      }

      showToast(`Movimiento de ${newLog.action} grabado exitosamente`);

      setNewLog({
        truck_id: '',
        driver_name: '',
        action: 'SALIDA',
        odometer_km: '',
        fuel_level_percent: 100,
        waste_weight_kg: 0,
        notes: ''
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      alert('Error en control de flota: ' + errorMsg);
    }
  };

  // KPIs Calculados dinámicamente
  const pendingReportsCount = reports.filter(r => r.status === 'PENDIENTE').length;
  const activeTrucksCount = trucks.filter(t => t.status === 'EN_RUTA').length;
  const totalWeightKg = fleetLogs.reduce((sum, log) => sum + (Number(log.waste_weight_kg) || 0), 0);
  const totalWeightTon = (totalWeightKg / 1000).toFixed(1);
  const resolutionRate = reports.length > 0
    ? Math.round((reports.filter(r => r.status === 'RESUELTO').length / reports.length) * 100)
    : 100;

  // Analítica para Heatmap
  const analyticsData = useMemo(() => {
    const catCounts = {};
    reports.forEach(r => {
      catCounts[r.category] = (catCounts[r.category] || 0) + 1;
    });

    let topCategory = 'VERTEDERO_CLANDESTINO';
    let maxCatCount = 0;
    Object.entries(catCounts).forEach(([cat, count]) => {
      if (count > maxCatCount) {
        maxCatCount = count;
        topCategory = cat;
      }
    });

    const zoneCounts = {};
    reports.forEach(r => {
      const z = r.address_reference ? r.address_reference.split('(')[0].trim() : 'Asunción';
      zoneCounts[z] = (zoneCounts[z] || 0) + 1;
    });

    let topZone = 'Centro / Mercado 4';
    let maxZoneCount = 0;
    Object.entries(zoneCounts).forEach(([zone, count]) => {
      if (count > maxZoneCount) {
        maxZoneCount = count;
        topZone = zone;
      }
    });

    const resolvedReports = reports.filter(r => r.status === 'RESUELTO' && r.created_at && r.resolved_at);
    let avgHours = 2.5;
    if (resolvedReports.length > 0) {
      const totalHours = resolvedReports.reduce((acc, r) => {
        const diff = (new Date(r.resolved_at) - new Date(r.created_at)) / (1000 * 60 * 60);
        return acc + Math.max(diff, 0.1);
      }, 0);
      avgHours = (totalHours / resolvedReports.length).toFixed(1);
    }

    return {
      topCategory,
      maxCatCount,
      topZone,
      maxZoneCount,
      avgHours,
      totalReports: reports.length,
      resolvedCount: reports.filter(r => r.status === 'RESUELTO').length,
      inProgressCount: reports.filter(r => r.status === 'EN_PROCESO').length,
      pendingCount: pendingReportsCount
    };
  }, [reports, pendingReportsCount]);

  // Lista normalizada de barrios
  const displayRoutes = useMemo(() => {
    if (routes && routes.length > 0) {
      return routes.map(r => {
        const geo = r.geometry_geojson || {};
        return {
          id: r.id,
          name: r.name || r.zone,
          group: geo.group || (r.schedule_days?.includes('Martes') ? 'MARTES_JUEVES_SABADO' : 'LUNES_MIERCOLES_VIERNES'),
          groupLabel: geo.groupLabel || r.schedule_days?.join(', ') || 'Días oficiales',
          shift: r.shift || 'Mañana',
          shiftHours: geo.shiftHours || `${r.start_time?.slice(0, 5)} a ${r.end_time?.slice(0, 5)} hs`,
          color_hex: r.color_hex || '#111111',
          mainStreets: geo.mainStreets || r.zone,
          recommendation: geo.recommendation || 'Disponer bolsas cerradas antes del inicio del turno',
          is_active: r.is_active
        };
      });
    }
    return OFFICIAL_BARRIOS;
  }, [routes]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn bg-[#ffffff] dark:bg-[#090d16] border border-[#e5e5e5] dark:border-slate-800 rounded-sm p-6 text-[#111111] dark:text-slate-100 transition-colors">
      {/* Encabezado del Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#e5e5e5] dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase bg-[#f5f5f5] dark:bg-slate-900 text-[#111111] dark:text-slate-200 border border-[#e5e5e5] dark:border-slate-800">
              Dirección de Servicios Urbanos
            </span>
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase border border-[#cccccc] dark:border-slate-700 text-[#666666] dark:text-slate-400">
              Sistema Central
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100 mt-1.5">
            Panel de Control y Gestión Operativa
          </h1>
          <p className="text-xs text-[#666666] dark:text-slate-400">
            Monitoreo de flota, denuncias vecinales y métricas de recolección en Asunción
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center space-x-2 self-start md:self-auto bg-[#ffffff] dark:bg-slate-900 hover:bg-[#f5f5f5] dark:hover:bg-slate-800 text-[#111111] dark:text-slate-200 text-xs font-mono font-medium px-3.5 py-2 rounded-sm border border-[#cccccc] dark:border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#111111] dark:text-slate-200 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-sm border border-[#e5e5e5] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-900/70 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-mono uppercase text-[#666666] dark:text-slate-400">Denuncias Pendientes</p>
            <h3 className="text-xl font-bold text-[#111111] dark:text-slate-100 font-mono mt-0.5">{pendingReportsCount}</h3>
            <span className="text-[11px] text-[#666666] dark:text-slate-400 font-mono flex items-center mt-1">
              Requieren atención
            </span>
          </div>
          <div className="w-10 h-10 rounded-sm bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 flex items-center justify-center border border-[#e5e5e5] dark:border-slate-700">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-sm border border-[#e5e5e5] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-900/70 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-mono uppercase text-[#666666] dark:text-slate-400">Camiones en Ruta</p>
            <h3 className="text-xl font-bold text-[#111111] dark:text-slate-100 font-mono mt-0.5">{activeTrucksCount}</h3>
            <span className="text-[11px] text-[#666666] dark:text-slate-400 font-mono flex items-center mt-1">
              De {trucks.length} unidades
            </span>
          </div>
          <div className="w-10 h-10 rounded-sm bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 flex items-center justify-center border border-[#e5e5e5] dark:border-slate-700">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-sm border border-[#e5e5e5] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-900/70 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-mono uppercase text-[#666666] dark:text-slate-400">Basura Registrada</p>
            <h3 className="text-xl font-bold text-[#111111] dark:text-slate-100 font-mono mt-0.5">{totalWeightTon} Tn</h3>
            <span className="text-[11px] text-[#666666] dark:text-slate-400 font-mono flex items-center mt-1">
              Descargas en Cateura
            </span>
          </div>
          <div className="w-10 h-10 rounded-sm bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 flex items-center justify-center border border-[#e5e5e5] dark:border-slate-700">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-sm border border-[#e5e5e5] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-900/70 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-mono uppercase text-[#666666] dark:text-slate-400">Tasa de Resolución</p>
            <h3 className="text-xl font-bold text-[#111111] dark:text-slate-100 font-mono mt-0.5">{resolutionRate}%</h3>
            <span className="text-[11px] text-[#666666] dark:text-slate-400 font-mono flex items-center mt-1">
              Reclamos resueltos
            </span>
          </div>
          <div className="w-10 h-10 rounded-sm bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 flex items-center justify-center border border-[#e5e5e5] dark:border-slate-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex space-x-1.5 border-b border-[#e5e5e5] dark:border-slate-800 pb-2 overflow-x-auto font-mono text-xs">
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 font-medium rounded-sm transition-colors whitespace-nowrap ${
            activeTab === 'REPORTS'
              ? 'bg-[#111111] text-[#fafafa] dark:bg-slate-100 dark:text-slate-950'
              : 'bg-transparent text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-200 border border-transparent dark:hover:border-slate-800'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Gestión de Denuncias ({reports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('FLEET')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 font-medium rounded-sm transition-colors whitespace-nowrap ${
            activeTab === 'FLEET'
              ? 'bg-[#111111] text-[#fafafa] dark:bg-slate-100 dark:text-slate-950'
              : 'bg-transparent text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-200 border border-transparent dark:hover:border-slate-800'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Control de Flota ({fleetLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ROUTES')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 font-medium rounded-sm transition-colors whitespace-nowrap ${
            activeTab === 'ROUTES'
              ? 'bg-[#111111] text-[#fafafa] dark:bg-slate-100 dark:text-slate-950'
              : 'bg-transparent text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-200 border border-transparent dark:hover:border-slate-800'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>Cronogramas Oficiales ({displayRoutes.length})</span>
        </button>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('USERS')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 font-medium rounded-sm transition-colors whitespace-nowrap ${
              activeTab === 'USERS'
                ? 'bg-[#111111] text-[#fafafa] dark:bg-slate-100 dark:text-slate-950'
                : 'bg-transparent text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-200 border border-transparent dark:hover:border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Gestión de Usuarios</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('HEATMAP')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 font-medium rounded-sm transition-colors whitespace-nowrap ${
            activeTab === 'HEATMAP'
              ? 'bg-[#111111] text-[#fafafa] dark:bg-slate-100 dark:text-slate-950'
              : 'bg-transparent text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-200 border border-transparent dark:hover:border-slate-800'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Métricas y Puntos Críticos</span>
        </button>
      </div>

      {/* Pestaña 1: GESTIÓN DE DENUNCIAS */}
      {activeTab === 'REPORTS' && (
        <div className="p-4 rounded-sm border border-[#e5e5e5] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-950 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100">
                Denuncias Registradas
              </h2>
              <p className="text-xs text-[#666666] dark:text-slate-400">
                {reportViewMode === 'TABLE'
                  ? 'Listado consolidado de reportes ciudadanos'
                  : 'Selección espacial para optimización y despacho de rutas (VROOM)'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Toggle Vista Tabla / Mapa Espacial (Monochrome) */}
              <div className="flex items-center p-0.5 rounded-sm border border-[#cccccc] dark:border-slate-700 bg-[#f5f5f5] dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setReportViewMode('TABLE')}
                  className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-mono rounded-sm transition-colors ${
                    reportViewMode === 'TABLE'
                      ? 'bg-[#111111] text-[#ffffff] dark:bg-slate-100 dark:text-slate-950 font-bold shadow-sm'
                      : 'text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-200'
                  }`}
                  title="Ver listado en formato tabla"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Tabla ({reports.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportViewMode('MAP')}
                  className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-mono rounded-sm transition-colors ${
                    reportViewMode === 'MAP'
                      ? 'bg-[#111111] text-[#ffffff] dark:bg-slate-100 dark:text-slate-950 font-bold shadow-sm'
                      : 'text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-200'
                  }`}
                  title="Ver mapa espacial y herramienta de selección"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>Mapa Espacial</span>
                </button>
              </div>

              {reportViewMode === 'TABLE' && (
                <button
                  onClick={() => exportToExcel(reports, 'denuncias_municipales.xlsx', 'Denuncias')}
                  className="flex items-center space-x-1.5 bg-[#111111] text-[#ffffff] dark:bg-slate-100 dark:text-slate-950 hover:opacity-85 text-xs font-mono px-3 py-1.5 rounded-sm transition-colors font-medium"
                  title="Exportar todas las denuncias a formato Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar a Excel</span>
                </button>
              )}
            </div>
          </div>

          {/* Renderizado Condicional: Mapa Espacial o Tabla */}
          {reportViewMode === 'MAP' ? (
            <ReportsMapView
              reports={reports}
              trucks={trucks}
              selectedReportIds={selectedReportIds}
              onSelectionChange={setSelectedReportIds}
              onOpenOptimizeModal={() => setIsOptimizeModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto rounded-sm border border-[#e5e5e5] dark:border-slate-800">
              <table className="w-full text-left text-xs text-[#111111] dark:text-slate-100">
                <thead className="bg-[#f5f5f5] dark:bg-slate-900 text-[#666666] dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#e5e5e5] dark:border-slate-800 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Acciones</th>
                    <th className="py-2.5 px-3">Ticket</th>
                    <th className="py-2.5 px-3">Fecha y Hora</th>
                    <th className="py-2.5 px-3">Ciudadano</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3">Descripción</th>
                    <th className="py-2.5 px-3">Ubicación / Ref</th>
                    <th className="py-2.5 px-3">Foto</th>
                    <th className="py-2.5 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5] dark:divide-slate-800">
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-[#666666] dark:text-slate-400 font-mono">
                        No hay denuncias registradas en la base de datos actualmente.
                      </td>
                    </tr>
                  ) : (
                    reports.map((r) => (
                      <tr key={r.id} className="hover:bg-[#f5f5f5] dark:hover:bg-slate-900/50 transition-colors">
                        <td className="py-2.5 px-3 space-x-1.5 whitespace-nowrap">
                          {r.status === 'PENDIENTE' && (
                            <button
                              onClick={() => setSelectedReportForAssign(r)}
                              className="bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 border border-[#cccccc] dark:border-slate-700 hover:bg-[#e5e5e5] dark:hover:bg-slate-700 text-[11px] font-medium px-2.5 py-1 rounded-sm transition-colors font-mono"
                            >
                              Atender
                            </button>
                          )}
                          {r.status !== 'RESUELTO' && (
                            <button
                              onClick={() => setSelectedReportForResolve(r)}
                              className="bg-[#111111] text-[#ffffff] dark:bg-slate-100 dark:text-slate-950 hover:opacity-80 text-[11px] font-medium px-2.5 py-1 rounded-sm transition-colors font-mono"
                            >
                              Resolver
                            </button>
                          )}
                          {r.status === 'RESUELTO' && (
                            <span className="border border-[#cccccc] dark:border-slate-700 text-[#666666] dark:text-slate-400 font-mono text-[10px] px-2 py-0.5 rounded-sm bg-transparent">
                              Completado
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-[#111111] dark:text-slate-100 font-bold whitespace-nowrap">
                          {r.ticket_number || 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-[#111111] dark:text-slate-100 font-mono">
                          <div className="flex flex-col">
                            <span className="font-medium text-[11px]">
                              {r.created_at ? new Date(r.created_at).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/D'}
                            </span>
                            <span className="text-[10px] text-[#666666] dark:text-slate-400">
                              {r.created_at ? new Date(r.created_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }) + ' hs' : ''}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium block text-[#111111] dark:text-slate-100">{r.citizen_name || 'Anónimo'}</span>
                          {r.citizen_phone && <span className="text-[10px] text-[#666666] dark:text-slate-400 font-mono">{r.citizen_phone}</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 px-2 py-0.5 rounded-sm border border-[#e5e5e5] dark:border-slate-700 whitespace-nowrap text-[11px] font-mono">
                            {r.category?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate text-[#333333] dark:text-slate-300" title={r.description}>
                          {r.description}
                        </td>
                        <td className="py-2.5 px-3 text-[#666666] dark:text-slate-400 max-w-[200px] truncate font-mono text-[11px]" title={r.address_reference}>
                          {r.address_reference || `${r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4)}`}
                        </td>
                        <td className="py-2.5 px-3">
                          {r.photo_urls && r.photo_urls.length > 0 ? (
                            <button
                              onClick={() => setSelectedPhoto(r.photo_urls[0])}
                              className="flex items-center space-x-1 text-[#111111] dark:text-slate-200 hover:underline font-mono bg-[#f5f5f5] dark:bg-slate-800 px-2 py-0.5 rounded-sm border border-[#e5e5e5] dark:border-slate-700 text-[11px]"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ver ({r.photo_urls.length})</span>
                            </button>
                          ) : (
                            <span className="text-[#999999] dark:text-slate-500 italic text-[11px] font-mono">Sin foto</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-sm font-mono text-[10px] whitespace-nowrap ${
                              r.status === 'PENDIENTE'
                                ? 'border border-[#111111] dark:border-slate-600 text-[#111111] dark:text-slate-200 bg-transparent'
                                : r.status === 'EN_PROCESO'
                                  ? 'bg-[#e5e5e5] dark:bg-slate-800 text-[#111111] dark:text-slate-200'
                                  : 'bg-[#111111] text-[#ffffff] dark:bg-slate-100 dark:text-slate-950 font-medium'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pestaña 2: CONTROL DE FLOTA Y BITÁCORA */}
      {activeTab === 'FLEET' && (() => {
        const selectedTruck = trucks.find(t => t.id === newLog.truck_id);
        const assignedReportsToSelected = selectedTruck ? getAssignedReportsForTruck(selectedTruck.id, selectedTruck.code) : [];

        return (
          <div className="space-y-5">
            {/* Panel de Unidades de Flota y Asignación de Choferes */}
            <div className="bg-[#ffffff] dark:bg-slate-950 border border-[#e5e5e5] dark:border-slate-800 p-6 rounded-sm space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5e5e5] dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100 flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-[#111111] dark:text-slate-200" />
                    <span>Unidades de Flota & Asignación de Choferes</span>
                  </h3>
                  <p className="text-xs text-[#666666] dark:text-slate-400">
                    Parque automotor municipal y asignación operativa de circuitos y choferes
                  </p>
                </div>
                <span className="border border-[#cccccc] dark:border-slate-700 text-[#666666] dark:text-slate-400 font-mono text-xs px-2.5 py-0.5 rounded-sm bg-transparent self-start sm:self-auto">
                  {trucks.length} Unidades
                </span>
              </div>

              {/* Grid de Camiones */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {trucks.map((t) => {
                  const assignedDriver = users.find(u => u.id === t.assigned_user_id);
                  const truckReports = getAssignedReportsForTruck(t.id, t.code);

                  const currentOdo = Number(t.current_odometer) || 0;
                  const lastMaintOdo = Number(t.last_maintenance_km) || 0;
                  const maintInterval = Number(t.maintenance_interval_km) || 10000;
                  const kmRecorridos = Math.max(0, currentOdo - lastMaintOdo);
                  const needsMaintenance = kmRecorridos >= (maintInterval * 0.9);
                  const maintPercent = Math.min(100, Math.round((kmRecorridos / maintInterval) * 100));

                  return (
                    <div
                      key={t.id}
                      className="bg-[#ffffff] dark:bg-slate-900/70 border border-[#e5e5e5] dark:border-slate-800 p-5 rounded-sm shadow-sm space-y-4 hover:border-[#cccccc] dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
                    >
                      {/* Cabecera del Camión */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs text-[#111111] dark:text-slate-200 font-bold bg-[#f5f5f5] dark:bg-slate-800 px-2 py-0.5 rounded-sm border border-[#e5e5e5] dark:border-slate-700">
                              {t.code}
                            </span>
                            <span className="text-xs font-mono text-[#666666] dark:text-slate-400">
                              {t.plate_number || 'S/D'}
                            </span>
                          </div>

                          <span
                            className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                              t.status === 'EN_RUTA'
                                ? 'bg-[#111111] text-[#ffffff] dark:bg-slate-100 dark:text-slate-950 font-medium'
                                : t.status === 'FUERA_DE_SERVICIO' || t.status === 'EN_MANTENIMIENTO'
                                  ? 'border border-[#111111] dark:border-slate-600 text-[#111111] dark:text-slate-200 bg-transparent'
                                  : 'border border-[#111111] dark:border-slate-600 text-[#111111] dark:text-slate-200 bg-transparent'
                            }`}
                          >
                            {t.status === 'FUERA_DE_SERVICIO' ? 'AVERIADO' : t.status}
                          </span>
                        </div>

                        <p className="text-xs text-[#333333] dark:text-slate-300 font-medium">
                          {t.model || 'Camión Recolector'}
                        </p>

                        <div className="flex items-center justify-between text-[11px] font-mono text-[#666666] dark:text-slate-400 pt-0.5">
                          <span>Capacidad: <strong className="text-[#111111] dark:text-slate-100">{t.capacity_tons || 12} Tn</strong></span>
                          <span>Estado: <strong className="text-[#111111] dark:text-slate-100">{t.status}</strong></span>
                        </div>
                      </div>

                      {/* Alerta de Mantenimiento Requerido */}
                      {needsMaintenance && (
                        <div className="p-2.5 rounded-sm bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px] flex items-center justify-between font-mono">
                          <div className="flex items-center space-x-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="font-bold">⚠️ Mantenimiento Requerido ({kmRecorridos.toLocaleString()} / {maintInterval.toLocaleString()} km - {maintPercent}%)</span>
                          </div>
                        </div>
                      )}

                      {/* Denuncias asignadas activas */}
                      {truckReports.length > 0 && (
                        <div className="p-2 rounded-sm bg-[#f5f5f5] dark:bg-slate-950/80 border border-[#e5e5e5] dark:border-slate-800 text-[#111111] dark:text-slate-200 text-[11px] flex items-center justify-between font-mono">
                          <span>📌 {truckReports.length} {truckReports.length === 1 ? 'denuncia en proceso' : 'denuncias en proceso'}</span>
                        </div>
                      )}

                      {/* Sección de Circuito de Barrios Asignados */}
                      <div className="pt-2 border-t border-[#e5e5e5] dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-[#666666] dark:text-slate-400 flex items-center space-x-1">
                            <Map className="w-3.5 h-3.5 text-[#111111] dark:text-slate-300" />
                            <span>Circuito Barrial</span>
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => setSelectedTruckForCircuit(t)}
                              className="bg-[#ffffff] dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-200 hover:bg-[#f5f5f5] dark:hover:bg-slate-700 font-medium text-xs px-2.5 py-1 rounded-sm transition-colors"
                            >
                              {t.assigned_routes?.length > 0 ? 'Editar' : 'Asignar'}
                            </button>
                          )}
                        </div>

                        {t.assigned_routes && t.assigned_routes.length > 0 ? (
                          <div className="bg-[#f5f5f5] dark:bg-slate-950/80 border border-[#e5e5e5] dark:border-slate-800 p-3 rounded-sm space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="font-bold text-[#111111] dark:text-slate-100">
                                {t.assigned_routes.length} {t.assigned_routes.length === 1 ? 'barrio' : 'barrios'}
                              </span>
                              <span className="border border-[#cccccc] dark:border-slate-700 text-[#666666] dark:text-slate-400 font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-transparent">
                                {t.assigned_routes[0]?.shift || 'Turno'}
                              </span>
                            </div>
                            <p className="font-mono text-[11px] text-[#666666] dark:text-slate-400 truncate">
                              {t.assigned_routes.map(r => r.name).join(' • ')}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-[#f5f5f5] dark:bg-slate-950/80 border border-dashed border-[#cccccc] dark:border-slate-800 p-3 rounded-sm text-[10px] text-[#666666] dark:text-slate-400 font-mono flex items-center justify-between">
                            <span>Sin circuito asignado</span>
                            {isAdmin && (
                              <button
                                onClick={() => setSelectedTruckForCircuit(t)}
                                className="text-[10px] text-[#111111] dark:text-slate-200 font-semibold hover:underline"
                              >
                                + Asignar
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Caja de Chofer Asignado */}
                      <div className="pt-2 border-t border-[#e5e5e5] dark:border-slate-800">
                        {assignedDriver ? (
                          <div className="bg-[#f5f5f5] dark:bg-slate-950/80 border border-[#e5e5e5] dark:border-slate-800 p-3 rounded-sm flex items-center justify-between space-y-0">
                            <div className="flex items-center space-x-2 min-w-0">
                              <Truck className="w-3.5 h-3.5 text-[#111111] dark:text-slate-300" />
                              <div className="truncate">
                                <p className="font-medium text-[#111111] dark:text-slate-100 text-xs truncate">{assignedDriver.name}</p>
                                <p className="text-[10px] text-[#666666] dark:text-slate-400 truncate font-mono">{assignedDriver.phone || assignedDriver.email}</p>
                              </div>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => handleOpenAssignDriverModal(t)}
                                className="bg-[#ffffff] dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-200 hover:bg-[#f5f5f5] dark:hover:bg-slate-700 font-medium text-xs px-2.5 py-1 rounded-sm transition-colors shrink-0 ml-2"
                              >
                                Cambiar
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="bg-[#f5f5f5] dark:bg-slate-950/80 border border-dashed border-[#cccccc] dark:border-slate-800 p-3 rounded-sm flex items-center justify-between font-mono">
                            <span className="text-[11px] text-[#666666] dark:text-slate-400 flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 text-[#111111] dark:text-slate-300 shrink-0 inline mr-1" />
                              Sin chofer
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => handleOpenAssignDriverModal(t)}
                                className="bg-[#ffffff] dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-200 hover:bg-[#f5f5f5] dark:hover:bg-slate-700 font-medium text-xs px-2.5 py-1 rounded-sm transition-colors shrink-0"
                              >
                                Asignar
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Registro de Service / Mantenimiento Preventivo */}
                      <div className="pt-2 border-t border-[#e5e5e5] dark:border-slate-800 flex items-center justify-between font-mono text-[10px]">
                        <div>
                          <span className="text-[#666666] dark:text-slate-400">Odómetro: <strong className="text-[#111111] dark:text-slate-200">{currentOdo.toLocaleString()} km</strong></span>
                          <span className="block text-[#999999] dark:text-slate-500 text-[9px]">Últ. Service: {lastMaintOdo.toLocaleString()} km</span>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleResetMaintenance(t.id)}
                            disabled={resettingMaintenanceId === t.id}
                            className="bg-[#ffffff] dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-200 hover:bg-[#f5f5f5] dark:hover:bg-slate-700 font-medium text-[11px] px-2.5 py-1 rounded-sm transition-colors flex items-center space-x-1 disabled:opacity-50"
                            title="Registrar service técnico y reiniciar odómetro de mantenimiento"
                          >
                            <Wrench className={`w-3 h-3 ${resettingMaintenanceId === t.id ? 'animate-spin' : ''}`} />
                            <span>{resettingMaintenanceId === t.id ? 'Guardando...' : 'Registrar Service'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fila Inferior: Formulario de Registro de Salida / Entrada + Bitácora Reciente */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Formulario de Registro de Salida / Entrada */}
              <div className="p-4 rounded-sm border border-[#e5e5e5] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-950 space-y-3.5 shadow-sm text-[#111111] dark:text-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100 flex items-center space-x-2">
                  <PlusCircle className="w-4 h-4 text-[#111111] dark:text-slate-200" />
                  <span>Registrar Movimiento de Flota</span>
                </h3>

                <form onSubmit={handleCreateFleetLog} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#666666] dark:text-slate-400 mb-1 font-mono text-[11px]">Camión Recolector</label>
                    <select
                      value={newLog.truck_id}
                      onChange={(e) => handleTruckSelect(e.target.value)}
                      className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 rounded-sm p-2 text-[#111111] dark:text-slate-100 focus:border-[#111111] dark:focus:border-slate-400 focus:outline-none font-mono"
                      required
                    >
                      <option value="">-- Seleccionar Unidad --</option>
                      {trucks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} ({t.plate_number}) - {t.model || 'Recolector'} [{t.status}]
                        </option>
                      ))}
                    </select>

                    {selectedTruck && (
                      <div className="mt-2 p-2 rounded-sm bg-[#f5f5f5] dark:bg-slate-900 border border-[#e5e5e5] dark:border-slate-800 text-[11px] space-y-1 font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-[#333333] dark:text-slate-300">
                            Estado: <strong className="text-[#111111] dark:text-slate-100">{selectedTruck.status}</strong>
                          </span>
                          {assignedReportsToSelected.length > 0 && (
                            <span className="bg-[#ffffff] dark:bg-slate-800 text-[#111111] dark:text-slate-200 text-[10px] font-mono px-1.5 py-0.5 rounded-sm border border-[#e5e5e5] dark:border-slate-700">
                              📌 {assignedReportsToSelected.length}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[#666666] dark:text-slate-400 mb-1 font-mono text-[11px]">Chofer / Responsable</label>
                    <input
                      type="text"
                      placeholder="Ej: Ramón Benítez"
                      value={newLog.driver_name}
                      onChange={(e) => setNewLog({ ...newLog, driver_name: e.target.value })}
                      className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 rounded-sm p-2 text-[#111111] dark:text-slate-100 focus:border-[#111111] dark:focus:border-slate-400 focus:outline-none font-mono"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div>
                      <label className="block text-[#666666] dark:text-slate-400 mb-1 text-[11px]">Acción</label>
                      <select
                        value={newLog.action}
                        onChange={(e) => setNewLog({ ...newLog, action: e.target.value })}
                        className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 rounded-sm p-2 text-[#111111] dark:text-slate-100 focus:border-[#111111] dark:focus:border-slate-400 focus:outline-none font-mono"
                      >
                        <option value="SALIDA" disabled={selectedTruck?.status === 'EN_RUTA'}>
                          SALIDA a Ruta
                        </option>
                        <option value="ENTRADA" disabled={selectedTruck?.status === 'DISPONIBLE'}>
                          ENTRADA a Base
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#666666] dark:text-slate-400 mb-1 text-[11px]">Combustible (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newLog.fuel_level_percent}
                        onChange={(e) => setNewLog({ ...newLog, fuel_level_percent: Number(e.target.value) })}
                        className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 rounded-sm p-2 text-[#111111] dark:text-slate-100 focus:border-[#111111] dark:focus:border-slate-400 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div>
                      <label className="block text-[#666666] dark:text-slate-400 mb-1 text-[11px]">Odómetro (Km)</label>
                      <input
                        type="number"
                        placeholder="Ej: 45200"
                        value={newLog.odometer_km}
                        onChange={(e) => setNewLog({ ...newLog, odometer_km: e.target.value })}
                        className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 rounded-sm p-2 text-[#111111] dark:text-slate-100 focus:border-[#111111] dark:focus:border-slate-400 focus:outline-none font-mono"
                      />
                    </div>

                    {newLog.action === 'ENTRADA' ? (
                      <div>
                        <label className="block text-[#666666] dark:text-slate-400 mb-1 text-[11px]">Descarga (Kg)</label>
                        <input
                          type="number"
                          placeholder="Ej: 4500"
                          value={newLog.waste_weight_kg}
                          onChange={(e) => setNewLog({ ...newLog, waste_weight_kg: Number(e.target.value) })}
                          className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 rounded-sm p-2 text-[#111111] dark:text-slate-100 focus:border-[#111111] dark:focus:border-slate-400 focus:outline-none font-mono"
                        />
                      </div>
                    ) : (
                      <div className="opacity-50">
                        <label className="block text-[#999999] dark:text-slate-500 mb-1 text-[11px]">Peso (En Entrada)</label>
                        <input
                          type="text"
                          disabled
                          value="0 Kg en salida"
                          className="w-full bg-[#f5f5f5] dark:bg-slate-800 border border-[#e5e5e5] dark:border-slate-700 rounded-sm p-2 text-[#999999] dark:text-slate-500 font-mono"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[#666666] dark:text-slate-400 mb-1 font-mono text-[11px]">Observaciones</label>
                    <textarea
                      rows={2}
                      placeholder="Incidencias mecánicas, circuito..."
                      value={newLog.notes}
                      onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                      className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 rounded-sm p-2 text-[#111111] dark:text-slate-100 focus:border-[#111111] dark:focus:border-slate-400 focus:outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#111111] dark:bg-slate-100 hover:opacity-85 text-[#fafafa] dark:text-slate-950 font-medium py-2 rounded-sm transition-colors uppercase font-mono tracking-wider text-xs"
                  >
                    Guardar Movimiento en Bitácora
                  </button>
                </form>
              </div>

              {/* Historial de Bitácora Reciente */}
              <div className="lg:col-span-2 p-4 rounded-sm border border-[#e5e5e5] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-950 space-y-4 shadow-sm text-[#111111] dark:text-slate-100">
                <div className="flex items-center justify-between border-b border-[#e5e5e5] dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-[#111111] dark:text-slate-200" />
                    <span>Bitácora de Entradas y Salidas</span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-[#666666] dark:text-slate-400 font-mono">{fleetLogs.length} registros</span>
                    <button
                      onClick={() => exportToExcel(fleetLogs, 'bitacora_flota.xlsx', 'Bitacora')}
                      className="flex items-center space-x-1.5 bg-[#ffffff] dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-200 hover:bg-[#f5f5f5] dark:hover:bg-slate-700 text-xs font-mono px-2.5 py-1 rounded-sm transition-colors font-medium"
                      title="Descargar bitácora de flota en Excel"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar Bitácora</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {fleetLogs.length === 0 ? (
                    <div className="text-center py-12 text-[#666666] dark:text-slate-400 text-xs border border-dashed border-[#cccccc] dark:border-slate-700 rounded-sm font-mono">
                      No hay movimientos registrados en la bitácora todavía.
                    </div>
                  ) : (
                    fleetLogs.map((log) => {
                      const truckObj = trucks.find(t => t.id === log.truck_id || t.code === log.trucks?.code);
                      const isStillInRoute = truckObj ? truckObj.status === 'EN_RUTA' : false;
                      const assignedReports = getAssignedReportsForTruck(log.truck_id || truckObj?.id, log.trucks?.code || truckObj?.code);
                      const assignedCount = assignedReports.length;

                      return (
                        <div key={log.id} className="p-3 bg-[#ffffff] dark:bg-slate-900/70 rounded-sm border border-[#e5e5e5] dark:border-slate-800 flex items-center justify-between text-xs hover:border-[#111111] dark:hover:border-slate-700 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-sm bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 border border-[#e5e5e5] dark:border-slate-700">
                              {log.action === 'SALIDA' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-bold text-[#111111] dark:text-slate-100 text-xs font-mono flex items-center space-x-2">
                                  <span>{log.trucks?.code || truckObj?.code || 'Camión'} • {log.action}</span>
                                  {(log.trucks?.plate_number || truckObj?.plate_number) && (
                                    <span className="text-[10px] text-[#666666] dark:text-slate-400">[{log.trucks?.plate_number || truckObj?.plate_number}]</span>
                                  )}
                                </h4>
                                {assignedCount > 0 && (
                                  <span className="text-[9px] bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 border border-[#e5e5e5] dark:border-slate-700 px-1.5 py-0.2 rounded-sm font-mono">
                                    📌 {assignedCount} {assignedCount === 1 ? 'denuncia' : 'denuncias'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[#666666] dark:text-slate-400 mt-0.5 font-mono text-[11px]">
                                Chofer: <strong className="text-[#111111] dark:text-slate-200">{log.driver_name}</strong>
                                {log.notes ? ` • "${log.notes}"` : ''}
                              </p>
                              <div className="flex items-center space-x-3 text-[10px] font-mono text-[#999999] dark:text-slate-500 mt-0.5">
                                {log.odometer_km ? <span>Km: {Number(log.odometer_km).toLocaleString()}</span> : null}
                                {log.fuel_level_percent !== undefined ? <span>Combustible: {log.fuel_level_percent}%</span> : null}
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end font-mono">
                            <span className="font-bold text-[#111111] dark:text-slate-200 block">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                            </span>
                            <span className="text-[10px] text-[#666666] dark:text-slate-400 block">
                              {new Date(log.timestamp).toLocaleDateString()}
                            </span>
                            {log.waste_weight_kg > 0 && (
                              <span className="text-[#111111] dark:text-slate-200 font-bold mt-1 inline-block bg-[#f5f5f5] dark:bg-slate-800 px-2 py-0.5 rounded-sm border border-[#e5e5e5] dark:border-slate-700">
                                {Number(log.waste_weight_kg).toLocaleString()} Kg
                              </span>
                            )}
                            {log.action === 'SALIDA' && isStillInRoute && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleTruckSelect(log.truck_id || truckObj?.id);
                                  setNewLog(prev => ({
                                    ...prev,
                                    truck_id: log.truck_id || truckObj?.id,
                                    driver_name: log.driver_name,
                                    action: 'ENTRADA',
                                    odometer_km: log.odometer_km ? Number(log.odometer_km) + 15 : '',
                                    fuel_level_percent: Math.max(10, (log.fuel_level_percent || 100) - 25),
                                    waste_weight_kg: 3800,
                                    notes: `Retorno a base de ${log.notes || 'ruta regular'}`.trim()
                                  }));
                                }}
                                className="mt-1.5 text-[10px] font-mono bg-[#ffffff] dark:bg-slate-800 hover:bg-[#f5f5f5] dark:hover:bg-slate-700 text-[#111111] dark:text-slate-200 border border-[#cccccc] dark:border-slate-700 px-2 py-0.5 rounded-sm transition-colors flex items-center space-x-1"
                              >
                                <ArrowDownLeft className="w-3 h-3" />
                                <span>Registrar Entrada</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pestaña 3: CRONOGRAMAS OFICIALES POR BARRIO */}
      {activeTab === 'ROUTES' && (
        <div className="p-4 rounded-sm border border-[#e5e5e5] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-950 space-y-4 shadow-sm text-[#111111] dark:text-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e5e5] dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100 flex items-center space-x-2">
                <Map className="w-4 h-4 text-[#111111] dark:text-slate-200" />
                <span>Base Oficial de Rutas y Horarios por Barrio</span>
              </h3>
              <p className="text-xs text-[#666666] dark:text-slate-400">
                Frecuencias, turnos y horarios de recolección en Asunción
              </p>
            </div>

            {/* Filtros de la tabla */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar barrio..."
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                  className="bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 text-xs rounded-sm pl-8 pr-3 py-1.5 focus:border-[#111111] dark:focus:border-slate-400 focus:outline-none"
                />
              </div>

              <select
                value={routeDayFilter}
                onChange={(e) => setRouteDayFilter(e.target.value)}
                className="bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 text-xs rounded-sm px-2.5 py-1.5 focus:border-[#111111] dark:focus:border-slate-400 focus:outline-none font-mono"
              >
                <option value="ALL">Todos los Días</option>
                <option value="MARTES_JUEVES_SABADO">Martes, Jueves y Sábado</option>
                <option value="LUNES_MIERCOLES_VIERNES">Lunes, Miércoles y Viernes</option>
              </select>

              <select
                value={routeShiftFilter}
                onChange={(e) => setRouteShiftFilter(e.target.value)}
                className="bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 text-xs rounded-sm px-2.5 py-1.5 focus:border-[#111111] dark:focus:border-slate-400 focus:outline-none font-mono"
              >
                <option value="ALL">Todos los Turnos</option>
                <option value="Mañana">Mañana (06:00 - 12:00)</option>
                <option value="Tarde">Tarde (12:00 - 18:00)</option>
                <option value="Noche">Noche (19:00 - 02:00)</option>
              </select>
            </div>
          </div>

          {/* Tabla de Barrios Oficiales */}
          <div className="overflow-x-auto rounded-sm border border-[#e5e5e5] dark:border-slate-800">
            <table className="w-full text-left text-xs text-[#111111] dark:text-slate-100">
              <thead className="bg-[#f5f5f5] dark:bg-slate-900 text-[#666666] dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#e5e5e5] dark:border-slate-800 font-mono">
                <tr>
                  <th className="py-2.5 px-3">Barrio</th>
                  <th className="py-2.5 px-3">Cronograma Oficial</th>
                  <th className="py-2.5 px-3">Turno</th>
                  <th className="py-2.5 px-3">Horario</th>
                  <th className="py-2.5 px-3">Zona / Calles Principales</th>
                  <th className="py-2.5 px-3">Indicación al Ciudadano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5] dark:divide-slate-800">
                {displayRoutes.filter(b => {
                  if (routeDayFilter !== 'ALL' && b.group !== routeDayFilter) return false;
                  if (routeShiftFilter !== 'ALL' && b.shift !== routeShiftFilter) return false;
                  if (routeSearch.trim()) {
                    const q = routeSearch.toLowerCase();
                    return b.name.toLowerCase().includes(q) || b.mainStreets?.toLowerCase().includes(q);
                  }
                  return true;
                }).map((barrio) => (
                  <tr key={barrio.id} className="hover:bg-[#f5f5f5] dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#111111] dark:text-slate-100">
                      {barrio.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#333333] dark:text-slate-300">
                      {barrio.groupLabel}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-sm font-mono text-[10px] border border-[#111111] dark:border-slate-600 text-[#111111] dark:text-slate-200 bg-transparent">
                        {barrio.shift}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#111111] dark:text-slate-100">
                      {barrio.shiftHours}
                    </td>
                    <td className="py-2.5 px-3 text-[#666666] dark:text-slate-400 max-w-xs truncate" title={barrio.mainStreets}>
                      {barrio.mainStreets}
                    </td>
                    <td className="py-2.5 px-3 text-[#666666] dark:text-slate-400 italic text-[11px]">
                      {barrio.recommendation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pestaña 4: GESTIÓN DE USUARIOS */}
      {activeTab === 'USERS' && (
        <UserManagement />
      )}

      {/* Pestaña 5: MAPA DE CALOR & ANALÍTICA */}
      {activeTab === 'HEATMAP' && (
        <div className="p-4 rounded-sm border border-[#e5e5e5] dark:border-slate-800 bg-[#ffffff] dark:bg-slate-950 space-y-4 shadow-sm text-[#111111] dark:text-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5e5e5] dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100 flex items-center space-x-2">
                <Flame className="w-4 h-4 text-[#111111] dark:text-slate-200" />
                <span>Analítica Espacial: Concentración de Denuncias y Puntos Críticos</span>
              </h3>
              <p className="text-xs text-[#666666] dark:text-slate-400">
                Métricas calculadas a partir de las denuncias vecinales
              </p>
            </div>
            <span className="text-xs font-mono bg-[#f5f5f5] dark:bg-slate-900 text-[#111111] dark:text-slate-200 border border-[#e5e5e5] dark:border-slate-800 px-2.5 py-0.5 rounded-sm self-start sm:self-auto">
              Monitoreo Activo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 font-mono">
            <div className="p-4 bg-[#ffffff] dark:bg-slate-900/70 rounded-sm border border-[#e5e5e5] dark:border-slate-800 shadow-sm">
              <h4 className="text-[10px] text-[#666666] dark:text-slate-400 uppercase font-semibold">Zona con Más Reclamos</h4>
              <p className="text-sm font-bold text-[#111111] dark:text-slate-100 mt-1 truncate" title={analyticsData.topZone}>
                {analyticsData.topZone}
              </p>
              <p className="text-xs text-[#111111] dark:text-slate-100 mt-0.5">
                {analyticsData.maxZoneCount} reportes
              </p>
            </div>

            <div className="p-4 bg-[#ffffff] dark:bg-slate-900/70 rounded-sm border border-[#e5e5e5] dark:border-slate-800 shadow-sm">
              <h4 className="text-[10px] text-[#666666] dark:text-slate-400 uppercase font-semibold">Categoría Crítica</h4>
              <p className="text-sm font-bold text-[#111111] dark:text-slate-100 mt-1">
                {analyticsData.topCategory.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-[#111111] dark:text-slate-100 mt-0.5">
                {analyticsData.maxCatCount} incidencias
              </p>
            </div>

            <div className="p-4 bg-[#ffffff] dark:bg-slate-900/70 rounded-sm border border-[#e5e5e5] dark:border-slate-800 shadow-sm">
              <h4 className="text-[10px] text-[#666666] dark:text-slate-400 uppercase font-semibold">Tiempo Promedio de Respuesta</h4>
              <p className="text-sm font-bold text-[#111111] dark:text-slate-100 mt-1">
                {analyticsData.avgHours} Horas
              </p>
              <p className="text-xs text-[#111111] dark:text-slate-100 mt-0.5">
                {analyticsData.resolvedCount} de {analyticsData.totalReports} resueltos
              </p>
            </div>
          </div>

          {/* Desglose por Estado */}
          <div className="p-4 bg-[#f5f5f5] dark:bg-slate-900/50 rounded-sm border border-[#e5e5e5] dark:border-slate-800">
            <h4 className="text-xs font-mono uppercase text-[#111111] dark:text-slate-100 font-bold mb-3">Distribución de Casos Municipales</h4>
            <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
              <div className="p-3 bg-[#ffffff] dark:bg-slate-900 border border-[#111111] dark:border-slate-600 rounded-sm">
                <span className="text-lg font-bold text-[#111111] dark:text-slate-100 block">{analyticsData.pendingCount}</span>
                <span className="text-[#666666] dark:text-slate-400 text-[11px] uppercase">Pendientes</span>
              </div>
              <div className="p-3 bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 rounded-sm">
                <span className="text-lg font-bold text-[#111111] dark:text-slate-100 block">{analyticsData.inProgressCount}</span>
                <span className="text-[#666666] dark:text-slate-400 text-[11px] uppercase">En Proceso</span>
              </div>
              <div className="p-3 bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-slate-950 rounded-sm">
                <span className="text-lg font-bold text-[#ffffff] dark:text-slate-950 block">{analyticsData.resolvedCount}</span>
                <span className="text-[#cccccc] dark:text-slate-600 text-[11px] uppercase">Resueltos</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para visualizar fotografía en tamaño completo */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#111111]/50 dark:bg-black/70 animate-fadeIn">
          <div className="relative max-w-2xl w-full bg-[#ffffff] dark:bg-slate-900 border border-[#111111] dark:border-slate-700 rounded-sm p-4 shadow-sm space-y-3 text-[#111111] dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5] dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100">Evidencia Fotográfica de la Denuncia</h4>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 rounded-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden rounded-sm bg-[#f5f5f5] dark:bg-slate-950 border border-[#e5e5e5] dark:border-slate-800 flex items-center justify-center">
              <img
                src={selectedPhoto}
                alt="Foto denuncia"
                className="max-h-[65vh] w-auto object-contain rounded-sm"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/600x400?text=Foto+No+Disponible';
                }}
              />
            </div>
            <p className="text-[10px] font-mono text-[#666666] dark:text-slate-400 break-all">{selectedPhoto}</p>
          </div>
        </div>
      )}

      {/* Toast de Notificación de Éxito Operativo */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[3000] bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-slate-950 text-xs font-mono px-4 py-3 rounded-sm shadow-sm flex items-center space-x-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#ffffff] dark:text-slate-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal de Asignación / Atender */}
      <AssignReportModal
        isOpen={!!selectedReportForAssign}
        onClose={() => setSelectedReportForAssign(null)}
        report={selectedReportForAssign}
        trucks={trucks}
        onAssigned={handleReportAssigned}
      />

      {/* Modal de Resolución / Resolver */}
      <ResolveReportModal
        isOpen={!!selectedReportForResolve}
        onClose={() => setSelectedReportForResolve(null)}
        report={selectedReportForResolve}
        onResolved={handleReportResolved}
      />

      {/* Modal para Asignación de Chofer a Camión (Admin / Supervisor) */}
      {selectedTruckForDriver && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#111111]/50 dark:bg-black/70 animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#ffffff] dark:bg-slate-900 border border-[#111111] dark:border-slate-700 rounded-sm shadow-sm p-6 space-y-4 text-[#111111] dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5] dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 rounded-sm border border-[#e5e5e5] dark:border-slate-700">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100">
                    Asignar Chofer a {selectedTruckForDriver.code}
                  </h3>
                  <p className="text-xs text-[#666666] dark:text-slate-400 font-mono">
                    Chapa: {selectedTruckForDriver.plate_number || 'S/D'} • {selectedTruckForDriver.model || 'Recolector'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTruckForDriver(null)}
                className="p-1 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 rounded-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriverAssignment} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#111111] dark:text-slate-200 font-bold mb-1.5 uppercase text-[11px]">
                  Seleccionar Chofer Responsable
                </label>

                {selectedTruckForDriver?.assigned_user_id && (() => {
                  const currentDriver = users.find(u => u.id === selectedTruckForDriver.assigned_user_id)
                    || availableDrivers.find(u => u.id === selectedTruckForDriver.assigned_user_id);
                  return currentDriver ? (
                    <div className="mb-2 p-2.5 rounded-sm bg-[#f5f5f5] dark:bg-slate-800/80 border border-[#e5e5e5] dark:border-slate-700 flex items-center space-x-2 text-[11px]">
                      <Truck className="w-4 h-4 text-[#111111] dark:text-slate-200" />
                      <div>
                        <p className="font-bold text-[#111111] dark:text-slate-100">{currentDriver.name}</p>
                        <p className="text-[#666666] dark:text-slate-400">{currentDriver.email}{currentDriver.phone ? ` • ${currentDriver.phone}` : ''}</p>
                      </div>
                      <span className="ml-auto text-[10px] bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-slate-950 font-bold px-2 py-0.5 rounded-sm">Asignado</span>
                    </div>
                  ) : null;
                })()}

                {loadingDrivers ? (
                  <div className="w-full bg-[#f5f5f5] dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 rounded-sm p-3 text-[#666666] dark:text-slate-400 text-xs flex items-center space-x-2">
                    <RefreshCw className="animate-spin w-3.5 h-3.5 text-[#111111] dark:text-slate-200" />
                    <span>Cargando choferes disponibles...</span>
                  </div>
                ) : (
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full bg-[#ffffff] dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 text-xs rounded-sm p-2.5 focus:border-[#111111] dark:focus:border-slate-400 focus:outline-none"
                  >
                    <option value="">-- Sin Chofer Asignado (Desvincular) --</option>
                    {availableDrivers.length === 0 && !selectedTruckForDriver?.assigned_user_id && (
                      <option disabled value="">No hay choferes disponibles</option>
                    )}
                    {availableDrivers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}){u.phone ? ` — Tel: ${u.phone}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-[#666666] dark:text-slate-400 mt-1.5 font-sans">
                  El chofer asignado podrá ver este camión en su panel móvil, recibir las denuncias de su zona y reportar averías.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#e5e5e5] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedTruckForDriver(null)}
                  className="px-4 py-2 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-[#e5e5e5] dark:hover:bg-slate-700 text-[#111111] dark:text-slate-200 border border-[#cccccc] dark:border-slate-700 font-medium rounded-sm transition-colors uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDriver}
                  className="px-5 py-2 bg-[#111111] dark:bg-slate-100 hover:opacity-85 text-[#fafafa] dark:text-slate-950 font-medium rounded-sm shadow-sm transition-colors uppercase text-xs disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {savingDriver ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Guardar Asignación</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Asignación de Circuito de Barrios (Admin / Supervisor) */}
      <AssignTruckCircuitModal
        isOpen={!!selectedTruckForCircuit}
        truck={selectedTruckForCircuit}
        onClose={() => setSelectedTruckForCircuit(null)}
        onSaved={(savedRoutes) => {
          showToast(`Circuito de ${savedRoutes.length} barrios actualizado con éxito`);
          fetchData();
        }}
      />

      {/* Modal de Optimización de Denuncias con VROOM (OpenRouteService) */}
      <OptimizeReportsModal
        isOpen={isOptimizeModalOpen}
        onClose={() => setIsOptimizeModalOpen(false)}
        selectedReportIds={selectedReportIds}
        reports={reports}
        trucks={trucks}
        onOptimizationApplied={(optResult, conflicts) => {
          setSelectedReportIds([]);
          if (conflicts && conflicts.length > 0) {
            showToast(`Ruta despachada parcialmente (${conflicts.length} denuncias omitidas por conflicto)`);
          } else {
            showToast(`Ruta despachada con éxito (${optResult.summary?.total_stops || 0} paradas asignadas)`);
          }
          fetchData();
        }}
      />
      {/* Notificación Toast Flotante (Monochrome) */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[4000] bg-[#111111] text-[#ffffff] dark:bg-slate-100 dark:text-slate-950 px-4 py-2.5 rounded-sm shadow-2xl border border-[#cccccc] dark:border-slate-700 text-xs font-mono flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
            title="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
