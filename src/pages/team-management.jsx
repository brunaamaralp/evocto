import TeamMemberManagement from '@/components/team/TeamMemberManagement';
import InvitesPanel from '@/components/team/InvitesPanel';
import { getModulePastel } from '@/lib/modulePastels';

function TeamManagementPage() {
  const pastel = getModulePastel('team');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#18162A]">Equipe</h1>
        <p className="text-[#7A7595] mt-1">Gerencie membros e convites da sua agência</p>
      </div>
      <div className={`rounded-2xl ${pastel.soft}`}>
        <TeamMemberManagement />
      </div>
      <div className={`rounded-2xl ${pastel.soft}`}>
        <InvitesPanel />
      </div>
    </div>
  );
}

export default TeamManagementPage;
