import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '@/api/entities';
import { Agency } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LogIn, Eye, EyeOff, Loader2, AlertCircle, 
  ArrowLeft, Mail, Lock, Shield, Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

export default function ClientLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [agencyData, setAgencyData] = useState(null);

  const loadAgencyBranding = useCallback(async () => {
    try {
      // Tentar pegar agencyId de parâmetros da URL
      const urlParams = new URLSearchParams(location.search);
      const agencyId = urlParams.get('agency');
      
      if (agencyId) {
        const agency = await Agency.get(agencyId);
        setAgencyData(agency);
        // Salvar para próximas visitas
        localStorage.setItem('clientLoginAgency', agencyId);
      } else {
        // Tentar carregar da última visita
        const savedAgencyId = localStorage.getItem('clientLoginAgency');
        if (savedAgencyId) {
          try {
            const agency = await Agency.get(savedAgencyId);
            setAgencyData(agency);
          } catch (error) {
            // Agência não existe mais, remover do localStorage
            localStorage.removeItem('clientLoginAgency');
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar branding da agência:', error);
    }
  }, [location.search]);

  const checkExistingAuth = useCallback(async () => {
    try {
      const user = await User.me();
      if (user && user.role === 'client') {
        // Usuário já logado, redirecionar
        navigate('/client-portal');
      }
    } catch (error) {
      // Usuário não autenticado, continuar com login
    }
  }, [navigate]);

  // Tentar detectar agência a partir de parâmetros da URL ou localStorage
  useEffect(() => {
    loadAgencyBranding();
    checkExistingAuth();
  }, [loadAgencyBranding, checkExistingAuth]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await User.login({ email: email.trim(), password });
      
      // Verificar se usuário é cliente
      const user = await User.me();
      
      if (!user) {
        throw new Error('Falha na autenticação');
      }

      if (user.role !== 'client') {
        throw new Error('Esta área é restrita para clientes. Use o login da agência para acessar como equipe.');
      }

      // Login bem-sucedido
      toast.success('Login realizado com sucesso!');
      
      // Redirecionar para portal do cliente
      const redirectTo = new URLSearchParams(location.search).get('redirect') || '/client-portal';
      navigate(redirectTo);

    } catch (error) {
      console.error('Erro no login:', error);
      
      let errorMessage = 'Erro ao fazer login. Verifique suas credenciais.';
      
      if (error.message.includes('credentials')) {
        errorMessage = 'Email ou senha incorretos.';
      } else if (error.message.includes('client')) {
        errorMessage = error.message;
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate(`/password-reset${agencyData?.id ? `?agency=${agencyData.id}` : ''}`);
  };

  const handleBackToMain = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding da Agência */}
        {agencyData ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            {agencyData.logoUrl ? (
              <img
                src={agencyData.logoUrl}
                alt={agencyData.agencyName}
                className="h-16 mx-auto mb-4"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">
                  {agencyData.agencyName?.slice(0, 2) || 'AG'}
                </span>
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {agencyData.agencyName}
            </h1>
            <p className="text-gray-600">Portal do Cliente</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Portal do Cliente
            </h1>
            <p className="text-gray-600">Acesse sua área exclusiva</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Acesso do Cliente</CardTitle>
                  <p className="text-sm text-gray-600">Entre com suas credenciais</p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      disabled={isLoading}
                      className="pl-10"
                      autoFocus
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      disabled={isLoading}
                      className="pl-10 pr-10"
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleForgotPassword}
                    className="text-blue-600 hover:text-blue-700 p-0 h-auto"
                  >
                    Esqueci minha senha
                  </Button>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">ou</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToMain}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Site Principal
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Informação de suporte */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-gray-600">
            Problemas para acessar? Entre em contato com{' '}
            {agencyData?.contactEmail ? (
              <a 
                href={`mailto:${agencyData.contactEmail}`}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {agencyData.agencyName}
              </a>
            ) : (
              <span className="text-blue-600 font-medium">sua agência</span>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
}