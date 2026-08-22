import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Key, 
  ShieldCheck, 
  X, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginModal = ({ isOpen, onClose, onSuccess }) => {
  const { loginWithPassword, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa tu correo y contraseña');
      return;
    }

    setError(null);
    try {
      await loginWithPassword(email.trim(), password);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado Institucional */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-950/50 border border-emerald-400/30">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Acceso al Panel Municipal</h2>
            <p className="text-xs text-slate-400">
              Dirección General de Servicios Urbanos — Municipalidad de Asunción
            </p>
          </div>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Correo Electrónico Institucional
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="funcionario@asuncion.gov.py"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 text-slate-100 text-xs rounded-xl pl-10 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 text-slate-100 text-xs rounded-xl pl-10 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-950/40 text-xs flex items-center justify-center space-x-2 transition transform active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span>Autenticando en Supabase...</span>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Pie informativo de seguridad */}
        <div className="pt-2 border-t border-slate-800 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          <span>Acceso seguro protegido por Supabase Auth & JWT</span>
        </div>
      </div>
    </div>
  );
};
