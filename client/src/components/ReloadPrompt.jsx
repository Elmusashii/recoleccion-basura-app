import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, DownloadCloud } from 'lucide-react';

export const ReloadPrompt = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registrado:', r);
    },
    onRegisterError(error) {
      console.error('Error al registrar SW:', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!needRefresh) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-bounce-subtle max-w-sm w-full mx-4 sm:mx-0">
      <div className="p-4 rounded-sm border border-slate-700 bg-slate-800/95 backdrop-blur-md shadow-2xl text-slate-100 flex flex-col space-y-3">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-sm bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <DownloadCloud className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wide text-slate-100">
              Actualización Disponible
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 font-sans">
              Hay una nueva actualización disponible.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-700/60 font-mono text-xs">
          <button
            onClick={close}
            className="px-3 py-1.5 rounded-sm border border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={() => updateServiceWorker(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recargar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReloadPrompt;
