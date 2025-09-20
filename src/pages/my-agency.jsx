
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { User } from '@/api/entities';
import { Agency } from '@/api/entities';
import { Invite } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Mail, Shield, Send } from 'lucide-react';
import { toast } from 'sonner';

// Import das funções de backend
import { sendInvite } from '@/api/functions';

function MemberList({ members, invites }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Membros da Equipe</h3>
      <div className="bg-white p-4 rounded-lg border">
        <ul className="divide-y divide-slate-200">
          {members.map(member => (
            <li key={member.id} className="py-3 flex justify-between items-center">
              <div>
                <p className="font-medium text-slate-900">{member.full_name}</p>
                <p className="text-sm text-slate-500">{member.email}</p>
              </div>
              <span className="text-sm capitalize px-2 py-1 rounded-full bg-blue-100 text-blue-700">{member.role}</span>
            </li>
          ))}
          {invites.map(invite => (
             <li key={invite.id} className="py-3 flex justify-between items-center opacity-60">
              <div>
                <p className="font-medium text-slate-900">{invite.email}</p>
                <p className="text-sm text-slate-500 italic">Convite pendente</p>
              </div>
              <span className="text-sm capitalize px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">{invite.role}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function InviteMemberDialog({ onInviteSent }) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('team');
  const [isLoading, setIsLoading] = useState(false);

  const handleInvite = async () => {
    if (!email) {
      toast.error('Por favor, insira um e-mail.');
      return;
    }
    
    setIsLoading(true);
    try {
      const { data } = await sendInvite({ email, role });
      if (data.success) {
        toast.success(`Convite enviado para ${email}!`);
        onInviteSent();
        setIsOpen(false);
        setEmail('');
      } else {
        throw new Error(data.message || 'Falha ao enviar convite.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Convidar Membro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar novo membro</DialogTitle>
          <DialogDescription>
            A pessoa convidada receberá um e-mail para acessar a sua agência.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Permissão</Label>
             <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <Shield className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Selecione a permissão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin (gerencia membros e configurações)</SelectItem>
                <SelectItem value="team">Equipe (cria e gerencia projetos)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleInvite} disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          {isLoading ? 'Enviando...' : 'Enviar Convite'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}


export default function MyAgencyPage() {
  const { agencyId, isAdmin } = useSession();
  const [agency, setAgency] = useState(null);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!agencyId) {
      setLoading(false); // Ensure loading state is turned off if no agencyId
      return;
    }
    setLoading(true);
    try {
      const [agencyData, membersData, invitesData] = await Promise.all([
        Agency.get(agencyId),
        User.filter({ agencyId }),
        Invite.filter({ agencyId, status: 'sent' })
      ]);
      setAgency(agencyData);
      setMembers(membersData);
      setInvites(invitesData);
    } catch (error) {
      console.error("Falha ao carregar dados da agência:", error);
      toast.error("Não foi possível carregar os dados da sua agência.");
    } finally {
      setLoading(false);
    }
  }, [agencyId]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  if (loading) {
    return <div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }
  
  if (!agency) {
    return <div className="p-8 text-center text-slate-500">Nenhuma agência encontrada.</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{agency.agencyName}</h1>
          <p className="text-slate-500 mt-1">Gerencie as configurações e membros da sua agência.</p>
        </div>
        {isAdmin() && <InviteMemberDialog onInviteSent={fetchData} />}
      </div>
      
      <MemberList members={members} invites={invites} />

      {/* Placeholder para mais seções de configurações */}
    </div>
  );
}
