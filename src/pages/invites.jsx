import React from 'react';
import InvitesPanel from '@/components/team/InvitesPanel';

export default function InvitesPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Gerenciar Convites</h1>
      <p className="text-slate-600">Liste, reenvie e revogue convites pendentes da sua agência.</p>
      <InvitesPanel />
    </div>
  );
}