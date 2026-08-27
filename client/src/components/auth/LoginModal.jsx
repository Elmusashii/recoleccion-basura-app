import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Key,
  Shield,
  X,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle
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
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#111111]/75 animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#ffffff] dark:bg-slate-950 border border-[#111111] dark:border-slate-700 rounded-sm shadow-sm overflow-hidden p-6 sm:p-8 space-y-6 text-[#111111] dark:text-slate-100">

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100 rounded-sm hover:bg-[#f5f5f5] dark:hover:bg-slate-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Encabezado Institucional */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-sm border border-[#e5e5e5] dark:border-slate-800 bg-[#fafafa] dark:bg-slate-900 flex items-center justify-center text-[#111111] dark:text-slate-100">
            <Shield className="w-6 h-6 text-[#111111] dark:text-slate-100" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#111111] dark:text-slate-100 tracking-tight uppercase">Acceso al Panel Municipal</h2>
            <p className="text-xs text-[#666666] dark:text-slate-400 font-light">
              Dirección General de Servicios Urbanos — Asunción
            </p>
          </div>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="p-2.5 bg-[#f5f5f5] dark:bg-slate-900 border border-[#111111] dark:border-slate-700 rounded-sm text-[#111111] dark:text-slate-200 text-xs flex items-center space-x-2 font-mono">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#111111] dark:text-slate-200" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-[#666666] dark:text-slate-400 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="funcionario@asuncion.gov.py"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-b border-[#cccccc] dark:border-slate-700 bg-transparent text-[#111111] dark:text-slate-100 text-xs pl-8 pr-3 py-2 focus:outline-none focus:border-[#111111] dark:focus:border-slate-400 rounded-none placeholder:text-[#999999] dark:placeholder:text-slate-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-[#666666] dark:text-slate-400 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Key className="w-3.5 h-3.5 text-[#666666] dark:text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b border-[#cccccc] dark:border-slate-700 bg-transparent text-[#111111] dark:text-slate-100 text-xs pl-8 pr-8 py-2 focus:outline-none focus:border-[#111111] dark:focus:border-slate-400 rounded-none placeholder:text-[#999999] dark:placeholder:text-slate-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666666] dark:text-slate-400 hover:text-[#111111] dark:hover:text-slate-100"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#111111] hover:opacity-80 dark:bg-slate-100 dark:text-slate-950 text-[#fafafa] font-medium py-2.5 rounded-sm shadow-sm text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 uppercase font-mono tracking-wider"
          >
            {loading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Pie informativo de seguridad */}
        <div className="pt-2 border-t border-[#e5e5e5] dark:border-slate-800 text-center text-[10px] font-mono text-[#666666] dark:text-slate-400 flex items-center justify-center space-x-1.5 uppercase">
          <Lock className="w-3 h-3 text-[#111111] dark:text-slate-100" />
          <span>Acceso seguro protegido por Supabase Auth</span>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
