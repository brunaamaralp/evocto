import React from 'react';

// Safe development detection
const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// Development-only page - hidden in production
export default function JobsMonitor() {
  // Hide in production
  if (!isDevelopment) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Página não disponível</h1>
        <p className="text-slate-600">Esta funcionalidade não está disponível em produção.</p>
      </div>
    );
  }

  // Development content would go here
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Monitor de Jobs (Dev)</h1>
      <p className="text-slate-600">Funcionalidade disponível apenas em desenvolvimento.</p>
    </div>
  );
}