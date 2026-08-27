import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Map,
  Trash2,
  Shield,
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
  Lock,
  Truck,
  Sun,
  Moon
} from 'lucide-react';
import { CitizenMap } from './components/citizen/CitizenMap';
import { ReportModal } from './components/citizen/ReportModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { DriverDashboard } from './components/driver/DriverDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { ReloadPrompt } from './components/ReloadPrompt';
import { InstallPwaPrompt } from './components/InstallPwaPrompt';
import { ReportsAPI } from './services/api';
import { useAuth } from './context/AuthContext';

export function App() {
  const { user, logout, isAuthenticated, sessionExpiredNotice, dismissExpiredNotice } = useAuth();
  const [currentView, setCurrentView] = useState('CITIZEN'); // 'CITIZEN' | 'ADMIN'
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedBarrioForReport, setSelectedBarrioForReport] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [reports, setReports] = useState([]);

  // Estado del Modo Oscuro / Claro
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('app-theme');
      if (saved) return saved === 'dark';
      return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('app-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('app-theme', 'light');
      }
    } catch (e) {
      console.warn('Error al sincronizar tema:', e);
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(prev => !prev);

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
  const activeMapReports = useMemo(() => {
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
    <div className="h-full h-[100dvh] w-full bg-[#fafafa] dark:bg-[#090d16] text-[#111111] dark:text-slate-100 flex flex-col font-sans overflow-hidden transition-colors duration-200">
      {/* Banner de Aviso de Sesión Expirada */}
      {sessionExpiredNotice && (
        <div className="shrink-0 bg-[#111111] dark:bg-slate-900 text-[#ffffff] text-xs px-4 py-2 flex items-center justify-between border-b border-[#111111] dark:border-slate-800 z-50">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-[#ffffff] shrink-0" />
            <span>Tu sesión ha expirado por inactividad. Inicia sesión nuevamente para continuar en el panel interno.</span>
          </div>
          <button
            onClick={dismissExpiredNotice}
            className="text-[#ffffff] hover:opacity-80 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra de Navegación Principal */}
      <header className="shrink-0 z-50 bg-[#ffffff] dark:bg-[#0b0f19] border-b border-[#e5e5e5] dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3 text-[#111111] dark:text-slate-100 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo y Nombre del Municipio */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('CITIZEN')}>
            <div className="w-8 h-8 border border-[#111111] dark:border-slate-700 bg-[#111111] dark:bg-slate-900 text-[#fafafa] flex items-center justify-center rounded-sm shrink-0">
              <Trash2 className="w-4 h-4 text-[#fafafa]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-[#111111] dark:text-slate-100">ASUNCIÓN LIMPIA</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-mono tracking-wider border border-[#cccccc] dark:border-slate-700 text-[#666666] dark:text-slate-400 px-1.5 py-0.5 rounded-sm bg-transparent">
                  Municipalidad
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#666666] dark:text-slate-400">Rutas de Recolección y Denuncias</p>
            </div>
          </div>

          {/* Navegación y Selector de Rol / Modo */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Botón Toggle de Modo Oscuro / Claro */}
            <button
              onClick={toggleTheme}
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Alternar tema"
              className="p-2 rounded-sm border border-[#e5e5e5] dark:border-slate-800 text-[#111111] dark:text-slate-100 bg-[#f5f5f5] dark:bg-slate-900 hover:bg-[#e5e5e5] dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <button
              onClick={() => setIsSearchTicketOpen(true)}
              className="flex items-center space-x-1.5 text-xs text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 bg-[#f5f5f5] dark:bg-slate-900 hover:bg-[#e5e5e5] dark:hover:bg-slate-800 px-2.5 sm:px-3 py-1.5 rounded-sm border border-[#e5e5e5] dark:border-slate-800 transition-colors font-medium font-mono"
              title="Consultar estado de denuncia por ticket"
            >
              <Search className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400" />
              <span className="hidden md:inline">Consultar Ticket</span>
            </button>

            {/* Botón de Instalación PWA */}
            <InstallPwaPrompt />

            {/* Selector de Vistas: SOLAMENTE para usuarios autenticados */}
            {isAuthenticated && (
              <div className="bg-[#f5f5f5] dark:bg-slate-900 p-0.5 rounded-sm border border-[#e5e5e5] dark:border-slate-800 flex items-center animate-fadeIn font-mono text-xs">
                <button
                  onClick={() => setCurrentView('CITIZEN')}
                  className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-sm font-medium transition-colors ${
                    currentView === 'CITIZEN'
                      ? 'bg-[#111111] dark:bg-slate-800 text-[#fafafa]'
                      : 'bg-transparent text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100'
                  }`}
                  title="Portal Ciudadano"
                >
                  <Map className="w-3.5 h-3.5"/>
                  <span className="hidden md:inline">Portal Ciudadano</span>
                </button>
                <button
                  onClick={handleSwitchToAdmin}
                  className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-sm font-medium transition-colors ${
                    currentView === 'ADMIN'
                      ? 'bg-[#111111] dark:bg-slate-800 text-[#fafafa]'
                      : 'bg-transparent text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100'
                  }`}
                  title={user?.role === 'chofer' ? "Panel Chofer" : "Panel Interno"}
                >
                  {user?.role === 'chofer' ? (
                    <>
                      <Truck className="w-3.5 h-3.5"/>
                      <span className="hidden md:inline">Panel Chofer</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5"/>
                      <span className="hidden md:inline">Panel Interno</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Perfil de Usuario o Botón Login */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-2 pl-1 sm:pl-2 border-l border-[#e5e5e5] dark:border-slate-800">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-medium font-mono text-[#111111] dark:text-slate-100 truncate max-w-[130px]">{user?.name || user?.email || 'Usuario'}</span>
                  <span className="text-[10px] text-[#666666] dark:text-slate-400 uppercase font-mono">{user?.role || 'Funcionario'}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 bg-[#f5f5f5] dark:bg-slate-900 hover:bg-[#e5e5e5] dark:hover:bg-slate-800 rounded-sm border border-[#e5e5e5] dark:border-slate-800 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center space-x-1.5 text-xs font-medium font-mono bg-[#111111] hover:opacity-85 dark:bg-slate-100 dark:hover:bg-white text-[#fafafa] dark:text-[#111111] px-3 sm:px-3.5 py-1.5 rounded-sm border border-[#111111] dark:border-slate-100 shadow-sm transition-colors uppercase tracking-wider"
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
              darkMode={darkMode}
            />
          </div>
        ) : isAuthenticated ? (
          user?.role === 'chofer' ? (
            <DriverDashboard darkMode={darkMode} />
          ) : (
            <AdminDashboard darkMode={darkMode} />
          )
        ) : (
          <div className="max-w-md mx-auto my-16 p-8 bg-[#ffffff] dark:bg-slate-900 rounded-sm border border-[#e5e5e5] dark:border-slate-800 text-center space-y-4 shadow-sm text-[#111111] dark:text-slate-100">
            <div className="w-12 h-12 mx-auto rounded-sm bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-100 flex items-center justify-center border border-[#e5e5e5] dark:border-slate-700">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold uppercase tracking-tight">Acceso Restringido</h2>
            <p className="text-xs text-[#666666] dark:text-slate-400">
              El panel interno de Servicios Urbanos requiere inicio de sesión con credenciales de funcionario municipal.
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full bg-[#111111] hover:opacity-85 dark:bg-slate-100 dark:hover:bg-white text-[#fafafa] dark:text-[#111111] font-medium py-2.5 rounded-sm text-xs transition-colors font-mono uppercase tracking-wider"
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#111111]/50 dark:bg-black/70 animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#ffffff] dark:bg-slate-900 border border-[#111111] dark:border-slate-700 rounded-sm shadow-sm p-6 text-[#111111] dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5] dark:border-slate-800">
              <h3 className="font-bold text-sm uppercase tracking-tight flex items-center space-x-2">
                <Search className="w-4 h-4 text-[#111111] dark:text-slate-100" />
                <span>Consultar Estado de Denuncia</span>
              </h3>
              <button
                onClick={() => setIsSearchTicketOpen(false)}
                className="text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSearchTicket} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-[#666666] dark:text-slate-400 mb-1 font-mono">Ingresa tu número de Ticket</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: ASU-20260820-4521"
                  value={searchTicketQuery}
                  onChange={(e) => setSearchTicketQuery(e.target.value)}
                  className="w-full bg-[#ffffff] dark:bg-slate-800 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 text-xs font-mono rounded-sm p-2.5 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={searchLoading}
                className="w-full bg-[#111111] hover:opacity-85 dark:bg-slate-100 dark:hover:bg-white text-[#fafafa] dark:text-[#111111] font-medium py-2 rounded-sm transition-colors text-xs font-mono uppercase tracking-wider flex items-center justify-center space-x-2"
              >
                {searchLoading ? <span>Buscando...</span> : <span>Buscar Ticket</span>}
              </button>
            </form>

            {searchError && (
              <p className="mt-3 text-xs text-[#111111] dark:text-rose-300 bg-[#f5f5f5] dark:bg-rose-950/30 p-2.5 rounded-sm border border-[#cccccc] dark:border-rose-900/50 font-mono">
                {searchError}
              </p>
            )}

            {ticketResult && (
              <div className="mt-4 p-4 bg-[#f5f5f5] dark:bg-slate-800/80 border border-[#e5e5e5] dark:border-slate-700 rounded-sm space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[#111111] dark:text-slate-100 font-bold">{ticketResult.ticket_number}</span>
                  <span className={`px-2 py-0.5 rounded-sm font-mono text-[10px] ${
                    ticketResult.status === 'RESUELTO'
                      ? 'bg-[#111111] dark:bg-emerald-600 text-[#ffffff]'
                      : 'border border-[#111111] dark:border-slate-500 text-[#111111] dark:text-slate-200 bg-transparent'
                  }`}>
                    {ticketResult.status}
                  </span>
                </div>
                <p className="text-[#333333] dark:text-slate-300"><strong>Detalle:</strong> {ticketResult.description}</p>
                {ticketResult.admin_notes && (
                  <p className="text-[#666666] dark:text-slate-400 bg-[#ffffff] dark:bg-slate-900 p-2 rounded-sm border border-[#e5e5e5] dark:border-slate-700">
                    <strong>Respuesta Municipal:</strong> {ticketResult.admin_notes}
                  </p>
                )}
                <p className="text-[10px] text-[#999999] dark:text-slate-500">Fecha: {new Date(ticketResult.created_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Banner de Actualización PWA */}
      <ReloadPrompt />
    </div>
  );
}

export default App;
