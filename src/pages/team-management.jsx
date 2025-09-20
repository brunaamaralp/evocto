import React from 'react';
import TeamMemberManagement from '@/components/team/TeamMemberManagement';
import InvitesPanel from '@/components/team/InvitesPanel';

// REMOVER withAuth para evitar duplicação de layout
function TeamManagementPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <TeamMemberManagement />
      <div className="mt-6">
        <InvitesPanel />
      </div>
    </div>
  );
}

// EXPORTAR DIRETAMENTE sem withAuth
export default TeamManagementPage;