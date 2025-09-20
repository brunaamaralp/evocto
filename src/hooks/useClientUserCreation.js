import { useState, useCallback } from 'react';
import { User, Client } from '@/api/entities';
import { 
  createClientUser, 
  checkEmailAvailability, 
  generateTemporaryPassword,
  sendWelcomeEmail 
} from '@/api/clientUserAPI';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Hook para gerenciamento de criação de usuários clientes
 */
export function useClientUserCreation() {
  const { agency, user } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Verifica se email já está em uso
   */
  const checkEmailAvailability = useCallback(async (email) => {
    try {
      const existingUsers = await User.filter({
        email: email.toLowerCase().trim(),
        agencyId: agency.id
      });

      return existingUsers.length === 0;
    } catch (err) {
      console.error('Erro ao verificar disponibilidade do email:', err);
      return false;
    }
  }, [agency]);

  /**
   * Gera senha temporária segura
   */
  const generateTemporaryPasswordHook = useCallback(() => {
    return generateTemporaryPassword();
  }, []);

  /**
   * Cria usuário cliente junto com o cliente
   */
  const createClientWithUser = useCallback(async (clientData, userData) => {
    setLoading(true);
    setError(null);

    try {
      // Validar dados do usuário
      if (!userData.email || !userData.name) {
        throw new Error('Email e nome do usuário são obrigatórios');
      }

      // Verificar se email já está em uso
      const emailAvailable = await checkEmailAvailability(userData.email, agency.id);
      if (!emailAvailable) {
        throw new Error('Este email já está em uso por outro usuário');
      }

      // Gerar senha temporária se não fornecida
      const password = userData.password || generateTemporaryPasswordHook();

      // Criar cliente primeiro
      const clientDataWithAgency = {
        ...clientData,
        agencyId: agency.id
      };

      const newClient = await Client.create(clientDataWithAgency);

      // Criar usuário cliente
      const userDataWithClient = {
        email: userData.email.toLowerCase().trim(),
        name: userData.name.trim(),
        password: password,
        role: 'client',
        agencyId: agency.id,
        clientId: newClient.id,
        status: 'active',
        isTemporaryPassword: !userData.password, // Se não foi fornecida senha, é temporária
        createdBy: user.email,
        createdAt: new Date().toISOString()
      };

      const newUser = await User.create(userDataWithClient);

      // Log de auditoria
      const { AuditLog } = await import('@/api/entities');
      await AuditLog.create({
        agencyId: agency.id,
        entity_type: 'User',
        entity_id: newUser.id,
        action: 'CLIENT_USER_CREATED',
        actor_id: user.email,
        meta_json: {
          clientId: newClient.id,
          clientName: newClient.name,
          userEmail: userData.email,
          hasTemporaryPassword: !userData.password,
          createdAt: new Date().toISOString()
        }
      });

      toast.success('Cliente e usuário criados com sucesso!');
      
      return {
        client: newClient,
        user: newUser,
        temporaryPassword: !userData.password ? password : null,
        hasTemporaryPassword: !userData.password
      };

    } catch (err) {
      const errorMessage = err.message || 'Erro ao criar cliente e usuário';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [agency, user, checkEmailAvailability, generateTemporaryPassword]);

  /**
   * Cria apenas o cliente (sem usuário)
   */
  const createClientOnly = useCallback(async (clientData) => {
    setLoading(true);
    setError(null);

    try {
      const clientDataWithAgency = {
        ...clientData,
        agencyId: agency.id
      };

      const newClient = await Client.create(clientDataWithAgency);

      toast.success('Cliente criado com sucesso!');
      return { client: newClient };

    } catch (err) {
      const errorMessage = err.message || 'Erro ao criar cliente';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [agency]);

  /**
   * Envia convite para cliente existente
   */
  const inviteExistingClient = useCallback(async (clientId, userData) => {
    setLoading(true);
    setError(null);

    try {
      // Verificar se email já está em uso
      const emailAvailable = await checkEmailAvailability(userData.email);
      if (!emailAvailable) {
        throw new Error('Este email já está em uso por outro usuário');
      }

      // Importar função de convite
      const { inviteClient } = await import('@/api/functions');
      
      const response = await inviteClient({
        clientId: clientId,
        email: userData.email.trim(),
        fullName: userData.name.trim(),
        sendEmail: true
      });

      if (response.success) {
        toast.success(response.emailSent ? 
          'Convite enviado com sucesso!' : 
          'Usuário criado com sucesso!'
        );
        return response;
      } else {
        throw new Error(response.message || 'Erro ao enviar convite');
      }

    } catch (err) {
      const errorMessage = err.message || 'Erro ao enviar convite';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [checkEmailAvailability]);

  /**
   * Valida dados do usuário
   */
  const validateUserData = useCallback((userData) => {
    const errors = [];

    if (!userData.email?.trim()) {
      errors.push('Email é obrigatório');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Email inválido');
    }

    if (!userData.name?.trim()) {
      errors.push('Nome é obrigatório');
    } else if (userData.name.trim().length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
    }

    if (userData.password && userData.password.length < 8) {
      errors.push('Senha deve ter pelo menos 8 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  return {
    loading,
    error,
    checkEmailAvailability: checkEmailAvailabilityHook,
    generateTemporaryPassword: generateTemporaryPasswordHook,
    createClientWithUser,
    createClientOnly,
    inviteExistingClient,
    validateUserData
  };
}
