import React from 'react';

export function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Remover header com "Evocto" duplicado que estava aqui */}
      <main>
        {children}
      </main>
    </div>
  );
}