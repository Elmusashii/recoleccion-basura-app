import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Trash2, 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  Menu, 
  X, 
  Activity, 
  Info,
  Calendar,
  CheckCircle2,
  HelpCircle,
  LogIn,
  LogOut,
  User,
  Lock
} from 'lucide-react';
import { CitizenMap } from './components/citizen/CitizenMap';
import { ReportModal } from './components/citizen/ReportModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { DriverDashboard } from './components/driver/DriverDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { ReportsAPI } from './services/api';
import { useAuth } from './context/AuthContext';

export function App() {
  const { user, logout, isAuthenticated, sessionExpiredNotice, dismissExpiredNotice } = useAuth();
  const [currentView, setCurrentView] = useState('CITIZEN'); // 'CITIZEN' | 'ADMIN'
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedBarrioForReport, setSelectedBarrioForReport] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [reports, setReports] = useState([]);
  
  // Modal para consultar estado de Ticket
  const [isSearchTicketOpen, setIsSearchTicketOpen] = useState(false);
  const [searchTicketQuery, setSearchTicketQuery] = useState('');
  const [ticketResult, setTicketResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Carga inicial de denuncias para marcadores en el mapa
  useEffect(() => {
    ReportsAPI.getAll({ limit: 100 })
      .then((res) => {
        setReports(res.data?.data?.reports || []);
      })
      .catch((err) => {
        console.warn('API de denuncias offline o inicializando:', err);
      });
  }, []);

  // Denuncias activas para el mapa (excluye RESUELTO y RECHAZADO)
  const activeMapReports = React.useMemo(() => {
    return reports.filter(r => r.status !== 'RESUELTO' && r.status !== 'RECHAZADO');
  }, [reports]);

  const handleReportCreated = (newReport) => {
    if (newReport) {
      setReports((prev) => [newReport, ...prev]);
    }
  };

  const handleOpenReportModal = (barrioData = null) => {
    setSelectedBarrioForReport(barrioData);
    setIsReportModalOpen(true);
  };

  const handleSearchTicket = async (e) => {
    e.preventDefault();
    if (!searchTicketQuery.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setTicketResult(null);

    try {
      const res = await ReportsAPI.getByTicket(searchTicketQuery.trim());
      setTicketResult(res.data?.data);
    } catch (err) {
      setSearchError('No se encontró ninguna denuncia con ese código de ticket.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSwitchToAdmin = () => {
    if (isAuthenticated) {
      setCurrentView('ADMIN');
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentView('CITIZEN');
  };

  return (
    <div className="h-full h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white overflow-hidden">
      {/* Banner de Aviso de Sesión Expirada */}
      {sessionExpiredNotice && (
        <div className="shrink-0 bg-amber-500/20 border-b border-amber-500/30 text-amber-300 text-xs px-4 py-2 flex items-center justify-between z-50">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Tu sesión ha expirado por inactividad de 15 minutos. Inicia sesión nuevamente para continuar en el panel interno.</span>
          </div>
          <button 
            onClick={dismissExpiredNotice}
            className="text-amber-300 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra de Navegación Principal */}
      <header className="shrink-0 z-50 glass-panel border-b border-slate-800/80 px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo y Nombre del Municipio */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('CITIZEN')}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/30 border border-emerald-400/30 shrink-0">
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">ASUNCIÓN LIMPIA</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Municipalidad
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Rutas de Recolección y Denuncias</p>
            </div>
          </div>

          {/* Navegación y Selector de Rol / Modo */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setIsSearchTicketOpen(true)}
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-2.5 sm:px-3 py-2 rounded-xl border border-slate-700/60 transition"
              title="Consultar estado de denuncia por ticket"
            >
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Consultar Ticket</span>
            </button>

            {/* Selector de Vistas: SOLAMENTE para usuarios autenticados */}
            {isAuthenticated && (
              <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center animate-fadeIn">
                <button
                  onClick={() => setCurrentView('CITIZEN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentView === 'CITIZEN'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Portal Ciudadano
                </button>
                <button
                  onClick={handleSwitchToAdmin}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentView === 'ADMIN'
                      ? user?.role === 'chofer'
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {user?.role === 'chofer' ? (
                    <>
                      <span className="text-xs">🚚</span>
                      <span>Panel Chofer</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Panel Interno</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Perfil de Usuario o Botón Login */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-2 pl-1 sm:pl-2 border-l border-slate-800">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-white truncate max-w-[130px]">{user.name}</span>
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">{user.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center space-x-1.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-3 sm:px-3.5 py-2 rounded-xl shadow-md transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Iniciar Sesión</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Dinámico de la Aplicación */}
      <main className={`flex-1 w-full mx-auto min-h-0 ${currentView === 'CITIZEN' ? 'h-full p-2 sm:p-4 lg:p-6 overflow-hidden max-w-7xl' : 'overflow-y-auto p-4 lg:p-6 max-w-7xl'}`}>
        {currentView === 'CITIZEN' ? (
          <div className="h-full w-full overflow-hidden">
            <CitizenMap
              reports={activeMapReports}
              onOpenReportModal={handleOpenReportModal}
            />
          </div>
        ) : isAuthenticated ? (
          user?.role === 'chofer' ? (
            <DriverDashboard />
          ) : (
            <AdminDashboard />
          )
        ) : (
          <div className="max-w-md mx-auto my-16 p-8 glass-panel rounded-3xl border border-slate-800 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Acceso Restringido</h2>
            <p className="text-xs text-slate-400">
              El panel interno de Servicios Urbanos requiere inicio de sesión con credenciales de funcionario municipal.
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition"
            >
              Iniciar Sesión como Funcionario
            </button>
          </div>
        )}
      </main>

      {/* Modal de Denuncia Ciudadana con Barrio Precargado */}
      <ReportModal
        isOpen={isReportModalOpen}
        initialBarrio={selectedBarrioForReport}
        onClose={() => {
          setIsReportModalOpen(false);
          setSelectedBarrioForReport(null);
        }}
        onReportCreated={handleReportCreated}
      />

      {/* Modal de Autenticación / Login */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => setCurrentView('ADMIN')}
      />

      {/* Modal de Consulta de Ticket */}
      {isSearchTicketOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <Search className="w-4 h-4 text-emerald-400" />
                <span>Consultar Estado de Denuncia</span>
              </h3>
              <button
                onClick={() => setIsSearchTicketOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSearchTicket} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Ingresa tu número de Ticket</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: ASU-20260820-4521"
                  value={searchTicketQuery}
                  onChange={(e) => setSearchTicketQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm font-mono rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={searchLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition text-xs flex items-center justify-center space-x-2"
              >
                {searchLoading ? <span>Buscando...</span> : <span>Buscar Ticket</span>}
              </button>
            </form>

            {searchError && (
              <p className="mt-3 text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                {searchError}
              </p>
            )}

            {ticketResult && (
              <div className="mt-4 p-4 bg-slate-800/70 border border-slate-700 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-emerald-400 font-bold">{ticketResult.ticket_number}</span>
                  <span className="px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300">
                    {ticketResult.status}
                  </span>
                </div>
                <p className="text-slate-300"><strong>Detalle:</strong> {ticketResult.description}</p>
                {ticketResult.admin_notes && (
                  <p className="text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-800">
                    <strong>Respuesta Municipal:</strong> {ticketResult.admin_notes}
                  </p>
                )}
                <p className="text-[10px] text-slate-500">Fecha de registro: {new Date(ticketResult.created_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
