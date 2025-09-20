import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { PublicBriefingToken } from '@/api/entities';
import { PublicBriefingResponse } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { List, Send, CheckCircle, Clock, Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LoadingState from '@/components/shared/LoadingStates';
import EmptyState from '@/components/shared/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const ResponseViewer = ({ response }) => {
  if (!response?.responses) {
    return <div className="p-4 text-center">Nenhuma resposta para exibir.</div>;
  }

  const responsesByCategory = Object.entries(response.responses).reduce((acc, [key, value]) => {
    const category = key.split('_q')[0].replace(/_/g, ' ');
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ question: `Pergunta ${key}`, answer: value });
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
      {Object.entries(responsesByCategory).map(([category, answers]) => (
        <div key={category}>
          <h4 className="text-md font-semibold capitalize mb-3 text-blue-600 border-b pb-2">{category}</h4>
          <ul className="space-y-3">
            {answers.map((item, index) => (
              <li key={index} className="text-sm">
                <p className="font-medium text-gray-700">{item.question}</p>
                <p className="text-gray-600 pl-2 border-l-2 border-gray-200 mt-1">{item.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};


export default function ClientDiagnosticsTab({ clientId }) {
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      const [tokens, responses] = await Promise.all([
        PublicBriefingToken.filter({ clientId }),
        PublicBriefingResponse.filter({ clientId }),
      ]);

      const responsesByTokenId = responses.reduce((acc, res) => {
        acc[res.tokenId] = res;
        return acc;
      }, {});

      const combined = tokens.map(token => ({
        ...token,
        response: responsesByTokenId[token.id] || null,
      })).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      
      setDiagnostics(combined);

    } catch (error) {
      toast.error('Falha ao carregar históricos de diagnóstico.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadDiagnostics();
  }, [loadDiagnostics]);

  if (loading) {
    return <LoadingState message="Carregando diagnósticos..." />;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Histórico de Diagnósticos</h3>
          <Button variant="outline" disabled>
            <Send className="mr-2 h-4 w-4" />
            Enviar Novo Diagnóstico
          </Button>
        </div>

        {diagnostics.length > 0 ? (
          <ul className="space-y-4">
            {diagnostics.map(diag => (
              <li key={diag.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <p className="font-semibold text-gray-800">
                      Enviado em {format(new Date(diag.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expira em {format(new Date(diag.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-2 sm:mt-0">
                    {diag.response ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="mr-1.5 h-3 w-3" />
                        Respondido
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Clock className="mr-1.5 h-3 w-3" />
                        Pendente
                      </Badge>
                    )}
                    {diag.response && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Respostas
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                            <DialogTitle>Respostas do Diagnóstico</DialogTitle>
                          </DialogHeader>
                          <ResponseViewer response={diag.response} />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={FileText}
            title="Nenhum diagnóstico enviado"
            description="Envie o primeiro diagnóstico para este cliente para começar o processo."
          />
        )}
      </CardContent>
    </Card>
  );
}