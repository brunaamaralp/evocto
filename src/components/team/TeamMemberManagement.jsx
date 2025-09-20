
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Plus, UserCheck, Clock, UserX, 
  Send, RotateCcw, Ban, Crown, Shield, 
  User as UserIcon, Eye, Mail, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { User } from '@/api/entities';
import { sendInvite } from '@/api/functions';
import { manageInvites } from '@/api/functions';
import InviteMemberModal from './InviteMemberModal';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TeamMemberManagement() {
  const { user: currentUser } = useSession();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [inviteStats, setInviteStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('members');

  const loadMembers = useCallback(async () => {
    try {
      const teamMembers = await User.filter({ agencyId: currentUser.agencyId });
      setMembers(teamMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  }, [currentUser.agencyId]);

  const loadInvites = useCallback(async () => {
    try {
      const { data } = await manageInvites({ action: 'list' });
      if (data.success) {
        setInvites(data.invites);
        setInviteStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading invites:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMembers(),
        loadInvites()
      ]);
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Erro ao carregar dados da equipe');
    }
    setLoading(false);
  }, [loadMembers, loadInvites]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendInvite = async (inviteData) => {
    try {
      const { data } = await sendInvite(inviteData);
      if (data.success) {
        toast.success(data.message);
        setShowInviteModal(false);
        await loadInvites(); // Recarregar convites
      } else {
        // Tratar diferentes tipos de erro com mensagens específicas
        const errorMessages = {
          already_member: 'Este e-mail já é membro da equipe',
          email_in_other_agency: 'Este e-mail já está em uso em outra agência',
          invite_already_sent: 'Já existe um convite pendente para este e-mail',
          invalid_email: 'Formato de e-mail inválido',
          invalid_role: 'Função selecionada é inválida'
        };
        
        const message = errorMessages[data.error] || data.message || 'Erro ao enviar convite';
        toast.error(message);
        
        // Se há sugestão, mostrar como info adicional
        if (data.suggestion) {
          setTimeout(() => toast.info(data.suggestion), 2000);
        }
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error('Erro ao enviar convite. Tente novamente.');
    }
  };

  const handleResendInvite = async (inviteId) => {
    try {
      const { data } = await manageInvites({ 
        action: 'resend', 
        inviteId 
      });
      
      if (data.success) {
        toast.success('Convite reenviado com sucesso!');
        await loadInvites();
      } else {
        toast.error(data.message || 'Erro ao reenviar convite');
      }
    } catch (error) {
      console.error('Error resending invite:', error);
      toast.error('Erro ao reenviar convite');
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!confirm('Tem certeza que deseja revogar este convite?')) return;

    try {
      const { data } = await manageInvites({ 
        action: 'revoke', 
        inviteId 
      });
      
      if (data.success) {
        toast.success('Convite revogado com sucesso!');
        await loadInvites();
      } else {
        toast.error(data.message || 'Erro ao revogar convite');
      }
    } catch (error) {
      console.error('Error revoking invite:', error);
      toast.error('Erro ao revogar convite');
    }
  };

  // Função para cores de função consolidadas com paleta Evocto
  const getRoleColor = (role) => {
    const roleColors = {
      owner: 'bg-purple-100 text-purple-800 border-purple-200',
      admin: 'bg-blue-100 text-blue-800 border-blue-200',
      team: 'bg-gray-100 text-gray-800 border-gray-200',
      client: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Ícones de função com cores neutras
  const getRoleIcon = (role) => {
    const icons = {
      owner: Crown,
      admin: Shield,
      team: UserIcon,
      client: Eye
    };
    const IconComponent = icons[role] || UserIcon;
    return <IconComponent className="w-4 h-4 text-gray-600" />;
  };

  // Cores de status de convite (funcionais mantidas)
  const getStatusColor = (status) => {
    const statusColors = {
      sent: 'bg-amber-100 text-amber-700',
      accepted: 'bg-emerald-100 text-emerald-700',
      expired: 'bg-red-100 text-red-700'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    const icons = {
      sent: Clock,
      accepted: UserCheck,
      expired: UserX
    };
    const IconComponent = icons[status] || Clock;
    return <IconComponent className="w-4 h-4" />;
  };

  const renderMemberCard = (member) => (
    <motion.div
      key={member.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-gradient-primary text-white font-semibold">
              {member.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-gray-900">{member.full_name || 'Usuário'}</h3>
            <p className="text-sm text-gray-600">{member.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getRoleColor(member.role)}>
                {getRoleIcon(member.role)}
                <span className="ml-1 capitalize">{member.role}</span>
              </Badge>
              {member.last_login_at && (
                <span className="text-xs text-gray-500">
                  Último acesso: {formatDistanceToNow(new Date(member.last_login_at), { addSuffix: true, locale: ptBR })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {member.id !== currentUser.id && (currentUser.role === 'owner' || currentUser.role === 'admin') && (
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
              <Eye className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderInviteCard = (invite) => {
    const StatusIcon = getStatusIcon(invite.status);
    
    return (
      <motion.div
        key={invite.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{invite.email}</h3>
              <p className="text-sm text-gray-600">Convite enviado</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getRoleColor(invite.role)}>
                  <span className="capitalize">{invite.role}</span>
                </Badge>
                <Badge className={getStatusColor(invite.status)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {invite.status === 'sent' ? 'Enviado' : 
                   invite.status === 'accepted' ? 'Aceito' : 'Expirado'}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Criado: {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {invite.status === 'sent' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResendInvite(invite.id)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevokeInvite(invite.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Ban className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const canInvite = ['owner', 'admin'].includes(currentUser.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciar Equipe</h1>
            <p className="text-gray-600">Convide e gerencie membros da sua agência</p>
          </div>
        </div>
        
        {canInvite && (
          <Button 
            onClick={() => setShowInviteModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Convidar Membro
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Membros</p>
                <p className="text-2xl font-bold text-gray-900">{members.length}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Convites Enviados</p>
                <p className="text-2xl font-bold text-gray-900">{inviteStats.sent || 0}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
                <Send className="w-4 h-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Convites Aceitos</p>
                <p className="text-2xl font-bold text-gray-900">{inviteStats.accepted || 0}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Convites Expirados</p>
                <p className="text-2xl font-bold text-gray-900">{inviteStats.expired || 0}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                <UserX className="w-4 h-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="members" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Membros Ativos ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invites" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Convites ({invites.length})
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <AnimatePresence>
            {members.map(renderMemberCard)}
          </AnimatePresence>

          {members.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum membro ainda</h3>
              <p className="text-gray-600 mb-4">Comece convidando seu primeiro membro da equipe.</p>
              {canInvite && (
                <Button onClick={() => setShowInviteModal(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Convidar Primeiro Membro
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Invites Tab */}
        <TabsContent value="invites" className="space-y-4">
          <AnimatePresence>
            {invites.map(renderInviteCard)}
          </AnimatePresence>

          {invites.length === 0 && (
            <div className="text-center py-12">
              <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum convite enviado</h3>
              <p className="text-gray-600 mb-4">Convide membros para sua equipe.</p>
              {canInvite && (
                <Button onClick={() => setShowInviteModal(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Enviar Primeiro Convite
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleSendInvite}
      />
    </div>
  );
}
