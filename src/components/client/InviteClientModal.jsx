import { useState } from 'react';
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
import { Loader2, CheckCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function InviteClientModal({
  client: clientProp,
  clientId: clientIdProp,
  clientName,
  isOpen,
  onClose,
  onSuccess,
  onInviteSent,
}) {
  const client = clientProp || (clientIdProp
    ? { id: clientIdProp, name: clientName }
    : null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

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

    try {
      setLoading(true);

      const { inviteClient } = await import('@/api/functions');

      const response = await inviteClient({
        clientId: client.id,
        email: email.trim(),
        fullName: name.trim(),
        sendEmail: true,
      });

      if (response.success) {
        if (response.alreadyExists) {
          toast.success('Cliente já tem acesso ao portal!');
          onSuccess?.(response);
          onInviteSent?.(response);
          onClose();
          setEmail('');
          setName('');
          return;
        }

        if (response.temporaryPassword && !response.emailSent) {
          setCreatedCredentials({
            email: response.email || email.trim(),
            password: response.temporaryPassword,
            loginUrl: response.loginUrl || '/client-login',
          });
          toast.success('Usuário criado! Compartilhe as credenciais com o contato.');
          onSuccess?.(response);
          onInviteSent?.(response);
          return;
        }

        toast.success(
          response.emailSent
            ? 'Convite enviado com sucesso!'
            : 'Usuário criado com sucesso!'
        );

        onSuccess?.(response);
        onInviteSent?.(response);
        onClose();
        setEmail('');
        setName('');
      } else {
        throw new Error(response.message || 'Erro desconhecido ao enviar convite');
      }
    } catch (error) {
      console.error('Erro ao enviar convite:', error);

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

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado!`);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
    setEmail('');
    setName('');
    setCreatedCredentials(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            {createdCredentials ? 'Acesso criado' : 'Convidar Cliente para o Portal'}
          </DialogTitle>
          <DialogDescription>
            {createdCredentials ? (
              'Compartilhe estas credenciais com o contato. O e-mail automático ainda não está disponível.'
            ) : client?.name ? (
              <>
                Convidar contato de <strong>{client.name}</strong> para acessar o portal do
                cliente.
              </>
            ) : (
              'Convidar contato para acessar o portal do cliente.'
            )}
          </DialogDescription>
        </DialogHeader>

        {createdCredentials ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <div className="flex gap-2">
                <Input value={createdCredentials.email} readOnly />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(createdCredentials.email, 'E-mail')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Senha temporária</Label>
              <div className="flex gap-2">
                <Input value={createdCredentials.password} readOnly />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(createdCredentials.password, 'Senha')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Login do portal</Label>
              <div className="flex gap-2">
                <Input value={createdCredentials.loginUrl} readOnly />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(createdCredentials.loginUrl, 'Link')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" onClick={handleClose}>
                Concluir
              </Button>
            </DialogFooter>
          </div>
        ) : (
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
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
