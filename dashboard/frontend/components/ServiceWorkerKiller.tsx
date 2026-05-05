'use client';

import { useEffect } from 'react';

export default function ServiceWorkerKiller() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
          registration.unregister();
          console.log('🗑️ Stale Service Worker Unregistered');
        }
      });
    }
  }, []);

  return null;
}
