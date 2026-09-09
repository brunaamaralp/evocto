
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
import { sendInvite } from '@/api/functions';
import { getModulePastel } from '@/lib/modulePastels';

function MemberList({ members, invites }) {
  const pastel = getModulePastel('team');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#18162A]">Membros da Equipe</h3>
      <div className={`p-4 rounded-2xl border-transparent ${pastel.soft}`}>
        <ul className="divide-y divide-[#E8E5F5]/70">
          {members.map(member => (
            <li key={member.id} className="py-3 flex justify-between items-center">
              <div>
                <p className="font-medium text-[#18162A]">{member.full_name}</p>
                <p className="text-sm text-[#7A7595]">{member.email}</p>
              </div>
              <span className="text-sm capitalize px-2.5 py-1 rounded-full bg-[#EDE9FB] text-[#6C47D8]">{member.role}</span>
            </li>
          ))}
          {invites.map(invite => (
             <li key={invite.id} className="py-3 flex justify-between items-center opacity-60">
              <div>
                <p className="font-medium text-[#18162A]">{invite.email}</p>
                <p className="text-sm text-[#7A7595] italic">Convite pendente</p>
              </div>
              <span className="text-sm capitalize px-2.5 py-1 rounded-full bg-[#FFF8E6] text-[#7A5A10]">{invite.role}</span>
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
      <DialogContent className="rounded-2xl">
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
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7595]" />
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
                <Shield className="w-4 h-4 mr-2 text-[#7A7595]" />
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
      setLoading(false);
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
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#6C47D8]" />
      </div>
    );
  }
  
  if (!agency) {
    return <div className="text-center text-[#7A7595]">Nenhuma agência encontrada.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#18162A]">{agency.agencyName}</h1>
          <p className="text-[#7A7595] mt-1">Gerencie as configurações e membros da sua agência.</p>
        </div>
        {isAdmin() && <InviteMemberDialog onInviteSent={fetchData} />}
      </div>
      
      <MemberList members={members} invites={invites} />
    </div>
  );
}
