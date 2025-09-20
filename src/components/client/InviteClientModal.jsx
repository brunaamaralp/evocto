import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function InviteClientModal({ 
  client,
  isOpen, 
  onClose, 
  onSuccess 
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email?.trim()) {
      toast.error('Por favor, informe o email.');
      return;
    }

    if (!name?.trim()) {
      toast.error('Por favor, informe o nome do contato.');
      return;
    }

    if (!client?.id) {
      toast.error('Cliente não identificado.');
      return;
    }

    console.log('📤 Enviando convite:', {
      clientId: client.id,
      email: email.trim(),
      name: name.trim()
    });

    try {
      setLoading(true);
      
      // Importar função dinamicamente
      const { inviteClient } = await import('@/api/functions');
      
      const response = await inviteClient({
        clientId: client.id,
        email: email.trim(),
        fullName: name.trim(), // Usar 'fullName' que é esperado pela função
        sendEmail: true
      });

      console.log('✅ Resposta do convite:', response);

      if (response.success) {
        if (response.alreadyExists) {
          toast.success('Cliente já tem acesso ao portal!');
        } else {
          toast.success(response.emailSent ? 
            'Convite enviado com sucesso!' : 
            'Usuário criado com sucesso!'
          );
        }
        
        onSuccess?.(response);
        onClose();
        
        // Limpar formulário
        setEmail('');
        setName('');
      } else {
        throw new Error(response.message || 'Erro desconhecido ao enviar convite');
      }

    } catch (error) {
      console.error('❌ Erro ao enviar convite:', error);
      
      // Mostrar mensagem de erro mais específica
      let errorMessage = 'Erro ao enviar convite.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.status === 400) {
        errorMessage = 'Dados inválidos. Verifique os campos preenchidos.';
      } else if (error.status === 403) {
        errorMessage = 'Você não tem permissão para convidar clientes.';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      // Limpar formulário ao fechar
      setEmail('');
      setName('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            Convidar Cliente para o Portal
          </DialogTitle>
          <DialogDescription>
            {client?.name ? (
              <>Convidar contato de <strong>{client.name}</strong> para acessar o portal do cliente.</>
            ) : (
              'Convidar contato para acessar o portal do cliente.'
            )}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Nome do Contato *</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João da Silva"
              disabled={loading}
              required
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email *</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: joao.silva@cliente.com"
              disabled={loading}
              required
              className="w-full"
            />
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !email.trim() || !name.trim()}
              className="min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Convite'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}