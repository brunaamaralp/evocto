
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowRight, Shield, Eye, EyeOff, Loader2, 
  CheckCircle, AlertCircle, Key, User as UserIcon 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ClientActivation() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [step, setStep] = useState('validating'); // 'validating' | 'activate' | 'success' | 'error'
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

      const [randomPart, payloadBase64, signature] = tokenParts;
      
      // Decodificar payload - usar atob para compatibilidade com browser
      let payload;
      try {
        const decodedPayload = atob(payloadBase64);
        payload = JSON.parse(decodedPayload);
      } catch (e) {
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
    if (!password || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Atualizar usuário com senha e limpar token
      await User.update(tokenData.userId, {
        password_hash: password, // Isso será hasheado pelo backend
        magic_token: null,
        magic_token_expires_at: null,
        tutorial_completed: false // Cliente precisará ver tutorial
      });

      // Log da ativação
      const { AuditLog } = await import('@/api/entities');
      await AuditLog.create({
        agencyId: tokenData.agencyId,
        entity_type: 'User',
        entity_id: tokenData.userId,
        action: 'CLIENT_ACCOUNT_ACTIVATED',
        actor_id: tokenData.email,
        meta_json: {
          clientId: tokenData.clientId,
          activatedAt: new Date().toISOString()
        }
      });

      setStep('success');
      
      // Auto-login após 2 segundos
      setTimeout(() => {
        navigate('/client-login');
      }, 2000);

    } catch (error) {
      console.error('Erro na ativação:', error);
      setError('Erro ao ativar conta. Tente novamente.');
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
                Sua conta foi ativada com sucesso. Você será redirecionado automaticamente.
              </p>
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Fazendo login...</span>
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
                  <CardTitle className="text-xl">Ativar Conta</CardTitle>
                  <p className="text-sm text-gray-600">Defina sua senha para acessar o portal</p>
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

              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite a senha novamente"
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleActivation}
                disabled={isLoading || !password || !confirmPassword}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ativando...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Ativar Conta
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
