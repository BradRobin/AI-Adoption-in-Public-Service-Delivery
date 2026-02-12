'use client';

import { Toaster } from 'react-hot-toast';

export function ToasterClient() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#020617',
          color: '#f9fafb',
          borderRadius: '0.75rem',
          border: '1px solid rgba(248,250,252,0.12)',
        },
        success: {
          iconTheme: {
            primary: '#22c55e',
            secondary: '#020617',
          },
        },
        error: {
          iconTheme: {
            primary: '#f97316',
            secondary: '#020617',
          },
        },
      }}
    />
  );
}

