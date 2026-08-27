import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare } from 'lucide-react';

export const InstallPwaPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detectar si ya está instalada o ejecutándose en modo standalone
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(isStandaloneMode);

    // 2. Detectar si el dispositivo es iOS (Safari)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Capturar el evento nativo de instalación en Chrome / Android / Edge
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
      console.log('PWA instalada exitosamente');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) {
      alert('Para instalar la aplicación, puedes abrir el menú de opciones de tu navegador (los tres puntos arriba a la derecha) y seleccionar "Instalar aplicación" o "Agregar a la pantalla principal".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  // Si ya se está ejecutando como app instalada (standalone), no mostrar botón
  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Botón en Header */}
      <button
        onClick={handleInstallClick}
        className="flex items-center space-x-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2.5 sm:px-3 py-1.5 rounded-sm border border-blue-200 dark:border-blue-800/60 transition-colors font-medium font-mono"
        title="Instalar EcoRuta en tu dispositivo móvil o computadora"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar App</span>
      </button>

      {/* Modal de Instrucciones para iOS */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#ffffff] dark:bg-slate-900 border border-[#e5e5e5] dark:border-slate-800 rounded-sm max-w-sm w-full p-5 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center space-x-2 text-[#111111] dark:text-slate-100 font-mono font-bold text-xs uppercase">
                <Smartphone className="w-4 h-4 text-blue-500" />
                <span>Instalar en iPhone / iPad</span>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Para instalar la app en iOS utilizando Safari:
            </p>

            <ol className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-mono">
              <li className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                <span>Toca el botón <strong>Compartir</strong> <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-500" /> en la barra inferior de Safari.</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                <span>Desplázate y selecciona <strong>"Agregar a la pantalla de inicio"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-blue-500" />.</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                <span>Toca <strong>"Agregar"</strong> arriba a la derecha.</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-[#111111] dark:bg-slate-100 text-white dark:text-slate-950 font-mono text-xs font-medium py-2 rounded-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPwaPrompt;
