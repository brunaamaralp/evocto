/**
 * ⚙️ Interface de Configuração de IA
 * 
 * Componente para configurar e testar APIs de IA
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Settings, 
  TestTube,
  Key,
  Zap,
  Brain,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { testAIProviders, getBestAIProvider } from '@/config/aiConfig';

export default function AIConfigurationPanel() {
  const [config, setConfig] = useState({
    openai: {
      apiKey: '',
      model: 'gpt-4-turbo-preview',
      enabled: false
    },
    anthropic: {
      apiKey: '',
      model: 'claude-3-sonnet-20240229',
      enabled: false
    },
    ollama: {
      baseUrl: 'http://localhost:11434',
      model: 'llama2',
      enabled: false
    }
  });

  const [testResults, setTestResults] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carregar configuração salva
  useEffect(() => {
    const savedConfig = localStorage.getItem('ai_config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  // Salvar configuração
  const saveConfig = async () => {
    setSaving(true);
    try {
      localStorage.setItem('ai_config', JSON.stringify(config));
      toast.success('Configuração de IA salva com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  // Testar APIs
  const testAPIs = async () => {
    setTesting(true);
    setTestResults(null);
    
    try {
      const results = await testAIProviders();
      setTestResults(results);
      
      const availableCount = Object.values(results).filter(r => r.available).length;
      if (availableCount > 0) {
        toast.success(`${availableCount} API(s) de IA funcionando!`);
      } else {
        toast.warning('Nenhuma API de IA funcionando');
      }
    } catch (error) {
      toast.error('Erro ao testar APIs');
    } finally {
      setTesting(false);
    }
  };

  // Testar geração de tarefas
  const testTaskGeneration = async () => {
    try {
      const llm = await getBestAIProvider();
      
      const mockBriefing = {
        id: 'test_briefing',
        servico_tipo: 'diagnostico_financeiro',
        itens: {
          receita_mensal: 'R$ 100.000',
          margem_atual: '15%',
          principais_desafios: 'Controle de custos e fluxo de caixa'
        }
      };

      const prompt = `Gere 3 tarefas para o briefing: ${JSON.stringify(mockBriefing.itens)}`;
      const response = await llm.invokeLLM(prompt, { max_tokens: 500 });
      
      toast.success('Teste de geração de tarefas concluído!');
      console.log('Resposta da IA:', response);
    } catch (error) {
      toast.error('Erro no teste de geração de tarefas');
    }
  };

  // Testar análise de documento
  const testDocumentAnalysis = async () => {
    try {
      const llm = await getBestAIProvider();
      
      const mockDocument = `
        DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO
        Receita Bruta: R$ 1.200.000,00
        Receita Líquida: R$ 1.020.000,00
        Lucro Bruto: R$ 300.000,00
        Margem Bruta: 29,4%
      `;

      const prompt = `Analise este documento financeiro e extraia os KPIs principais: ${mockDocument}`;
      const response = await llm.invokeLLM(prompt, { max_tokens: 500 });
      
      toast.success('Teste de análise de documento concluído!');
      console.log('Análise da IA:', response);
    } catch (error) {
      toast.error('Erro no teste de análise de documento');
    }
  };

  const updateConfig = (provider, field, value) => {
    setConfig(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
  };

  const getStatusBadge = (provider) => {
    if (!testResults) return <Badge variant="secondary">Não testado</Badge>;
    
    const result = testResults[provider];
    if (result.available) {
      return <Badge variant="default" className="bg-green-500">Funcionando</Badge>;
    } else if (result.error) {
      return <Badge variant="destructive">Erro</Badge>;
    } else {
      return <Badge variant="secondary">Indisponível</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-600" />
            Configuração de IA
          </h2>
          <p className="text-gray-600 mt-1">
            Configure e teste as APIs de Inteligência Artificial
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={testAPIs}
            disabled={testing}
          >
            <TestTube className="w-4 h-4 mr-2" />
            {testing ? 'Testando...' : 'Testar APIs'}
          </Button>
          <Button 
            onClick={saveConfig}
            disabled={saving}
          >
            <Settings className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Status Geral */}
      {testResults && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {Object.values(testResults).filter(r => r.available).length} de 3 APIs funcionando
          </AlertDescription>
        </Alert>
      )}

      {/* Configurações */}
      <Tabs defaultValue="openai" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="openai">OpenAI</TabsTrigger>
          <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
          <TabsTrigger value="ollama">Ollama</TabsTrigger>
        </TabsList>

        {/* OpenAI */}
        <TabsContent value="openai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-green-600" />
                  OpenAI GPT-4
                </div>
                {getStatusBadge('openai')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key">API Key</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                    value={config.openai.apiKey}
                    onChange={(e) => updateConfig('openai', 'apiKey', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="openai-model">Modelo</Label>
                <Select 
                  value={config.openai.model} 
                  onValueChange={(value) => updateConfig('openai', 'model', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {testResults?.openai?.error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Erro: {testResults.openai.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anthropic */}
        <TabsContent value="anthropic">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-600" />
                  Anthropic Claude
                </div>
                {getStatusBadge('anthropic')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="anthropic-key">API Key</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="anthropic-key"
                    type="password"
                    placeholder="sk-ant-..."
                    value={config.anthropic.apiKey}
                    onChange={(e) => updateConfig('anthropic', 'apiKey', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="anthropic-model">Modelo</Label>
                <Select 
                  value={config.anthropic.model} 
                  onValueChange={(value) => updateConfig('anthropic', 'model', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                    <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                    <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {testResults?.anthropic?.error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Erro: {testResults.anthropic.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ollama */}
        <TabsContent value="ollama">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Ollama (Local)
                </div>
                {getStatusBadge('ollama')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ollama-url">URL Base</Label>
                <Input
                  id="ollama-url"
                  placeholder="http://localhost:11434"
                  value={config.ollama.baseUrl}
                  onChange={(e) => updateConfig('ollama', 'baseUrl', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ollama-model">Modelo</Label>
                <Select 
                  value={config.ollama.model} 
                  onValueChange={(value) => updateConfig('ollama', 'model', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llama2">Llama 2</SelectItem>
                    <SelectItem value="codellama">Code Llama</SelectItem>
                    <SelectItem value="mistral">Mistral</SelectItem>
                    <SelectItem value="neural-chat">Neural Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {testResults?.ollama?.error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Erro: {testResults.ollama.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Testes Funcionais */}
      <Card>
        <CardHeader>
          <CardTitle>Testes Funcionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              onClick={testTaskGeneration}
              className="h-20 flex flex-col items-center justify-center"
            >
              <Bot className="w-6 h-6 mb-2" />
              <span>Testar Geração de Tarefas</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={testDocumentAnalysis}
              className="h-20 flex flex-col items-center justify-center"
            >
              <FileText className="w-6 h-6 mb-2" />
              <span>Testar Análise de Documentos</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Como Configurar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-green-600">OpenAI</h4>
              <p className="text-sm text-gray-600">
                1. Acesse <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600">platform.openai.com</a><br/>
                2. Crie uma nova API key<br/>
                3. Cole a chave no campo acima
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-orange-600">Anthropic</h4>
              <p className="text-sm text-gray-600">
                1. Acesse <a href="https://console.anthropic.com/" target="_blank" className="text-blue-600">console.anthropic.com</a><br/>
                2. Crie uma nova API key<br/>
                3. Cole a chave no campo acima
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-blue-600">Ollama (Local)</h4>
              <p className="text-sm text-gray-600">
                1. Instale o Ollama: <code className="bg-gray-100 px-1 rounded">curl -fsSL https://ollama.ai/install.sh | sh</code><br/>
                2. Execute: <code className="bg-gray-100 px-1 rounded">ollama run llama2</code><br/>
                3. Use a URL padrão ou configure conforme necessário
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
