import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { LearningEntry } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Lightbulb, Search, Eye, Star, TrendingUp } from 'lucide-react';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import LearningCard from '@/components/learnings/LearningCard';
import LearningManualForm from '@/components/learnings/LearningManualForm';
import { toast } from 'sonner';
import { getCardPastel } from '@/lib/modulePastels';

/**
 * Painel de aprendizados do cliente (aba).
 * O CTA de criar fica no shell; o modal é controlado via createOpen.
 */
export default function ClientLearningsPanel({
  clientId,
  client,
  createOpen = false,
  onCreateOpenChange,
  onCountChange,
}) {
  const { agencyId } = useSession();
  const [loading, setLoading] = useState(true);
  const [learnings, setLearnings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [reviewedFilter, setReviewedFilter] = useState('all');
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  const loadData = useCallback(async () => {
    if (!clientId || !agencyId) return;

    try {
      setLoading(true);

      const [learningsByProject, learningsByClient] = await Promise.all([
        LearningEntry.filter({ agencyId, projectId: clientId }, '-created_date').catch(() => []),
        LearningEntry.filter({ agencyId, clientId }, '-created_date').catch(() => []),
      ]);

      const map = new Map();
      for (const item of [...(learningsByProject || []), ...(learningsByClient || [])]) {
        if (item?.id) map.set(item.id, item);
      }

      const list = Array.from(map.values());
      setLearnings(list);
      onCountChangeRef.current?.(list.length);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar aprendizados do cliente');
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLearnings = learnings.filter((learning) => {
    const matchesSearch =
      !searchTerm ||
      learning.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      learning.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesConfidence =
      confidenceFilter === 'all' ||
      (confidenceFilter === 'high' && learning.confidence_score >= 80) ||
      (confidenceFilter === 'medium' &&
        learning.confidence_score >= 50 &&
        learning.confidence_score < 80) ||
      (confidenceFilter === 'low' && learning.confidence_score < 50);

    const matchesReviewed =
      reviewedFilter === 'all' ||
      (reviewedFilter === 'reviewed' && learning.reviewed) ||
      (reviewedFilter === 'pending' && !learning.reviewed);

    return matchesSearch && matchesConfidence && matchesReviewed;
  });

  if (loading) {
    return <LoadingState message="Carregando aprendizados..." />;
  }

  const highConfidenceLearnings = learnings.filter((l) => l.confidence_score >= 80);
  const pendingReviewLearnings = learnings.filter((l) => !l.reviewed);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: Lightbulb, label: 'Total de Aprendizados', value: learnings.length, idx: 3 },
          { icon: Star, label: 'Alta Confiança', value: highConfidenceLearnings.length, idx: 2 },
          { icon: Eye, label: 'Pendentes Revisão', value: pendingReviewLearnings.length, idx: 5 },
          {
            icon: TrendingUp,
            label: 'Compartilhados',
            value: learnings.filter((l) => l.isShared).length,
            idx: 0,
          },
        ].map(({ icon: Icon, label, value, idx }) => {
          const pastel = getCardPastel(idx);
          return (
            <Card key={label} className={`rounded-2xl border-transparent shadow-sm ${pastel.bg}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${pastel.tag}`}
                  >
                    <Icon className={`w-5 h-5 ${pastel.text}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#18162A]">{value}</p>
                    <p className="text-sm text-[#7A7595]">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative min-w-0">
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
          className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#6C47D8] focus:border-[#6C47D8]"
        >
          <option value="all">Todas Confianças</option>
          <option value="high">Alta (≥80%)</option>
          <option value="medium">Média (50-79%)</option>
          <option value="low">Baixa (&lt;50%)</option>
        </select>

        <select
          value={reviewedFilter}
          onChange={(e) => setReviewedFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#6C47D8] focus:border-[#6C47D8]"
        >
          <option value="all">Todos Status</option>
          <option value="reviewed">Revisados</option>
          <option value="pending">Pendentes</option>
        </select>
      </div>

      {filteredLearnings.length === 0 ? (
        <EmptyState
          icon="ideias"
          title={
            learnings.length === 0
              ? 'Nenhum aprendizado registrado'
              : 'Nenhum aprendizado encontrado'
          }
          description={
            learnings.length === 0
              ? 'Este cliente ainda não possui aprendizados registrados.'
              : 'Tente ajustar os filtros de busca.'
          }
          primaryAction={
            learnings.length === 0
              ? {
                  label: 'Novo Aprendizado',
                  onClick: () => onCreateOpenChange?.(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLearnings.map((learning) => (
            <LearningCard
              key={learning.id}
              learning={learning}
              clientName={client?.name}
              onUpdate={loadData}
            />
          ))}
        </div>
      )}

      <LearningManualForm
        isOpen={createOpen}
        onClose={() => onCreateOpenChange?.(false)}
        onSuccess={loadData}
        context={{ clientId }}
      />
    </div>
  );
}
