import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Trash2, 
  Key, 
  Mail, 
  Phone, 
  Building2, 
  Shield, 
  Check, 
  X,
  RefreshCw,
  UserCheck,
  UserX,
  AlertTriangle
} from 'lucide-react';
import { UsersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ROLE_CONFIG = {
  admin: {
    label: 'Administrador General',
    color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: '👑',
    desc: 'Acceso total al sistema, gestión de usuarios, rutas y flota'
  },
  supervisor: {
    label: 'Supervisor de Rutas',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: '📋',
    desc: 'Control de bitácora, asignación de camiones y monitoreo'
  },
  chofer: {
    label: 'Chofer',
    color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    icon: '🚚',
    desc: 'Conductor de camión recolector, reportes de avería y resolución de denuncias asignadas'
  },
  operator: {
    label: 'Operador de Flota',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    icon: '🚛',
    desc: 'Tripulante o cuadrilla, registro de pesajes y apoyo'
  },
  inspector: {
    label: 'Fiscalizador Ambiental',
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: '🔍',
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
  const operatorCount = users.filter(u => u.role === 'operator').length;
  const inspectorCount = users.filter(u => u.role === 'inspector').length;

  if (currentUser?.role !== 'admin') {
    return (
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-4 max-w-lg mx-auto my-8 shadow-xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
          <Shield className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white">Acceso Restringido</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          El módulo de Gestión y Alta de Usuarios es exclusivo para funcionarios con rol de <strong>Administrador General</strong>. Tu rol actual es <strong className="text-emerald-400 uppercase">{currentUser?.role}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* KPI Cards de Usuarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Personal Municipal</p>
            <h4 className="text-2xl font-black text-white mt-1">{totalUsers}</h4>
            <span className="text-[11px] text-emerald-400">Total registrados</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Administradores</p>
            <h4 className="text-2xl font-black text-rose-400 mt-1">{adminCount}</h4>
            <span className="text-[11px] text-rose-400">Control total</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Operadores de Flota</p>
            <h4 className="text-2xl font-black text-blue-400 mt-1">{operatorCount}</h4>
            <span className="text-[11px] text-blue-400">Choferes en ruta</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <span className="text-lg">🚛</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Fiscalizadores</p>
            <h4 className="text-2xl font-black text-amber-400 mt-1">{inspectorCount}</h4>
            <span className="text-[11px] text-amber-400">Inspección ambiental</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <span className="text-lg">🔍</span>
          </div>
        </div>
      </div>

      {/* Controles de búsqueda y filtros */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>Directorio de Usuarios y Funcionarios Municipales</span>
            </h3>
            <p className="text-xs text-slate-400">
              Gestión de cuentas institucionales, asignación de roles y control de permisos
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Funcionario</span>
            </button>

            <button
              onClick={fetchUsers}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Refrescar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o departamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-500"
            />
          </form>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">Todos los Roles</option>
            <option value="admin">👑 Administradores</option>
            <option value="supervisor">📋 Supervisores</option>
            <option value="chofer">🚚 Choferes de Camión</option>
            <option value="operator">🚛 Operadores de Flota</option>
            <option value="inspector">🔍 Fiscalizadores</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVO">🟢 Activos</option>
            <option value="INACTIVO">🔴 Inactivos</option>
          </select>
        </div>

        {/* Tabla de Usuarios */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Funcionario</th>
                <th className="py-3 px-4">Rol & Permisos</th>
                <th className="py-3 px-4">Área / Departamento</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No se encontraron funcionarios con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleConfig = ROLE_CONFIG[u.role] || ROLE_CONFIG.operator;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      
                      {/* Nombre y Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 text-white flex items-center justify-center font-bold text-xs shadow">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{u.name}</p>
                            <p className="text-[11px] text-slate-400 flex items-center space-x-1">
                              <Mail className="w-3 h-3 text-slate-500 inline mr-1" />
                              <span>{u.email}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleConfig.color}`}>
                          <span>{roleConfig.icon}</span>
                          <span>{roleConfig.label}</span>
                        </span>
                      </td>

                      {/* Departamento */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[180px]">{u.department || 'Servicios Urbanos'}</span>
                        </div>
                      </td>

                      {/* Contacto */}
                      <td className="py-3.5 px-4 text-slate-400">
                        <div className="flex items-center space-x-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{u.phone || 'No registrado'}</span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                            u.status === 'ACTIVO'
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
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
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                          title="Cambiar Rol"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
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
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Registrar Nuevo Funcionario</h3>
                  <p className="text-xs text-slate-400">Creación de cuenta con rol y permisos municipales</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lic. Hernán Cáceres"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Correo Institucional *</label>
                  <input
                    type="email"
                    required
                    placeholder="hcaceres@asuncion.gov.py"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Teléfono / Celular</label>
                  <input
                    type="text"
                    placeholder="+595 981 000000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Rol en el Sistema *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="chofer">🚚 Chofer (Conducción y Atención de Denuncias)</option>
                  <option value="operator">🚛 Operador de Flota (Tripulación y Pesajes)</option>
                  <option value="supervisor">📋 Supervisor de Rutas y Cronogramas</option>
                  <option value="inspector">🔍 Fiscalizador Ambiental (Denuncias y Vertederos)</option>
                  <option value="admin">👑 Administrador General (Control Total)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {ROLE_CONFIG[formData.role]?.desc}
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Departamento / Área Asignada</label>
                <input
                  type="text"
                  placeholder="Ej: Dirección de Servicios Urbanos - Zona Centro"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Contraseña Inicial de Acceso</label>
                <input
                  type="password"
                  placeholder="Dejar vacío para usar 'Password123!' o escribe una nueva"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Mínimo 6 caracteres. Si se deja en blanco, se asignará <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">Password123!</code> automáticamente.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition disabled:opacity-50"
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
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Modificar Rol de Funcionario</span>
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Selecciona el nuevo rol para <strong>{editingUser.name}</strong>:
            </p>

            <div className="space-y-2">
              {Object.entries(ROLE_CONFIG).map(([roleKey, cfg]) => (
                <button
                  key={roleKey}
                  onClick={() => handleRoleChange(editingUser.id, roleKey)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition ${
                    editingUser.role === roleKey
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-white'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{cfg.icon}</span>
                    <div>
                      <p className="font-bold">{cfg.label}</p>
                      <p className="text-[10px] text-slate-400">{cfg.desc}</p>
                    </div>
                  </div>
                  {editingUser.role === roleKey && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
