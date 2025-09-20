
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge'; // Added this import
import { Plus, UserPlus, Building, Users } from 'lucide-react';
import { toast } from 'sonner';
import LoadingState from '@/components/shared/LoadingStates';
import EmptyState from '@/components/shared/EmptyState';
import InviteClientModal from '@/components/client/InviteClientModal';

const TeamMemberCard = ({ member }) => {
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
      <Avatar>
        <AvatarImage src={member.avatarUrl} />
        <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-semibold text-gray-900">{member.full_name}</p>
        <p className="text-sm text-gray-500">{member.email}</p>
      </div>
      <Badge variant="outline" className="ml-auto capitalize">{member.role}</Badge>
    </div>
  );
};


export default function ClientTeamTab({ clientId, clientName }) {
  const { user: currentUser } = useSession();
  const [agencyTeam, setAgencyTeam] = useState([]);
  const [clientTeam, setClientTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);

  const loadTeams = useCallback(async () => {
    if (!currentUser?.agencyId) return;

    try {
      setLoading(true);
      const allUsers = await User.filter({ agencyId: currentUser.agencyId });

      const agency = allUsers.filter(u => ['owner', 'admin', 'team'].includes(u.role));
      const client = allUsers.filter(u => u.clientId === clientId);
      
      setAgencyTeam(agency);
      setClientTeam(client);

    } catch (error) {
      toast.error('Falha ao carregar equipes.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.agencyId, clientId]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  if (loading) {
    return <LoadingState message="Carregando equipes..." />;
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5 text-blue-600" />Sua Equipe</CardTitle>
            <CardDescription>Membros da sua agência com acesso.</CardDescription>
          </CardHeader>
          <CardContent>
            {agencyTeam.length > 0 ? (
              <div className="space-y-2">
                {agencyTeam.map(member => <TeamMemberCard key={member.id} member={member} />)}
              </div>
            ) : (
              <EmptyState icon={Users} title="Nenhum membro da agência" description="Adicione membros à sua agência nas configurações." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-green-600" />Equipe do Cliente</CardTitle>
            <CardDescription>Contatos do cliente com acesso ao portal.</CardDescription>
          </CardHeader>
          <CardContent>
            {clientTeam.length > 0 ? (
               <div className="space-y-2">
                {clientTeam.map(member => <TeamMemberCard key={member.id} member={member} />)}
              </div>
            ) : (
              <EmptyState icon={Users} title="Nenhum contato do cliente" description="Convide o primeiro contato do cliente para o portal." />
            )}
            <Button className="w-full mt-4" onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar Contato
            </Button>
          </CardContent>
        </Card>
      </div>

      <InviteClientModal
        isOpen={isInviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        clientId={clientId}
        clientName={clientName}
        onInviteSent={loadTeams}
      />
    </>
  );
}
