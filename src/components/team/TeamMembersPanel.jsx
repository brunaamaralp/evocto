import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, UserMinus, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { manageTeamMembers } from '@/api/functions';

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'team', label: 'Team' },
  { value: 'client', label: 'Client' },
];

export default function TeamMembersPanel() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const { data } = await manageTeamMembers({ action: 'list' });
      if (data?.success) {
        setMembers(data.items || []);
      } else {
        setError(data?.error || 'Falha ao carregar membros');
      }
    } catch (e) {
      setError(e?.message || 'Falha ao carregar membros');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChangeRole = async (userId, newRole) => {
    setError('');
    setInfo('');
    try {
      const { data } = await manageTeamMembers({ action: 'changeRole', userId, role: newRole });
      if (data?.success) {
        setInfo('Papel atualizado com sucesso.');
        await load(); // refetch para refletir RLS imediatamente
      } else {
        setError(data?.error || 'Falha ao atualizar papel');
      }
    } catch (e) {
      setError(e?.message || 'Erro ao atualizar papel');
    }
  };

  const handleRemove = async (userId) => {
    setError('');
    setInfo('');
    try {
      const { data } = await manageTeamMembers({ action: 'remove', userId });
      if (data?.success) {
        setInfo('Membro removido da agência.');
        await load();
      } else {
        setError(data?.error || 'Falha ao remover membro');
      }
    } catch (e) {
      setError(e?.message || 'Erro ao remover membro');
    }
  };

  const roleBadge = useCallback((role) => {
    const map = {
      owner: 'bg-purple-100 text-purple-800 border-purple-300',
      admin: 'bg-blue-100 text-blue-800 border-blue-300',
      team: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      client: 'bg-slate-100 text-slate-800 border-slate-300',
    };
    return <Badge className={`${map[role] || ''}`}>{role}</Badge>;
  }, []);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Membros da Equipe</h2>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        {info && (
          <div className="flex items-center gap-2 text-emerald-600 text-sm">
            <CheckCircle2 className="w-4 h-4" /> {info}
          </div>
        )}

        {loading ? (
          <p className="text-slate-600">Carregando membros...</p>
        ) : members.length === 0 ? (
          <p className="text-slate-600">Nenhum membro encontrado na agência.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.full_name || '-'}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {roleBadge(m.role)}
                        <Select
                          value={m.role}
                          onValueChange={(v) => handleChangeRole(m.id, v)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Selecionar papel" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemove(m.id)}
                        disabled={m.role === 'owner'}
                        className="gap-1"
                      >
                        <UserMinus className="w-4 h-4" /> Remover
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}