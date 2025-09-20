
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Save, 
  X,
  FileText,
  Users,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { DataReview } from '@/api/entities';
import { Client } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { LearningsSkeleton } from '@/components/shared/LoadingSkeletons';

export default function DataReviewPage() {
  const { user } = useSession();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editData, setEditData] = useState({});

  const loadPendingReviews = useCallback(async () => {
    if (!user?.data?.agencyId) return;
    
    try {
      setLoading(true);
      const pendingReviews = await DataReview.filter({
        agencyId: user.data.agencyId,
        status: 'pending_review'
      }, '-created_date', 20);
      
      setReviews(pendingReviews || []);
    } catch (error) {
      console.error('Erro ao carregar revisões:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.data?.agencyId]);

  useEffect(() => {
    loadPendingReviews();
  }, [loadPendingReviews]);

  const handleEditRecord = (review, entityType, entityIndex) => {
    const entity = review.extracted_data[entityType][entityIndex];
    setEditingRecord({ reviewId: review.id, entityType, entityIndex });
    setEditData({ ...entity.data });
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    
    try {
      const review = reviews.find(r => r.id === editingRecord.reviewId);
      const updatedData = { ...review.extracted_data };
      
      // Atualizar os dados editados
      updatedData[editingRecord.entityType][editingRecord.entityIndex].data = editData;
      
      await DataReview.update(review.id, {
        extracted_data: updatedData,
        status: 'under_review'
      });

      setEditingRecord(null);
      setEditData({});
      loadPendingReviews();
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
    }
  };

  const handleApproveEntity = async (reviewId, entityType, entityIndex) => {
    try {
      const review = reviews.find(r => r.id === reviewId);
      const entity = review.extracted_data[entityType][entityIndex];
      
      // Criar entidade na base de dados
      if (entityType === 'Client') {
        await Client.create({
          ...entity.data,
          agencyId: user.data.agencyId
        });
      }
      
      // Marcar como aprovado
      const updatedDecisions = review.review_decisions || [];
      updatedDecisions.push({
        entity_type: entityType,
        entity_index: entityIndex,
        action: 'approve',
        timestamp: new Date().toISOString()
      });
      
      await DataReview.update(reviewId, {
        review_decisions: updatedDecisions,
        status: 'partially_approved'
      });
      
      loadPendingReviews();
    } catch (error) {
      console.error('Erro ao aprovar entidade:', error);
    }
  };

  const handleRejectEntity = async (reviewId, entityType, entityIndex) => {
    try {
      const review = reviews.find(r => r.id === reviewId);
      const updatedDecisions = review.review_decisions || [];
      
      updatedDecisions.push({
        entity_type: entityType,
        entity_index: entityIndex,
        action: 'reject',
        timestamp: new Date().toISOString()
      });
      
      await DataReview.update(reviewId, {
        review_decisions: updatedDecisions
      });
      
      loadPendingReviews();
    } catch (error) {
      console.error('Erro ao rejeitar entidade:', error);
    }
  };

  const getConfidenceBadge = (confidence) => {
    if (confidence >= 80) return <Badge className="bg-green-100 text-green-800">Alta Confiança</Badge>;
    if (confidence >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Média Confiança</Badge>;
    return <Badge className="bg-red-100 text-red-800">Baixa Confiança</Badge>;
  };

  const getEntityIcon = (entityType) => {
    const icons = {
      'Client': <Users className="w-5 h-5" />,
      'FinancialKPI': <BarChart3 className="w-5 h-5" />,
      'Document': <FileText className="w-5 h-5" />
    };
    return icons[entityType] || <FileText className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-6"></div>
        </div>
        <LearningsSkeleton />
      </div>
    );
  }

  return (
    <div className="container-page py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revisão de Dados</h1>
          <p className="text-gray-600 mt-1">
            Revise e aprove dados extraídos antes de criar registros finais
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to={createPageUrl('upload-center')}>
            Fazer Novo Upload
          </Link>
        </Button>
      </div>

      {/* Status Summary */}
      {reviews.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {reviews.length} arquivo(s) aguardando revisão. 
            Revise os dados extraídos e aprove ou edite conforme necessário.
          </AlertDescription>
        </Alert>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma revisão pendente
            </h3>
            <p className="text-gray-600 mb-4">
              Todos os dados foram revisados ou não há uploads recentes
            </p>
            <Button asChild>
              <Link to={createPageUrl('upload-center')}>
                Fazer Upload de Arquivo
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {review.file_info?.original_name || 'Arquivo'}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {getConfidenceBadge(review.confidence_score)}
                      <span className="text-sm text-gray-500">
                        Extraído em {new Date(review.extraction_timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={createPageUrl('mapping-wizard')}>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Ir para Mapeamento
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {Object.entries(review.extracted_data || {}).map(([entityType, entities]) => (
                  <div key={entityType} className="space-y-3">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      {getEntityIcon(entityType)}
                      {entityType} ({entities.length} registros)
                    </h4>
                    
                    <div className="space-y-2">
                      {entities.map((entity, index) => (
                        <div 
                          key={index} 
                          className="bg-gray-50 rounded-lg p-4 border"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {editingRecord?.reviewId === review.id && 
                               editingRecord?.entityType === entityType && 
                               editingRecord?.entityIndex === index ? (
                                /* Edit Mode */
                                <div className="space-y-3">
                                  {Object.entries(editData).map(([field, value]) => (
                                    <div key={field} className="flex items-center gap-2">
                                      <Label className="w-24 text-sm">{field}:</Label>
                                      <Input
                                        value={value || ''}
                                        onChange={(e) => setEditData(prev => ({
                                          ...prev,
                                          [field]: e.target.value
                                        }))}
                                        className="flex-1"
                                      />
                                    </div>
                                  ))}
                                  <div className="flex gap-2 pt-2">
                                    <Button 
                                      size="sm" 
                                      onClick={handleSaveEdit}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <Save className="w-4 h-4 mr-2" />
                                      Salvar
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => setEditingRecord(null)}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                /* View Mode */
                                <div className="space-y-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    {Object.entries(entity.data || {}).map(([field, value]) => (
                                      <div key={field}>
                                        <span className="font-medium text-gray-700">{field}:</span>
                                        <span className="ml-2 text-gray-600">{value || '--'}</span>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {entity.validation_results?.validation_errors?.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-sm text-red-600 font-medium">Problemas detectados:</p>
                                      <ul className="text-sm text-red-600 list-disc list-inside">
                                        {entity.validation_results.validation_errors.map((error, idx) => (
                                          <li key={idx}>{error}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Actions */}
                            {!(editingRecord?.reviewId === review.id && 
                               editingRecord?.entityType === entityType && 
                               editingRecord?.entityIndex === index) && (
                              <div className="flex gap-2 ml-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditRecord(review, entityType, index)}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveEntity(review.id, entityType, index)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRejectEntity(review.id, entityType, index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-2 flex items-center gap-2">
                            {getConfidenceBadge(entity.confidence || 0)}
                            <span className="text-xs text-gray-500">
                              Chave: {entity.external_key}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
