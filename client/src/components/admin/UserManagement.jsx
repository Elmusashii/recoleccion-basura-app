import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  CheckCircle2, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Building2, 
  Shield, 
  Check, 
  X,
  RefreshCw,
  UserCheck,
  UserX,
  AlertTriangle,
  ClipboardCheck,
  Truck,
  Activity
} from 'lucide-react';
import { UsersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ROLE_CONFIG = {
  admin: {
    label: 'Administrador General',
    badge: 'border border-[#111111] dark:border-slate-600 text-[#111111] dark:text-slate-100 bg-transparent',
    icon: Shield,
    desc: 'Acceso total al sistema, gestión de usuarios, rutas y flota'
  },
  supervisor: {
    label: 'Supervisor de Rutas',
    badge: 'bg-[#e5e5e5] dark:bg-slate-800 text-[#111111] dark:text-slate-100',
    icon: ClipboardCheck,
    desc: 'Control de bitácora, asignación de camiones y monitoreo'
  },
  chofer: {
    label: 'Chofer',
    badge: 'border border-[#cccccc] dark:border-slate-700 text-[#666666] dark:text-slate-400 bg-[#ffffff] dark:bg-slate-900',
    icon: Truck,
    desc: 'Conductor de camión recolector, reportes de avería y resolución de denuncias asignadas'
  },
  operator: {
    label: 'Operador de Flota',
    badge: 'border border-[#cccccc] dark:border-slate-700 text-[#666666] dark:text-slate-400 bg-[#ffffff] dark:bg-slate-900',
    icon: Activity,
    desc: 'Tripulante o cuadrilla, registro de pesajes y apoyo'
  },
  inspector: {
    label: 'Fiscalizador Ambiental',
    badge: 'bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-slate-950',
    icon: Search,
    desc: 'Verificación de vertederos clandestinos e inspección en vía pública'
  }
};

export const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal para nuevo usuario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'operator',
    department: 'Dirección General de Servicios Urbanos',
    phone: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Modal para editar rol
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await UsersAPI.getAll({
        search,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      });
      setUsers(res.data?.data || []);
    } catch (err) {
      console.warn('Error al obtener usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    setSubmitting(true);
    setActionError(null);

    try {
      await UsersAPI.create(formData);
      setIsModalOpen(false);
      setFormData({
        name: '',
        email: '',
        role: 'operator',
        department: 'Dirección General de Servicios Urbanos',
        phone: '',
        password: ''
      });
      fetchUsers();
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Error al crear usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      await UsersAPI.update(user.id, { status: newStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (err) {
      alert('Error al actualizar estado del usuario');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await UsersAPI.update(userId, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setEditingUser(null);
    } catch (err) {
      alert('Error al actualizar rol');
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser?.id) {
      alert('No puedes eliminar tu propio usuario en sesión activa');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas eliminar al funcionario ${user.name}?`)) {
      return;
    }

    try {
      await UsersAPI.delete(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (err) {
      alert('Error al eliminar usuario');
    }
  };

  // KPIs
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const operatorCount = users.filter(u => u.role === 'operator' || u.role === 'chofer').length;
  const inspectorCount = users.filter(u => u.role === 'inspector').length;

  if (currentUser?.role !== 'admin') {
    return (
      <div className="bg-[#ffffff] dark:bg-slate-900 p-6 rounded-sm border border-[#111111] dark:border-slate-800 text-center space-y-4 max-w-lg mx-auto my-8 shadow-sm text-[#111111] dark:text-slate-100 animate-fadeIn">
        <div className="w-12 h-12 mx-auto rounded-sm bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-slate-200 flex items-center justify-center border border-[#e5e5e5] dark:border-slate-700">
          <Shield className="w-6 h-6" strokeWidth={1.5} />
        </div>
        <h3 className="text-base font-bold text-[#111111] dark:text-slate-100 uppercase tracking-tight">Acceso Restringido</h3>
        <p className="text-xs text-[#666666] dark:text-slate-400 leading-relaxed font-light">
          El módulo de Gestión de Usuarios es exclusivo para funcionarios con rol de <strong>Administrador General</strong>. Tu rol actual es <strong className="text-[#111111] dark:text-slate-100 uppercase font-mono">{currentUser?.role}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#111111] dark:text-slate-100">
      
      {/* KPI Cards de Usuarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#ffffff] dark:bg-slate-950 p-4 rounded-sm border border-[#e5e5e5] dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#666666] dark:text-slate-400">Personal Municipal</p>
            <h4 className="text-2xl font-bold font-mono text-[#111111] dark:text-slate-100 mt-0.5">{totalUsers}</h4>
            <span className="text-[10px] font-mono text-[#666666] dark:text-slate-400">Total registrados</span>
          </div>
          <div className="w-10 h-10 rounded-sm bg-[#f5f5f5] dark:bg-slate-900 text-[#111111] dark:text-slate-100 flex items-center justify-center border border-[#e5e5e5] dark:border-slate-800">
            <Users className="w-4 h-4" strokeWidth={1.5} />
          </div>
        </div>

        <div className="bg-[#ffffff] dark:bg-slate-950 p-4 rounded-sm border border-[#e5e5e5] dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#666666] dark:text-slate-400">Administradores</p>
            <h4 className="text-2xl font-bold font-mono text-[#111111] dark:text-slate-100 mt-0.5">{adminCount}</h4>
            <span className="text-[10px] font-mono text-[#666666] dark:text-slate-400">Control total</span>
          </div>
          <div className="w-10 h-10 rounded-sm bg-[#f5f5f5] dark:bg-slate-900 text-[#111111] dark:text-slate-100 flex items-center justify-center border border-[#e5e5e5] dark:border-slate-800">
            <Shield className="w-4 h-4" strokeWidth={1.5} />
          </div>
        </div>

        <div className="bg-[#ffffff] dark:bg-slate-950 p-4 rounded-sm border border-[#e5e5e5] dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#666666] dark:text-slate-400">Personal de Flota</p>
            <h4 className="text-2xl font-bold font-mono text-[#111111] dark:text-slate-100 mt-0.5">{operatorCount}</h4>
            <span className="text-[10px] font-mono text-[#666666] dark:text-slate-400">Choferes y tripulación</span>
          </div>
          <div className="w-10 h-10 rounded-sm bg-[#f5f5f5] dark:bg-slate-900 text-[#111111] dark:text-slate-100 flex items-center justify-center border border-[#e5e5e5] dark:border-slate-800">
            <Truck className="w-4 h-4" strokeWidth={1.5} />
          </div>
        </div>

        <div className="bg-[#ffffff] dark:bg-slate-950 p-4 rounded-sm border border-[#e5e5e5] dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#666666] dark:text-slate-400">Fiscalizadores</p>
            <h4 className="text-2xl font-bold font-mono text-[#111111] dark:text-slate-100 mt-0.5">{inspectorCount}</h4>
            <span className="text-[10px] font-mono text-[#666666] dark:text-slate-400">Inspección ambiental</span>
          </div>
          <div className="w-10 h-10 rounded-sm bg-[#f5f5f5] dark:bg-slate-900 text-[#111111] dark:text-slate-100 flex items-center justify-center border border-[#e5e5e5] dark:border-slate-800">
            <Search className="w-4 h-4" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* Controles de búsqueda y filtros */}
      <div className="bg-[#ffffff] dark:bg-slate-950 p-5 rounded-sm border border-[#e5e5e5] dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100 flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#111111] dark:text-slate-100" />
              <span>Directorio de Usuarios y Funcionarios</span>
            </h3>
            <p className="text-xs text-[#666666] dark:text-slate-400 font-light">
              Gestión de cuentas institucionales, asignación de roles y control de acceso
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 bg-[#111111] hover:opacity-80 dark:bg-slate-100 dark:text-slate-950 text-[#fafafa] text-xs font-medium px-3.5 py-2 rounded-sm shadow-sm transition-colors uppercase font-mono tracking-wider"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Nuevo Funcionario</span>
            </button>

            <button
              onClick={fetchUsers}
              className="p-2 bg-[#ffffff] dark:bg-slate-900 hover:bg-[#f5f5f5] dark:hover:bg-slate-800 text-[#111111] dark:text-slate-100 rounded-sm border border-[#e5e5e5] dark:border-slate-700 transition-colors"
              title="Refrescar lista"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e5e5e5] dark:border-slate-800">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 text-xs rounded-sm pl-9 pr-3 py-1.5 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none placeholder:text-[#999999] dark:placeholder:text-slate-500 font-mono"
            />
          </form>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 text-xs rounded-sm px-2.5 py-1.5 focus:outline-none font-mono"
          >
            <option value="ALL">Todos los Roles</option>
            <option value="admin">Administradores</option>
            <option value="supervisor">Supervisores</option>
            <option value="chofer">Choferes</option>
            <option value="operator">Operadores</option>
            <option value="inspector">Fiscalizadores</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 text-[#111111] dark:text-slate-100 text-xs rounded-sm px-2.5 py-1.5 focus:outline-none font-mono"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </div>

        {/* Tabla de Usuarios */}
        <div className="overflow-x-auto rounded-sm border border-[#e5e5e5] dark:border-slate-800">
          <table className="w-full text-left text-xs text-[#333333] dark:text-slate-200">
            <thead className="bg-[#f5f5f5] dark:bg-slate-900 text-[#666666] dark:text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-[#e5e5e5] dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Funcionario</th>
                <th className="py-2.5 px-3">Rol</th>
                <th className="py-2.5 px-3">Área / Departamento</th>
                <th className="py-2.5 px-3">Contacto</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e5] dark:divide-slate-800">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-[#999999] dark:text-slate-500 font-mono">
                    No se encontraron funcionarios con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleConfig = ROLE_CONFIG[u.role] || ROLE_CONFIG.operator;
                  const RoleIcon = roleConfig.icon || Shield;
                  return (
                    <tr key={u.id} className="hover:bg-[#fafafa] dark:hover:bg-slate-900/60 transition-colors">
                      
                      {/* Nombre */}
                      <td className="py-2.5 px-3">
                        <div>
                          <p className="font-bold text-[#111111] dark:text-slate-100 text-xs">{u.name}</p>
                          <p className="text-[10px] text-[#666666] dark:text-slate-400 font-mono">
                            {u.email}
                          </p>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase ${roleConfig.badge}`}>
                          <RoleIcon className="w-3 h-3 text-[#111111] dark:text-slate-100" strokeWidth={1.5} />
                          <span>{roleConfig.label}</span>
                        </span>
                      </td>

                      {/* Departamento */}
                      <td className="py-2.5 px-3 text-[#666666] dark:text-slate-400">
                        <div className="flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{u.department || 'Servicios Urbanos'}</span>
                        </div>
                      </td>

                      {/* Contacto */}
                      <td className="py-2.5 px-3 text-[#666666] dark:text-slate-400 font-mono text-[11px]">
                        {u.phone || 'No registrado'}
                      </td>

                      {/* Estado */}
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-sm text-[10px] font-mono transition-colors ${
                            u.status === 'ACTIVO'
                              ? 'bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-slate-950 font-bold'
                              : 'bg-[#f5f5f5] dark:bg-slate-900 text-[#666666] dark:text-slate-400 border border-[#cccccc] dark:border-slate-700'
                          }`}
                        >
                          {u.status === 'ACTIVO' ? (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>ACTIVO</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3" />
                              <span>INACTIVO</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1 text-[#111111] dark:text-slate-100 hover:bg-[#f5f5f5] dark:hover:bg-slate-800 rounded-sm border border-[#e5e5e5] dark:border-slate-700 transition-colors"
                          title="Cambiar Rol"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 hover:bg-[#f5f5f5] dark:hover:bg-slate-800 rounded-sm border border-[#e5e5e5] dark:border-slate-700 transition-colors"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL PARA CREAR NUEVO USUARIO / FUNCIONARIO */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#111111]/75 animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#ffffff] dark:bg-slate-950 border border-[#111111] dark:border-slate-700 rounded-sm shadow-sm p-6 space-y-4 text-[#111111] dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5] dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-[#f5f5f5] dark:bg-slate-900 text-[#111111] dark:text-slate-100 rounded-sm border border-[#e5e5e5] dark:border-slate-800">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100">Registrar Nuevo Funcionario</h3>
                  <p className="text-xs text-[#666666] dark:text-slate-400 font-light">Creación de cuenta con rol y permisos municipales</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-2.5 bg-[#f5f5f5] dark:bg-slate-900 border border-[#111111] dark:border-slate-700 rounded-sm text-[#111111] dark:text-slate-200 text-xs flex items-center space-x-2 font-mono">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#111111] dark:text-slate-200" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lic. Hernán Cáceres"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 rounded-sm p-2 text-[#111111] dark:text-slate-100 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">Correo Institucional *</label>
                  <input
                    type="email"
                    required
                    placeholder="hcaceres@asuncion.gov.py"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 rounded-sm p-2 text-[#111111] dark:text-slate-100 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">Teléfono / Celular</label>
                  <input
                    type="text"
                    placeholder="+595 981 000000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 rounded-sm p-2 text-[#111111] dark:text-slate-100 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">Rol en el Sistema *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 rounded-sm p-2 text-[#111111] dark:text-slate-100 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-mono"
                >
                  <option value="chofer">Chofer (Conducción y Atención de Denuncias)</option>
                  <option value="operator">Operador de Flota (Tripulación y Pesajes)</option>
                  <option value="supervisor">Supervisor de Rutas y Cronogramas</option>
                  <option value="inspector">Fiscalizador Ambiental (Denuncias y Vertederos)</option>
                  <option value="admin">Administrador General (Control Total)</option>
                </select>
                <p className="text-[10px] text-[#666666] dark:text-slate-400 font-light mt-1">
                  {ROLE_CONFIG[formData.role]?.desc}
                </p>
              </div>

              <div>
                <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">Departamento / Área Asignada</label>
                <input
                  type="text"
                  placeholder="Ej: Dirección de Servicios Urbanos - Zona Centro"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 rounded-sm p-2 text-[#111111] dark:text-slate-100 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#111111] dark:text-slate-200 font-mono text-[11px] uppercase mb-1">Contraseña Inicial de Acceso</label>
                <input
                  type="password"
                  placeholder="Dejar vacío para usar 'Password123!' o escribe una nueva"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[#ffffff] dark:bg-slate-900 border border-[#cccccc] dark:border-slate-700 rounded-sm p-2 text-[#111111] dark:text-slate-100 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-mono"
                />
                <p className="text-[10px] text-[#666666] dark:text-slate-400 font-mono mt-1">
                  Mínimo 6 caracteres. Si se deja en blanco, se asignará Password123! automáticamente.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#e5e5e5] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 bg-[#f5f5f5] dark:bg-slate-900 hover:bg-[#e5e5e5] dark:hover:bg-slate-800 text-[#111111] dark:text-slate-200 rounded-sm border border-[#e5e5e5] dark:border-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#111111] hover:opacity-80 dark:bg-slate-100 dark:text-slate-950 text-[#fafafa] font-medium rounded-sm shadow-sm transition-colors disabled:opacity-50 uppercase font-mono tracking-wider"
                >
                  {submitting ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PARA CAMBIAR ROL DE USUARIO */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#111111]/75 animate-fadeIn">
          <div className="relative w-full max-w-sm bg-[#ffffff] dark:bg-slate-950 border border-[#111111] dark:border-slate-700 rounded-sm shadow-sm p-5 space-y-4 text-[#111111] dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5] dark:border-slate-800">
              <h3 className="font-bold uppercase tracking-tight text-[#111111] dark:text-slate-100 text-xs flex items-center space-x-2">
                <Shield className="w-3.5 h-3.5 text-[#111111] dark:text-slate-100" />
                <span>Modificar Rol de Funcionario</span>
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#333333] dark:text-slate-300">
              Selecciona el nuevo rol para <strong className="text-[#111111] dark:text-slate-100">{editingUser.name}</strong>:
            </p>

            <div className="space-y-1.5">
              {Object.entries(ROLE_CONFIG).map(([roleKey, cfg]) => {
                const IconComp = cfg.icon || Shield;
                return (
                  <button
                    key={roleKey}
                    onClick={() => handleRoleChange(editingUser.id, roleKey)}
                    className={`w-full p-2 rounded-sm border text-left flex items-center justify-between text-xs transition-colors ${
                      editingUser.role === roleKey
                        ? 'bg-[#111111] dark:bg-slate-100 text-[#ffffff] dark:text-slate-950 border-[#111111] dark:border-slate-100'
                        : 'bg-[#ffffff] dark:bg-slate-900 border-[#e5e5e5] dark:border-slate-800 text-[#333333] dark:text-slate-200 hover:bg-[#f5f5f5] dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <IconComp className="w-4 h-4" strokeWidth={1.5} />
                      <div>
                        <p className="font-bold font-mono text-xs">{cfg.label}</p>
                        <p className={`text-[10px] font-light ${editingUser.role === roleKey ? 'text-[#cccccc] dark:text-slate-700' : 'text-[#666666] dark:text-slate-400'}`}>{cfg.desc}</p>
                      </div>
                    </div>
                    {editingUser.role === roleKey && <Check className="w-4 h-4 text-[#ffffff] dark:text-slate-950" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagement;
