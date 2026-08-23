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
  Calendar,
  Search,
  MapPin,
  Users,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Wrench,
  AlertTriangle,
  Eye,
  X
} from 'lucide-react';
import { ReportsAPI, FleetAPI, RoutesAPI, UsersAPI } from '../../services/api';
import { OFFICIAL_BARRIOS, COLOR_PALETTE } from '../../data/officialRoutes';
import { UserManagement } from './UserManagement';
import { AssignReportModal } from './AssignReportModal';
import { ResolveReportModal } from './ResolveReportModal';
import { useAuth } from '../../context/AuthContext';

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

  const handleReportAssigned = (updatedReport) => {
    setReports(prev =>
      prev.map(r => (r.id === updatedReport.id ? { ...r, ...updatedReport } : r))
    );
    setToastMessage(`Denuncia ${updatedReport.ticket_number || ''} asignada y pasada a EN PROCESO.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleReportResolved = (updatedReport) => {
    setReports(prev =>
      prev.map(r => (r.id === updatedReport.id ? { ...r, ...updatedReport } : r))
    );
    setToastMessage(`Denuncia ${updatedReport.ticket_number || ''} marcada como RESUELTA con éxito.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenAssignDriverModal = (truck) => {
    setSelectedTruckForDriver(truck);
    setSelectedDriverId(truck.assigned_user_id || '');
  };

  const handleSaveDriverAssignment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTruckForDriver) return;
    setSavingDriver(true);
    try {
      const res = await FleetAPI.assignDriver(selectedTruckForDriver.id, selectedDriverId || null);
      const updated = res.data?.data;
      if (updated) {
        setTrucks(prev => prev.map(t => t.id === selectedTruckForDriver.id ? { ...t, ...updated, assigned_user_id: selectedDriverId || null } : t));
        const choferObj = users.find(u => u.id === selectedDriverId);
        setToastMessage(
          selectedDriverId
            ? `Chofer ${choferObj?.name || 'municipal'} asignado al camión ${selectedTruckForDriver.code}`
            : `Camión ${selectedTruckForDriver.code} desasignado correctamente`
        );
        setTimeout(() => setToastMessage(null), 4000);
      }
      setSelectedTruckForDriver(null);
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

    // Buscar el último registro para precargar chofer y odómetro
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
      setToastMessage('Selecciona un camión y escribe el nombre del chofer');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    try {
      const res = await FleetAPI.createLog(newLog);
      const created = res.data?.data;
      const newStatus = newLog.action === 'SALIDA' ? 'EN_RUTA' : 'DISPONIBLE';

      // Actualizar estado de la flota reactivamente
      setTrucks(prev => prev.map(t => t.id === newLog.truck_id ? { ...t, status: newStatus } : t));
      
      if (created) {
        setFleetLogs(prev => [created, ...prev]);
      } else {
        fetchData();
      }

      setToastMessage(`Movimiento de ${newLog.action} grabado exitosamente en Supabase`);
      setTimeout(() => setToastMessage(null), 4000);

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
    // Categorías
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

    // Zonas / Referencias
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

    // Tiempo promedio de resolución (en horas)
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
          color_hex: r.color_hex || '#10B981',
          mainStreets: geo.mainStreets || r.zone,
          recommendation: geo.recommendation || 'Disponer bolsas cerradas antes del inicio del turno',
          is_active: r.is_active
        };
      });
    }
    return OFFICIAL_BARRIOS;
  }, [routes]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Encabezado del Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Dirección de Servicios Urbanos - Asunción
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Supabase DB Conectada
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
            Panel de Control y Gestión Operativa
          </h1>
          <p className="text-sm text-slate-400">
            Monitoreo en tiempo real de flota, denuncias vecinales y métricas de recolección
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center space-x-2 self-start md:self-auto bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-4 py-2.5 rounded-xl border border-slate-700 transition shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Denuncias Pendientes</p>
            <h3 className="text-2xl font-black text-rose-400 mt-1">{pendingReportsCount}</h3>
            <span className="text-[11px] text-rose-500 flex items-center mt-1">
              <AlertOctagon className="w-3 h-3 mr-1" /> Requieren atención
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <AlertOctagon className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Camiones en Ruta</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{activeTrucksCount}</h3>
            <span className="text-[11px] text-emerald-400 flex items-center mt-1">
              <Truck className="w-3 h-3 mr-1" /> De {trucks.length} unidades operativas
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Basura Registrada en Bitácora</p>
            <h3 className="text-2xl font-black text-blue-400 mt-1">{totalWeightTon} Tn</h3>
            <span className="text-[11px] text-blue-400 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" /> Descargas en Cateura
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Tasa de Resolución</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{resolutionRate}%</h3>
            <span className="text-[11px] text-amber-400 flex items-center mt-1">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Reclamos atendidos
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl transition whitespace-nowrap ${
            activeTab === 'REPORTS'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>Gestión de Denuncias ({reports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('FLEET')}
          className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl transition whitespace-nowrap ${
            activeTab === 'FLEET'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Control de Flota (Bitácora {fleetLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ROUTES')}
          className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl transition whitespace-nowrap ${
            activeTab === 'ROUTES'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Map className="w-4 h-4" />
          <span>Cronogramas Oficiales ({displayRoutes.length} Barrios)</span>
        </button>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('USERS')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl transition whitespace-nowrap ${
              activeTab === 'USERS'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestión de Usuarios</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('HEATMAP')}
          className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-xl transition whitespace-nowrap ${
            activeTab === 'HEATMAP'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Mapa de Calor & Analítica</span>
        </button>
      </div>

      {/* Pestaña 1: GESTIÓN DE DENUNCIAS */}
      {activeTab === 'REPORTS' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Denuncias Registradas en Supabase</h2>
            <span className="text-xs text-slate-400">Total: {reports.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4">Acciones</th>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Ciudadano</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-4">Ubicación / Ref</th>
                  <th className="py-3 px-4">Foto</th>
                  <th className="py-3 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-500">
                      No hay denuncias registradas en la base de datos actualmente.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 space-x-1.5 whitespace-nowrap">
                        {r.status === 'PENDIENTE' && (
                          <button
                            onClick={() => setSelectedReportForAssign(r)}
                            className="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded text-[11px] font-medium transition shadow-sm"
                          >
                            Atender
                          </button>
                        )}
                        {r.status !== 'RESUELTO' && (
                          <button
                            onClick={() => setSelectedReportForResolve(r)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-[11px] font-medium transition shadow-sm"
                          >
                            Resolver
                          </button>
                        )}
                        {r.status === 'RESUELTO' && (
                          <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            Completado
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {r.ticket_number || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white text-[11px]">
                            {r.created_at ? new Date(r.created_at).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/D'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {r.created_at ? new Date(r.created_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }) + ' hs' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white block">{r.citizen_name || 'Anónimo'}</span>
                        {r.citizen_phone && <span className="text-[10px] text-slate-400">{r.citizen_phone}</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap">
                          {r.category?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate" title={r.description}>
                        {r.description}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-[200px] truncate" title={r.address_reference}>
                        {r.address_reference || `${r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4)}`}
                      </td>
                      <td className="py-3.5 px-4">
                        {r.photo_urls && r.photo_urls.length > 0 ? (
                          <button
                            onClick={() => setSelectedPhoto(r.photo_urls[0])}
                            className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 text-[11px]"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver ({r.photo_urls.length})</span>
                          </button>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Sin foto</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] whitespace-nowrap ${
                            r.status === 'PENDIENTE'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : r.status === 'EN_PROCESO'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
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
        </div>
      )}

      {/* Pestaña 2: CONTROL DE FLOTA Y BITÁCORA */}
      {activeTab === 'FLEET' && (() => {
        const selectedTruck = trucks.find(t => t.id === newLog.truck_id);
        const assignedReportsToSelected = selectedTruck ? getAssignedReportsForTruck(selectedTruck.id, selectedTruck.code) : [];

        return (
          <div className="space-y-6">
            {/* Panel de Unidades de Flota y Asignación de Choferes */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Truck className="w-5 h-5 text-emerald-400" />
                    <span>Unidades de Flota & Asignación de Choferes</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Parque automotor municipal: vinculación de choferes para recepción de denuncias operativas
                  </p>
                </div>
                <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full self-start sm:self-auto">
                  {trucks.length} Unidades Activas
                </span>
              </div>

              {/* Grid de Camiones */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {trucks.map((t) => {
                  const assignedDriver = users.find(u => u.id === t.assigned_user_id);
                  const truckReports = getAssignedReportsForTruck(t.id, t.code);
                  
                  return (
                    <div
                      key={t.id}
                      className="glass-card p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 hover:border-slate-700 transition space-y-3 flex flex-col justify-between"
                    >
                      {/* Cabecera del Camión */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-white text-base tracking-tight bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700 font-mono">
                              {t.code}
                            </span>
                            <span className="text-xs font-mono text-slate-400 font-semibold">
                              {t.plate_number || 'S/D'}
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === 'EN_RUTA'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                                : t.status === 'FUERA_DE_SERVICIO' || t.status === 'EN_MANTENIMIENTO'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {t.status === 'FUERA_DE_SERVICIO' ? '⚠️ AVERIADO' : t.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 font-medium">
                          {t.model || 'Camión Recolector Compactador'}
                        </p>
                        
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span>Capacidad: <strong className="text-slate-200">{t.capacity_tons || 12} Tn</strong></span>
                          <span>Ruta: <strong className="text-emerald-400">{t.routes?.name || t.routes?.zone || 'General'}</strong></span>
                        </div>
                      </div>

                      {/* Denuncias asignadas activas */}
                      {truckReports.length > 0 && (
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center justify-between font-medium">
                          <span>📌 {truckReports.length} {truckReports.length === 1 ? 'denuncia en proceso' : 'denuncias en proceso'}</span>
                        </div>
                      )}

                      {/* Caja de Chofer Asignado */}
                      <div className="pt-2 border-t border-slate-800">
                        {assignedDriver ? (
                          <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className="text-base">🚚</span>
                              <div className="truncate">
                                <p className="font-bold text-white text-xs truncate">{assignedDriver.name}</p>
                                <p className="text-[10px] text-cyan-300/80 truncate">{assignedDriver.phone || assignedDriver.email}</p>
                              </div>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => handleOpenAssignDriverModal(t)}
                                className="ml-2 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2.5 py-1 rounded-lg border border-slate-700 transition shrink-0"
                              >
                                Cambiar
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-dashed border-slate-700 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 italic flex items-center space-x-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 inline mr-1" />
                              Sin chofer
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => handleOpenAssignDriverModal(t)}
                                className="text-[10px] font-bold bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-lg transition shrink-0"
                              >
                                Asignar Chofer
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fila Inferior: Formulario de Registro de Salida / Entrada + Bitácora Reciente */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulario de Registro de Salida / Entrada */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                  <span>Registrar Movimiento de Flota</span>
                </h3>

              <form onSubmit={handleCreateFleetLog} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Camión Recolector</label>
                  <select
                    value={newLog.truck_id}
                    onChange={(e) => handleTruckSelect(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                    required
                  >
                    <option value="">-- Seleccionar Unidad de Flota --</option>
                    {trucks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} ({t.plate_number}) - {t.model || 'Recolector'} [{t.status}]
                      </option>
                    ))}
                  </select>

                  {selectedTruck && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className={`w-2 h-2 rounded-full ${selectedTruck.status === 'EN_RUTA' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                          <span className="text-slate-300">
                            Estado: <strong className={selectedTruck.status === 'EN_RUTA' ? 'text-amber-300' : 'text-emerald-300'}>
                              {selectedTruck.status === 'EN_RUTA' ? '🔴 En Ruta (Esperando Entrada)' : '🟢 Disponible en Base (Listo para Salida)'}
                            </strong>
                          </span>
                        </div>
                        {assignedReportsToSelected.length > 0 && (
                          <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                            📌 {assignedReportsToSelected.length} {assignedReportsToSelected.length === 1 ? 'denuncia' : 'denuncias'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Nombre del Chofer / Responsable</label>
                  <input
                    type="text"
                    placeholder="Ej: Ramón Benítez"
                    value={newLog.driver_name}
                    onChange={(e) => setNewLog({ ...newLog, driver_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Acción</label>
                    <select
                      value={newLog.action}
                      onChange={(e) => setNewLog({ ...newLog, action: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none font-semibold"
                    >
                      <option value="SALIDA" disabled={selectedTruck?.status === 'EN_RUTA'}>
                        🟢 SALIDA a Ruta {selectedTruck?.status === 'EN_RUTA' ? '(En Ruta)' : ''}
                      </option>
                      <option value="ENTRADA" disabled={selectedTruck?.status === 'DISPONIBLE'}>
                        🔴 ENTRADA a Base {selectedTruck?.status === 'DISPONIBLE' ? '(En Base)' : ''}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Combustible (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newLog.fuel_level_percent}
                      onChange={(e) => setNewLog({ ...newLog, fuel_level_percent: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Odómetro (Km)</label>
                    <input
                      type="number"
                      placeholder="Ej: 45200"
                      value={newLog.odometer_km}
                      onChange={(e) => setNewLog({ ...newLog, odometer_km: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                    />
                  </div>

                  {newLog.action === 'ENTRADA' ? (
                    <div>
                      <label className="block text-slate-400 mb-1">Peso Descargado (Kg)</label>
                      <input
                        type="number"
                        placeholder="Ej: 4500"
                        value={newLog.waste_weight_kg}
                        onChange={(e) => setNewLog({ ...newLog, waste_weight_kg: Number(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="opacity-50">
                      <label className="block text-slate-500 mb-1">Peso (Sólo Entrada)</label>
                      <input
                        type="text"
                        disabled
                        value="0 Kg en salida"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Observaciones</label>
                  <textarea
                    rows={2}
                    placeholder="Incidencias mecánicas, zona recorrida..."
                    value={newLog.notes}
                    onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition shadow-md"
                >
                  Guardar en Bitácora (Supabase)
                </button>
              </form>
            </div>

            {/* Historial de Bitácora Reciente desde Supabase */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <span>Bitácora de Entradas y Salidas Recientes (Supabase)</span>
                </h3>
                <span className="text-xs text-slate-400">{fleetLogs.length} registros</span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {fleetLogs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                    No hay movimientos registrados en la bitácora todavía. Registra una entrada o salida.
                  </div>
                ) : (
                  fleetLogs.map((log) => {
                    const truckObj = trucks.find(t => t.id === log.truck_id || t.code === log.trucks?.code);
                    const isStillInRoute = truckObj ? truckObj.status === 'EN_RUTA' : false;
                    const assignedReports = getAssignedReportsForTruck(log.truck_id || truckObj?.id, log.trucks?.code || truckObj?.code);
                    const assignedCount = assignedReports.length;

                    return (
                      <div key={log.id} className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs hover:bg-slate-800/90 transition">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${log.action === 'SALIDA' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {log.action === 'SALIDA' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                                <span>{log.trucks?.code || truckObj?.code || 'Camión'} • {log.action}</span>
                                {(log.trucks?.plate_number || truckObj?.plate_number) && (
                                  <span className="text-[10px] font-normal text-slate-400 font-mono">[{log.trucks?.plate_number || truckObj?.plate_number}]</span>
                                )}
                              </h4>
                              {assignedCount > 0 && (
                                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium flex items-center space-x-1">
                                  <span>📌 {assignedCount} {assignedCount === 1 ? 'denuncia asignada' : 'denuncias asignadas'}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 mt-0.5">
                              Chofer: <strong className="text-slate-300">{log.driver_name}</strong>
                              {log.notes ? ` • "${log.notes}"` : ''}
                            </p>
                            <div className="flex items-center space-x-3 text-[10px] text-slate-400 mt-1">
                              {log.odometer_km ? <span>Km: {Number(log.odometer_km).toLocaleString()}</span> : null}
                              {log.fuel_level_percent !== undefined ? <span>Combustible: {log.fuel_level_percent}%</span> : null}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end">
                          <span className="font-medium text-slate-300 block font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                          {log.waste_weight_kg > 0 && (
                            <span className="text-emerald-400 font-bold mt-1 inline-block bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
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
                              className="mt-2 text-[10px] font-bold bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-lg transition flex items-center space-x-1"
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
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Map className="w-5 h-5 text-emerald-400" />
                <span>Base Oficial de Rutas y Horarios por Barrio (Supabase)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Cartografía oficial de los 59 barrios de Asunción con frecuencias, turnos y horarios de recolección
              </p>
            </div>

            {/* Filtros de la tabla */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar barrio o calle..."
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <select
                value={routeDayFilter}
                onChange={(e) => setRouteDayFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">Todos los Días</option>
                <option value="MARTES_JUEVES_SABADO">Martes, Jueves y Sábado</option>
                <option value="LUNES_MIERCOLES_VIERNES">Lunes, Miércoles y Viernes</option>
              </select>

              <select
                value={routeShiftFilter}
                onChange={(e) => setRouteShiftFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">Todos los Turnos</option>
                <option value="Mañana">Mañana (06:00 - 12:00)</option>
                <option value="Tarde">Tarde (12:00 - 18:00)</option>
                <option value="Noche">Noche (19:00 - 02:00)</option>
              </select>
            </div>
          </div>

          {/* Tabla de Barrios Oficiales */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4">Barrio</th>
                  <th className="py-3 px-4">Cronograma Oficial</th>
                  <th className="py-3 px-4">Turno</th>
                  <th className="py-3 px-4">Horario</th>
                  <th className="py-3 px-4">Zona / Calles Principales</th>
                  <th className="py-3 px-4">Indicación al Ciudadano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {displayRoutes.filter(b => {
                  if (routeDayFilter !== 'ALL' && b.group !== routeDayFilter) return false;
                  if (routeShiftFilter !== 'ALL' && b.shift !== routeShiftFilter) return false;
                  if (routeSearch.trim()) {
                    const q = routeSearch.toLowerCase();
                    return b.name.toLowerCase().includes(q) || b.mainStreets?.toLowerCase().includes(q);
                  }
                  return true;
                }).map((barrio) => (
                  <tr key={barrio.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: barrio.color_hex }} />
                      <span>{barrio.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-200">{barrio.groupLabel}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        barrio.shift === 'Mañana' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        barrio.shift === 'Tarde' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {barrio.shift}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {barrio.shiftHours}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={barrio.mainStreets}>
                      {barrio.mainStreets}
                    </td>
                    <td className="py-3 px-4 text-slate-400 italic text-[11px]">
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
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Flame className="w-5 h-5 text-rose-500" />
                <span>Analítica Espacial: Concentración de Denuncias y Puntos Críticos</span>
              </h3>
              <p className="text-xs text-slate-400">
                Métricas dinámicas calculadas a partir de las denuncias registradas en Supabase
              </p>
            </div>
            <span className="text-xs font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full self-start sm:self-auto">
              Supabase PostGIS Live
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <h4 className="text-xs text-slate-400 uppercase font-semibold">Zona con Más Reclamos</h4>
              <p className="text-base font-bold text-white mt-1 truncate" title={analyticsData.topZone}>
                {analyticsData.topZone}
              </p>
              <p className="text-xs text-rose-400 mt-0.5">
                {analyticsData.maxZoneCount} reportes registrados
              </p>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <h4 className="text-xs text-slate-400 uppercase font-semibold">Categoría Crítica</h4>
              <p className="text-base font-bold text-white mt-1">
                {analyticsData.topCategory.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-amber-400 mt-0.5">
                {analyticsData.maxCatCount} incidencias reportadas
              </p>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <h4 className="text-xs text-slate-400 uppercase font-semibold">Tiempo Promedio de Respuesta</h4>
              <p className="text-base font-bold text-white mt-1">
                {analyticsData.avgHours} Horas
              </p>
              <p className="text-xs text-emerald-400 mt-0.5">
                {analyticsData.resolvedCount} de {analyticsData.totalReports} casos resueltos
              </p>
            </div>
          </div>

          {/* Desglose por Estado */}
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/40">
            <h4 className="text-xs font-bold text-slate-300 mb-3">Distribución de Casos Municipales</h4>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <span className="text-lg font-extrabold text-rose-400 block">{analyticsData.pendingCount}</span>
                <span className="text-slate-400 text-[11px]">Pendientes</span>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <span className="text-lg font-extrabold text-amber-400 block">{analyticsData.inProgressCount}</span>
                <span className="text-slate-400 text-[11px]">En Proceso</span>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <span className="text-lg font-extrabold text-emerald-400 block">{analyticsData.resolvedCount}</span>
                <span className="text-slate-400 text-[11px]">Resueltos</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para visualizar fotografía en tamaño completo */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white">Evidencia Fotográfica de la Denuncia</h4>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center">
              <img
                src={selectedPhoto}
                alt="Foto denuncia"
                className="max-h-[65vh] w-auto object-contain rounded-lg"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/600x400?text=Foto+No+Disponible';
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400 break-all">{selectedPhoto}</p>
          </div>
        </div>
      )}

      {/* Toast de Notificación de Éxito Operativo */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[3000] bg-slate-900 border border-emerald-500/50 text-emerald-300 text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 animate-fadeIn">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
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
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Asignar Chofer a {selectedTruckForDriver.code}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Chapa: {selectedTruckForDriver.plate_number || 'S/D'} • {selectedTruckForDriver.model || 'Recolector'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTruckForDriver(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriverAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Seleccionar Chofer Responsable
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">-- Sin Chofer Asignado (Desvincular) --</option>
                  
                  {users.filter(u => u.role === 'chofer').length > 0 && (
                    <optgroup label="Choferes Registrados (Rol: Chofer)">
                      {users
                        .filter(u => u.role === 'chofer')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            🚚 {u.name} ({u.email}) {u.phone ? `- Tel: ${u.phone}` : ''}
                          </option>
                        ))}
                    </optgroup>
                  )}

                  {users.filter(u => u.role !== 'chofer' && u.role !== 'admin').length > 0 && (
                    <optgroup label="Otros Funcionarios Operativos">
                      {users
                        .filter(u => u.role !== 'chofer' && u.role !== 'admin')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            👤 {u.name} ({u.email}) [{u.role?.toUpperCase()}]
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  El chofer asignado podrá ver este camión en su panel móvil, recibir las denuncias de su zona y reportar averías.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedTruckForDriver(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDriver}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-950/40 transition disabled:opacity-50 flex items-center space-x-1.5"
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
    </div>
  );
};
