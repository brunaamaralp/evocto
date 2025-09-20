import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { 
  Key, 
  Copy, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  Shield,
  Clock,
  User
} from 'lucide-react';
import { generateTemporaryPassword } from '@/api/clientUserAPI';
import { toast } from 'sonner';

/**
 * Modal para gerenciar senhas temporárias de clientes
 */
export default function TemporaryPasswordModal({ 
  isOpen, 
  onClose, 
  clientData,
  userData,
  onPasswordGenerated 
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGeneratePassword = () => {
    const newPassword = generateTemporaryPassword();
    setPassword(newPassword);
    setCopied(false);
    toast.success('Senha temporária gerada!');
  };

  const handleCopyPassword = async () => {
    if (!password) return;
    
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success('Senha copiada para a área de transferência!');
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar senha');
    }
  };

  const handleConfirm = () => {
    if (!password) {
      toast.error('Gere uma senha antes de continuar');
      return;
    }
    
    onPasswordGenerated(password);
    onClose();
  };

  const handleClose = () => {
    setPassword('');
    setShowPassword(false);
    setCopied(false);
    onClose();
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'Nenhuma' };
    
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    
    const labels = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte'];
    return { score, label: labels[score] };
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Senha Temporária
          </DialogTitle>
          <DialogDescription>
            Configure uma senha temporária para o cliente acessar o portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Cliente */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">{clientData?.name}</h4>
                  <p className="text-sm text-blue-800">{userData?.name}</p>
                  <p className="text-sm text-blue-700">{userData?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Geração de Senha */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Gerar Senha Temporária</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Clique em 'Gerar' para criar uma senha segura"
                    className="pl-10 pr-20"
                    readOnly
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
                      onClick={handleCopyPassword}
                      disabled={!password}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {password && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Força da senha:</span>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < passwordStrength.score 
                                ? passwordStrength.score <= 2 ? 'bg-red-500' :
                                  passwordStrength.score <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-sm font-medium ${
                        passwordStrength.score <= 2 ? 'text-red-600' :
                        passwordStrength.score <= 3 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    
                    {copied && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm text-green-600"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Senha copiada para a área de transferência!
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="button"
                onClick={handleGeneratePassword}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Gerar Nova Senha
              </Button>
            </CardContent>
          </Card>

          {/* Instruções */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Instruções importantes:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Esta senha será válida por 30 dias</li>
                  <li>O cliente deve alterar a senha no primeiro login</li>
                  <li>Anote a senha em local seguro</li>
                  <li>Envie as credenciais por canal seguro</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Informações de Login */}
          {password && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-900">Credenciais de Acesso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-800">Email:</span>
                    <span className="font-mono text-green-900">{userData?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-800">Senha:</span>
                    <span className="font-mono text-green-900">{password}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-800">Portal:</span>
                    <span className="text-green-900">{window.location.origin}/client-login</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!password}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirmar Senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

