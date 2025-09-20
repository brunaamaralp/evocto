import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from '@/components/auth/SessionManager';
import { User } from '@/api/entities';
import { toast } from 'sonner';

export default function MyAccount() {
  const { user, reloadSession } = useSession();
  const [name, setName] = React.useState(user?.name || '');
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await User.updateMyUserData({ name });
      toast.success('Suas informações foram atualizadas.');
      await reloadSession();
    } catch (error) {
      toast.error('Ocorreu um erro ao salvar suas informações.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Minha Conta</CardTitle>
          <CardDescription>Gerencie suas informações pessoais.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ''} disabled />
              <p className="text-xs text-slate-500">O e-mail não pode ser alterado.</p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}