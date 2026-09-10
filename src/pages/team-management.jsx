import { useState } from 'react';
import TeamMemberManagement from '@/components/team/TeamMemberManagement';
import InviteMemberModal from '@/components/team/InviteMemberModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { sendInvite } from '@/api/functions';
import { toast } from 'sonner';

function TeamManagementPage() {
  const { user } = useSession();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const canInvite = ['owner', 'admin'].includes(user?.role || '');

  const handleInvite = async (inviteData) => {
    try {
      const { data } = await sendInvite(inviteData);
      if (data?.success) {
        if (data.temporaryPassword) {
          toast.success(data.message || 'Membro criado com senha para compartilhar.');
          setRefreshKey((k) => k + 1);
          return data;
        }
        toast.success(data.message || 'Convite enviado.');
        setShowInviteModal(false);
        setRefreshKey((k) => k + 1);
        return data;
      }
      toast.error(data?.message || 'Erro ao adicionar membro');
      return data;
    } catch (error) {
      toast.error(error?.message || 'Erro ao adicionar membro');
      return { success: false };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18162A]">Equipe</h1>
          <p className="text-sm text-[#7A7595] mt-1">Membros e convites da agência</p>
        </div>
        {canInvite && (
          <Button
            onClick={() => setShowInviteModal(true)}
            className="bg-[#6C47D8] hover:bg-[#5A3BC0] self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar membro
          </Button>
        )}
      </div>

      <TeamMemberManagement
        key={refreshKey}
        showTitle={false}
        showInviteButton={false}
        onInviteClick={() => setShowInviteModal(true)}
      />

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />
    </div>
  );
}

export default TeamManagementPage;
