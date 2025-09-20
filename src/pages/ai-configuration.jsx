/**
 * 🤖 Página de Configuração de IA
 * 
 * Interface para configurar e gerenciar APIs de IA
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Brain,
  Zap,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import AIConfigurationPanel from '@/components/ai/AIConfigurationPanel';

export default function AIConfigurationPage() {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Bot className="w-8 h-8 text-blue-600" />
                Configuração de IA
              </h1>
              <p className="text-gray-600 mt-1">
                Configure e teste as APIs de Inteligência Artificial do sistema
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Sistema Ativo
            </Badge>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Brain className="w-4 h-4 text-green-600" />
                OpenAI GPT-4
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant="secondary">Não configurado</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-orange-600" />
                Anthropic Claude
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant="secondary">Não configurado</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                Ollama Local
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant="secondary">Não configurado</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas */}
        <div className="space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-yellow-800">IA Não Configurada</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  O sistema está funcionando com dados mock. Configure uma API de IA para funcionalidades completas.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-800">Funcionalidades Disponíveis</h4>
                <div className="text-sm text-blue-700 mt-1 space-y-1">
                  <p>• Geração automática de tarefas baseadas no briefing</p>
                  <p>• Análise de documentos financeiros com extração de KPIs</p>
                  <p>• Insights automáticos e recomendações personalizadas</p>
                  <p>• Validação inteligente de briefing</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Painel de Configuração */}
        <AIConfigurationPanel />

        {/* Instruções de Uso */}
        <Card>
          <CardHeader>
            <CardTitle>Como Usar a IA no Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Geração de Tarefas</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>1. Preencha o briefing do cliente</p>
                  <p>2. A IA analisa as respostas</p>
                  <p>3. Gera tarefas personalizadas</p>
                  <p>4. Aplica ajustes automáticos</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Análise de Documentos</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>1. Faça upload de relatórios financeiros</p>
                  <p>2. A IA extrai KPIs automaticamente</p>
                  <p>3. Identifica tendências e anomalias</p>
                  <p>4. Sugere melhorias</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Insights Automáticos</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>1. Analisa dados do cliente</p>
                  <p>2. Gera insights personalizados</p>
                  <p>3. Detecta oportunidades</p>
                  <p>4. Alerta sobre riscos</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Validação de Briefing</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>1. Valida qualidade das respostas</p>
                  <p>2. Sugere perguntas adicionais</p>
                  <p>3. Identifica informações faltantes</p>
                  <p>4. Melhora completude</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle>Solução de Problemas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-red-600">Erro de API Key</h4>
                <p className="text-sm text-gray-600">
                  Verifique se a API key está correta e tem permissões adequadas. Teste a conexão usando o botão "Testar APIs".
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-red-600">Ollama Não Conecta</h4>
                <p className="text-sm text-gray-600">
                  Certifique-se de que o Ollama está rodando localmente. Execute <code className="bg-gray-100 px-1 rounded">ollama serve</code> no terminal.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-red-600">Respostas Inconsistentes</h4>
                <p className="text-sm text-gray-600">
                  Ajuste a temperatura do modelo ou tente um modelo diferente. Modelos mais recentes tendem a ser mais consistentes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
