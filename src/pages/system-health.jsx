import React from 'react';
import { useSession } from '@/components/auth/SessionManager';
import SystemHealthChecker from '@/components/debug/SystemHealthChecker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Shield, AlertTriangle } from 'lucide-react';

/**
 * Página para verificar saúde do sistema
 * Substitui npm run check:build && npm run check:imports
 */
export default function SystemHealthPage() {
  const { user, isAdmin, isOwner } = useSession();

  // Verificar permissões
  if (!isAdmin() && !isOwner()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Apenas administradores podem acessar as verificações do sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            Verificação do Sistema
          </h1>
          <p className="text-gray-600 mt-1">
            Verifique a integridade e saúde geral da aplicação
          </p>
        </div>

        {/* Alerta Info */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Verificação Automática do Sistema
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Esta página substitui os comandos <code className="bg-blue-100 px-1 rounded">npm run check:build</code> e <code className="bg-blue-100 px-1 rounded">npm run check:imports</code> 
                  no ambiente base44. As verificações são executadas automaticamente no navegador.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verificação Principal */}
        <SystemHealthChecker 
          showDetails={true} 
          autoRun={true} 
        />

        {/* Informações Adicionais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Componentes Verificados</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Componentes UI essenciais</li>
                <li>• Entidades (Client, Service, Task)</li>
                <li>• Modais unificados</li>
                <li>• Formulários centralizados</li>
                <li>• Sistema de validação</li>
                <li>• Imports e exports</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Próximos Passos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-green-600">✅ Se tudo estiver OK:</p>
                  <p className="text-gray-600">Sistema funcionando perfeitamente</p>
                </div>
                <div>
                  <p className="font-medium text-yellow-600">⚠️ Se houver issues:</p>
                  <p className="text-gray-600">Seguir recomendações listadas</p>
                </div>
                <div>
                  <p className="font-medium text-red-600">❌ Se houver erros:</p>
                  <p className="text-gray-600">Contatar suporte técnico</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}