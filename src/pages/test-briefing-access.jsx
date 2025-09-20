import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink } from 'lucide-react';

export default function TestBriefingAccess() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [clientId, setClientId] = useState('');

  const generateTestToken = async () => {
    setLoading(true);
    try {
      const { testBriefingPublicAccess } = await import('@/api/functions');
      
      const response = await testBriefingPublicAccess({
        clientId: clientId || undefined
      });

      setResult(response);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copiado!');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Teste de Acesso ao Briefing Público</CardTitle>
          <p className="text-gray-600">
            Gere um link de teste para acessar o formulário de briefing sem login
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Client ID (opcional - deixe vazio para usar primeiro cliente)
            </label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="68c18331e1f40bf00051f69d"
            />
          </div>

          <Button 
            onClick={generateTestToken} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Gerando...' : '🔗 Gerar Link de Teste'}
          </Button>

          {result && (
            <div className="mt-6">
              {result.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-800">Erro:</h3>
                  <p className="text-red-700">{result.error}</p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-3">
                    ✅ Token gerado com sucesso!
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Link Público:</label>
                      <div className="flex gap-2 mt-1">
                        <Input 
                          value={result.publicUrl} 
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(result.publicUrl)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => window.open(result.publicUrl, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                          Abrir
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      <p>• Token válido por 24 horas</p>
                      <p>• Não requer login</p>
                      <p>• Cliente: {result.token?.clientId}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>📋 Status dos Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span>Portal do Cliente</span>
              <code>/client-portal</code>
              <span className="text-blue-600">✅ Requer Login</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span>Briefing Público</span>
              <code>/public-briefing?token=XXX</code>
              <span className="text-green-600">✅ Sem Login</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span>Ativação Cliente</span>
              <code>/client-activation?token=XXX</code>
              <span className="text-orange-600">⚡ Magic Link</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}