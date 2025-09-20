import React from 'react';
import TeamMembersPanel from '@/components/team/TeamMembersPanel';

export default function TeamMembersPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Membros da Equipe</h1>
      <p className="text-slate-600">
        Altere papéis e remova membros. Todas as alterações são auditadas e respeitam o RLS.
      </p>
      <TeamMembersPanel />
    </div>
  );
}