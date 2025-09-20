import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Crown, Shield, User, Eye, 
  Mail, Send, Info, AlertCircle, 
  CheckCircle, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

const roleDetails = {
  admin: {
    icon: Shield,
    title: 'Administrador',
    description: 'Acesso completo à agência, pode gerenciar equipe e configurações',
    permissions: [
      'Gerenciar toda a equipe',
      'Configurar políticas da agência',
      'Acessar todos os projetos',
      'Convidar novos membros',
      'Gerenciar clientes'
    ],
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  team: {
    icon: User,
    title: 'Membro da Equipe',
    description: 'Membro da equipe com acesso a projetos e execução',
    permissions: [
      'Acessar projetos atribuídos',
      'Executar ciclos e planos',
      'Criar e gerenciar aprendizados',
      'Colaborar em briefings',
      'Visualizar relatórios'
    ],
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  client: {
    icon: Eye,
    title: 'Cliente',
    description: 'Acesso limitado ao portal do cliente',
    permissions: [
      'Visualizar seus projetos',
      'Aprovar planos e briefings',
      'Acessar relatórios próprios',
      'Comunicar com a equipe',
      'Portal de aprovação'
    ],
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  }
};

export default function InviteMemberModal({ isOpen, onClose, onInvite }) {
  const [formData, setFormData] = useState({
    email: '',
    role: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de e-mail inválido';
    }
    
    if (!formData.role) {
      newErrors.role = 'Função é obrigatória';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    try {
      await onInvite(formData);
      setFormData({ email: '', role: '' });
      setErrors({});
    } catch (error) {
      console.error('Error inviting member:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleDetails = formData.role ? roleDetails[formData.role] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Convidar Novo Membro</DialogTitle>
              <DialogDescription>
                Envie um convite por e-mail para adicionar um novo membro à sua equipe
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo de E-mail */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-900">
              E-mail do Convidado
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="exemplo@email.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              className={`focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-300' : ''}`}
            />
            {errors.email && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Seleção de Função */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium text-gray-900">
              Função na Equipe
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => {
                setFormData({ ...formData, role: value });
                if (errors.role) setErrors({ ...errors, role: '' });
              }}
            >
              <SelectTrigger className={`focus:ring-2 focus:ring-blue-500 ${errors.role ? 'border-red-300' : ''}`}>
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleDetails).map(([role, details]) => {
                  const Icon = details.icon;
                  return (
                    <SelectItem key={role} value={role} className="py-3">
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-gray-600" />
                        <div>
                          <p className="font-medium">{details.title}</p>
                          <p className="text-xs text-gray-500">{details.description}</p>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.role}
              </p>
            )}
          </div>

          {/* Detalhes da Função Selecionada */}
          {selectedRoleDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border">
                  <selectedRoleDetails.icon className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{selectedRoleDetails.title}</h4>
                    <Badge className={selectedRoleDetails.color}>
                      {formData.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{selectedRoleDetails.description}</p>
                </div>
              </div>
              
              <Separator className="my-3" />
              
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Permissões Incluídas:
                </h5>
                <ul className="space-y-1">
                  {selectedRoleDetails.permissions.map((permission, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* Informações sobre o Convite */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-900">Como funciona o convite:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Um e-mail será enviado com um link seguro de convite
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    O convite expira em 7 dias para segurança
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" />
                    Você pode reenviar ou revogar convites a qualquer momento
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.email || !formData.role}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Convite
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}