import React, { useState } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User as UserIcon, Mail, Shield } from 'lucide-react';

export default function ProfileSettingsPage() {
  const { user, updateUser } = useSession();
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateUser({
        full_name: formData.full_name
      });
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Perfil</h1>
        <p className="text-gray-600">Gerencie suas informações pessoais</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Informações Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                O email não pode ser alterado. Entre em contato com o suporte se necessário.
              </p>
            </div>

            <div>
              <Label>Papel no Sistema</Label>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium capitalize">
                  {user?.role === 'owner' && 'Proprietário'}
                  {user?.role === 'admin' && 'Administrador'}
                  {user?.role === 'team' && 'Membro da Equipe'}
                  {user?.role === 'client' && 'Cliente'}
                </span>
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}