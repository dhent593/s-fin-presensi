'use client';

import { useEffect, useState } from 'react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Register service worker if supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-slide-up">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-4 border border-slate-100">
        <div className="w-12 h-12 shrink-0 bg-orange-100 rounded-xl flex items-center justify-center p-2">
          <img src="/favicon.png" alt="S-Fin Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-black text-slate-800">Install Aplikasi</h4>
          <p className="text-xs font-semibold text-slate-500 line-clamp-1">Tambahkan S-Fin ke Layar Utama</p>
        </div>
        <button 
          onClick={handleInstallClick}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md shadow-orange-500/20"
        >
          Install
        </button>
        <button 
          onClick={() => setShowPrompt(false)}
          className="p-2 text-slate-400 hover:text-slate-600 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
