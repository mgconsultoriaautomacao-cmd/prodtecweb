'use client';

import { useEffect } from 'react';

/**
 * Componente que lida com o registro do Service Worker no lado do cliente.
 * Eu usei este padrão para manter o layout raiz como Server Component.
 */
export default function PWAHandler() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          console.log('SW: Registrado com sucesso!', reg.scope);
        }).catch((err) => {
          console.log('SW: Erro no registro:', err);
        });
      });
    }
  }, []);

  return null;
}
