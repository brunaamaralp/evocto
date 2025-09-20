import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { LearningEntry } from '@/api/entities';
import { Client } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Lightbulb, Search, ArrowLeft, Eye, Star,
  FileText, TrendingUp, Target, Filter
} from 'lucide-react';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import LearningCard from '@/components/learnings/LearningCard';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function ClientLearningsPage() {
  const { user, agencyId } = useSession();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');
  
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [learnings, setLearnings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [reviewedFilter, setReviewedFilter] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      if (!clientId || !agencyId) return;

      try {
        setLoading(true);
        
        const [clientData, learningsData] = await Promise.all([
          Client.get(clientId),
          LearningEntry.filter({ agencyId, projectId: clientId }, '-created_date')
        ]);

        setClient(clientData);
        setLearnings(learningsData || []);
        
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar aprendizados do cliente');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clientId, agencyId]);

  const filteredLearnings = learnings.filter(learning => {
    const matchesSearch = !searchTerm ||
      learning.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      learning.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesConfidence = confidenceFilter === 'all' || 
      (confidenceFilter === 'high' && learning.confidence_score >= 80) ||
      (confidenceFilter === 'medium' && learning.confidence_score >= 50 && learning.confidence_score < 80) ||
      (confidenceFilter === 'low' && learning.confidence_score < 50);
    
    const matchesReviewed = reviewedFilter === 'all' || 
      (reviewedFilter === 'reviewed' && learning.reviewed) ||
      (reviewedFilter === 'pending' && !learning.reviewed);
    
    return matchesSearch && matchesConfidence && matchesReviewed;
  });

  if (loading) {
    return <LoadingState message="Carregando aprendizados..." />;
  }

  if (!client) {
    return (
      <EmptyState
        icon="usuarios"
        title="Cliente não encontrado"
        description="O cliente solicitado não existe."
        primaryAction={{
          label: 'Voltar aos Clientes',
          onClick: () => window.location.href = createPageUrl('clients')
        }}
      />
    );
  }

  const highConfidenceLearnings = learnings.filter(l => l.confidence_score >= 80);
  const pendingReviewLearnings = learnings.filter(l => !l.reviewed);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => window.location.href = createPageUrl('client-detail') + `?clientId=${clientId}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Aprendizados - {client.name}
            </h1>
            <p className="text-gray-600">
              Conhecimento específico acumulado com este cliente
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{learnings.length}</p>
                  <p className="text-sm text-gray-600">Total de Aprendizados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{highConfidenceLearnings.length}</p>
                  <p className="text-sm text-gray-600">Alta Confiança</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{pendingReviewLearnings.length}</p>
                  <p className="text-sm text-gray-600">Pendentes Revisão</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {learnings.filter(l => l.isShared).length}
                  </p>
                  <p className="text-sm text-gray-600">Compartilhados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar aprendizados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select 
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todas Confianças</option>
            <option value="high">Alta (≥80%)</option>
            <option value="medium">Média (50-79%)</option>
            <option value="low">Baixa (&lt;50%)</option>
          </select>

          <select 
            value={reviewedFilter}
            onChange={(e) => setReviewedFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos Status</option>
            <option value="reviewed">Revisados</option>
            <option value="pending">Pendentes</option>
          </select>
        </div>

        {/* Lista de Aprendizados */}
        {filteredLearnings.length === 0 ? (
          <EmptyState
            icon="ideias"
            title={learnings.length === 0 ? 'Nenhum aprendizado registrado' : 'Nenhum aprendizado encontrado'}
            description={
              learnings.length === 0 
                ? 'Este cliente ainda não possui aprendizados registrados.'
                : 'Tente ajustar os filtros de busca.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLearnings.map((learning) => (
              <LearningCard
                key={learning.id}
                learning={learning}
                showActions={true}
                onEdit={() => console.log('Edit learning', learning.id)}
                onView={() => console.log('View learning', learning.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}