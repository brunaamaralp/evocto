import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClientSetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSetPassword = async () => {
    if (password !== confirmPassword) {
      alert('Senhas não coincidem');
      return;
    }
    
    setLoading(true);
    try {
      const { setClientPassword } = await import('@/api/functions');
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      
      await setClientPassword({
        resetToken: token,
        password: password
      });
      
      alert('Senha definida com sucesso!');
      window.location.href = '/client-login';
      
    } catch (error) {
      alert('Erro ao definir senha: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Definir Senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            type="password" 
            placeholder="Confirmar senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button 
            onClick={handleSetPassword}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Definindo...' : 'Definir Senha'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}