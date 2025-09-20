import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Switch,
} from '@/components/ui/switch';
import { 
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  Copy,
  RefreshCw,
  Shield,
  Send
} from 'lucide-react';
import { useClientUserCreation } from '@/hooks/useClientUserCreation';
import { toast } from 'sonner';

/**
 * Componente para configuração de login do cliente
 */
export default function ClientLoginConfig({ 
  clientData, 
  onSuccess, 
  onCancel,
  mode = 'create' // 'create' | 'invite'
}) {
  const {
    loading,
    error,
    generateTemporaryPassword,
    createClientWithUser,
    createClientOnly,
    inviteExistingClient,
    validateUserData,
    checkEmailAvailability
  } = useClientUserCreation();

  const [loginOption, setLoginOption] = useState('create_user'); // 'create_user' | 'invite_later' | 'no_login'
  const [userData, setUserData] = useState({
    email: '',
    name: '',
    password: '',
    sendWelcomeEmail: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Verificar disponibilidade do email em tempo real
  useEffect(() => {
    const checkEmail = async () => {
      if (userData.email && userData.email.includes('@')) {
        setEmailChecking(true);
        try {
          const available = await checkEmailAvailability(userData.email);
          setEmailAvailable(available);
        } catch (err) {
          setEmailAvailable(null);
        } finally {
          setEmailChecking(false);
        }
      } else {
        setEmailAvailable(null);
      }
    };

    const timeoutId = setTimeout(checkEmail, 500);
    return () => clearTimeout(timeoutId);
  }, [userData.email, checkEmailAvailability]);

  const handleUserDataChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando usuário digita
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = generateTemporaryPassword();
    setUserData(prev => ({ ...prev, password: newPassword }));
    toast.success('Senha temporária gerada!');
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(userData.password);
    toast.success('Senha copiada para a área de transferência!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar dados do usuário se necessário
    if (loginOption === 'create_user') {
      const validation = validateUserData(userData);
      if (!validation.isValid) {
        const errors = {};
        validation.errors.forEach(error => {
          if (error.includes('Email')) errors.email = error;
          if (error.includes('Nome')) errors.name = error;
          if (error.includes('Senha')) errors.password = error;
        });
        setValidationErrors(errors);
        return;
      }

      if (emailAvailable === false) {
        setValidationErrors({ email: 'Este email já está em uso' });
        return;
      }
    }

    try {
      let result;

      switch (loginOption) {
        case 'create_user':
          result = await createClientWithUser(clientData, userData);
          break;
        case 'invite_later':
          result = await createClientOnly(clientData);
          break;
        case 'no_login':
          result = await createClientOnly(clientData);
          break;
        default:
          throw new Error('Opção de login inválida');
      }

      onSuccess(result);

    } catch (err) {
      // Erro já tratado no hook
    }
  };

  const getEmailStatusIcon = () => {
    if (emailChecking) return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    if (emailAvailable === true) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (emailAvailable === false) return <AlertCircle className="w-4 h-4 text-red-500" />;
    return null;
  };

  const getEmailStatusText = () => {
    if (emailChecking) return 'Verificando disponibilidade...';
    if (emailAvailable === true) return 'Email disponível';
    if (emailAvailable === false) return 'Email já está em uso';
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuração de Login</h2>
        <p className="text-gray-600">
          {mode === 'create' 
            ? 'Configure como o cliente acessará o portal'
            : 'Configure o acesso do cliente ao portal'
          }
        </p>
      </div>

      {/* Opções de Login */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Opções de Acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Switch
                id="create_user"
                checked={loginOption === 'create_user'}
                onCheckedChange={(checked) => checked && setLoginOption('create_user')}
              />
              <Label htmlFor="create_user" className="flex-1">
                <div className="font-medium">Criar login agora</div>
                <div className="text-sm text-gray-600">
                  Criar usuário com acesso imediato ao portal
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Switch
                id="invite_later"
                checked={loginOption === 'invite_later'}
                onCheckedChange={(checked) => checked && setLoginOption('invite_later')}
              />
              <Label htmlFor="invite_later" className="flex-1">
                <div className="font-medium">Enviar convite por email</div>
                <div className="text-sm text-gray-600">
                  Cliente receberá email para ativar conta
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Switch
                id="no_login"
                checked={loginOption === 'no_login'}
                onCheckedChange={(checked) => checked && setLoginOption('no_login')}
              />
              <Label htmlFor="no_login" className="flex-1">
                <div className="font-medium">Sem acesso ao portal</div>
                <div className="text-sm text-gray-600">
                  Apenas dados do cliente, sem login
                </div>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração do Usuário */}
      {loginOption === 'create_user' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Dados do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email de Acesso *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={userData.email}
                    onChange={(e) => handleUserDataChange('email', e.target.value)}
                    placeholder="contato@empresa.com"
                    className={`pl-10 pr-10 ${validationErrors.email ? 'border-red-500' : ''}`}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getEmailStatusIcon()}
                  </div>
                </div>
                {validationErrors.email && (
                  <p className="text-sm text-red-600">{validationErrors.email}</p>
                )}
                {getEmailStatusText() && !validationErrors.email && (
                  <p className={`text-sm ${emailAvailable ? 'text-green-600' : 'text-red-600'}`}>
                    {getEmailStatusText()}
                  </p>
                )}
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Contato *</Label>
                <Input
                  id="name"
                  value={userData.name}
                  onChange={(e) => handleUserDataChange('name', e.target.value)}
                  placeholder="Nome completo do responsável"
                  className={validationErrors.name ? 'border-red-500' : ''}
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-600">{validationErrors.name}</p>
                )}
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={userData.password}
                    onChange={(e) => handleUserDataChange('password', e.target.value)}
                    placeholder="Deixe vazio para gerar senha temporária"
                    className="pl-10 pr-20"
                  />
                  <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleGeneratePassword}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {userData.password && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyPassword}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copiar Senha
                    </Button>
                    <span className="text-sm text-gray-600">
                      {userData.password.length < 8 ? 'Senha deve ter pelo menos 8 caracteres' : 'Senha válida'}
                    </span>
                  </div>
                )}
                {validationErrors.password && (
                  <p className="text-sm text-red-600">{validationErrors.password}</p>
                )}
              </div>

              {/* Opções Adicionais */}
              <div className="flex items-center space-x-3">
                <Switch
                  id="sendWelcomeEmail"
                  checked={userData.sendWelcomeEmail}
                  onCheckedChange={(checked) => handleUserDataChange('sendWelcomeEmail', checked)}
                />
                <Label htmlFor="sendWelcomeEmail">
                  <div className="font-medium">Enviar email de boas-vindas</div>
                  <div className="text-sm text-gray-600">
                    Cliente receberá email com instruções de acesso
                  </div>
                </Label>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Preview */}
      {loginOption === 'create_user' && userData.email && userData.name && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-900">Preview do Acesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900">{userData.name}</h4>
                  <p className="text-sm text-blue-800">{userData.email}</p>
                </div>
              </div>
              
              <div className="text-sm text-blue-800">
                <p><strong>Login:</strong> {userData.email}</p>
                <p><strong>Senha:</strong> {userData.password ? 'Definida' : 'Será gerada automaticamente'}</p>
                <p><strong>Email de boas-vindas:</strong> {userData.sendWelcomeEmail ? 'Sim' : 'Não'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Erro */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Botões */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          type="submit"
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              {loginOption === 'create_user' ? 'Criando...' : 'Processando...'}
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              {loginOption === 'create_user' ? 'Criar Cliente e Usuário' : 
               loginOption === 'invite_later' ? 'Criar Cliente e Enviar Convite' : 
               'Criar Apenas Cliente'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

