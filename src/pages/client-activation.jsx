import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, CheckCircle, AlertCircle, Key } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ClientActivation() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [step, setStep] = useState('validating'); // 'validating' | 'activate' | 'success' | 'error'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenData, setTokenData] = useState(null);
  const [agencyData, setAgencyData] = useState(null);

  const token = new URLSearchParams(location.search).get('token');

  const validateToken = useCallback(async () => {
    try {
      setStep('validating');
      setError('');

      if (!token) {
        throw new Error('Token não fornecido');
      }

      // Parse do token
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Formato de token inválido');
      }

      const [_randomPart, payloadBase64, _signature] = tokenParts;
      
      // Decodificar payload - usar atob para compatibilidade com browser
      let payload;
      try {
        const decodedPayload = atob(payloadBase64);
        payload = JSON.parse(decodedPayload);
      } catch (_e) {
        throw new Error('Token corrompido');
      }

      // Verificar se token não expirou (7 dias)
      const tokenAge = Date.now() - payload.timestamp;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms
      
      if (tokenAge > maxAge) {
        throw new Error('Token expirado. Solicite um novo convite.');
      }

      // Verificar se usuário existe e token é válido
      const users = await User.filter({ 
        email: payload.email,
        magic_token: token 
      });

      if (users.length === 0) {
        throw new Error('Token inválido ou já utilizado.');
      }

      const user = users[0];

      // Verificar se token não expirou no banco
      if (user.magic_token_expires_at && new Date() > new Date(user.magic_token_expires_at)) {
        throw new Error('Token expirado. Solicite um novo convite.');
      }

      // Carregar dados da agência para branding
      if (user.agencyId) {
        try {
          const { Agency } = await import('@/api/entities');
          const agency = await Agency.get(user.agencyId);
          setAgencyData(agency);
        } catch (agencyError) {
          console.warn('Erro ao carregar dados da agência:', agencyError);
        }
      }

      setTokenData({ ...payload, userId: user.id });
      setStep('activate');

    } catch (error) {
      console.error('Erro na validação do token:', error);
      setError(error.message || 'Erro ao validar token de ativação');
      setStep('error');
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setStep('error');
      setError('Token de ativação não encontrado na URL.');
    }
  }, [token, validateToken]);

  const handleActivation = async () => {
    if (!tokenData?.userId) {
      setError('Dados de ativação incompletos.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Limpa o token. A senha de Auth é a temporária criada pela agência
      // (ou redefinição em /password-reset) — o client SDK não altera senha de terceiros.
      await User.update(tokenData.userId, {
        magic_token: null,
        magic_token_expires_at: null,
        tutorial_completed: false,
      });

      try {
        const { AuditLog } = await import('@/api/entities');
        await AuditLog.create({
          agencyId: tokenData.agencyId,
          entity_type: 'User',
          entity_id: tokenData.userId,
          action: 'CLIENT_ACCOUNT_ACTIVATED',
          actor_id: tokenData.email,
          meta_json: {
            clientId: tokenData.clientId,
            activatedAt: new Date().toISOString(),
          },
        });
      } catch (auditError) {
        console.warn('Audit log de ativação falhou:', auditError);
      }

      setStep('success');

      setTimeout(() => {
        navigate('/client-login');
      }, 2000);
    } catch (error) {
      console.error('Erro na ativação:', error);
      setError(
        'Não foi possível ativar a conta por aqui. Use a senha enviada pela agência em Entrar, ou peça uma nova senha.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/client-login');
  };

  // Loading state
  if (step === 'validating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Validando convite...
            </h2>
            <p className="text-gray-600">
              Aguarde enquanto verificamos seu token de ativação.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-xl text-red-900">Token Inválido</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-red-700 mb-6">{error}</p>
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full"
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl text-green-900">Conta Ativada!</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-green-700 mb-4">
                Convite confirmado. Entre com o e-mail e a senha enviados pela sua agência.
              </p>
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Abrindo o login...</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Activation form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding da agência */}
        {agencyData && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            {agencyData.logoUrl ? (
              <img
                src={agencyData.logoUrl}
                alt={agencyData.agencyName}
                className="h-12 mx-auto mb-4"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">
                  {agencyData.agencyName.slice(0, 2)}
                </span>
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {agencyData.agencyName}
            </h1>
            <p className="text-gray-600">Portal do Cliente</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Confirmar acesso</CardTitle>
                  <p className="text-sm text-gray-600">
                    {tokenData?.email
                      ? `Convite para ${tokenData.email}`
                      : 'Confirme o convite para liberar o portal'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <p className="text-sm text-gray-600">
                Depois de confirmar, entre com o e-mail e a senha temporária enviados pela sua agência.
                Se não tiver a senha, peça um novo acesso ou use “Esqueci minha senha”.
              </p>

              <Button
                onClick={handleActivation}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Confirmar convite
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={handleGoToLogin}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Já tem uma conta? Fazer login
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
