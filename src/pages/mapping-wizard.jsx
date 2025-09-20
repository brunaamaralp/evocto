
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowRight, 
  ArrowDown,
  CheckCircle2, 
  AlertCircle,
  FileText,
  Users,
  BarChart3,
  Wand2,
  Save
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { MappingProfile } from '@/api/entities';
import { IngestEnvelope } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { LearningsSkeleton } from '@/components/shared/LoadingSkeletons';

export default function MappingWizard() {
  const { user } = useSession();
  const [envelopes, setEnvelopes] = useState([]);
  const [selectedEnvelope, setSelectedEnvelope] = useState(null);
  const [mappingProfiles, setMappingProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [columnMappings, setColumnMappings] = useState([]);
  const [targetEntity, setTargetEntity] = useState('Client');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Helper function remains outside useCallback as it's pure and local
  const generateSampleMappings = (fileFormat, entityType) => {
    const mappings = {
      'Client': [
        { source_column: 'nome', target_field: 'name', data_type: 'string', confidence: 95 },
        { source_column: 'razao_social', target_field: 'legal_name', data_type: 'string', confidence: 90 },
        { source_column: 'cnpj', target_field: 'cnpj', data_type: 'cnpj', confidence: 98 },
        { source_column: 'email', target_field: 'email', data_type: 'email', confidence: 95 },
        { source_column: 'telefone', target_field: 'phone', data_type: 'string', confidence: 85 },
        { source_column: 'setor', target_field: 'sector', data_type: 'string', confidence: 80 }
      ],
      'FinancialKPI': [
        { source_column: 'indicador', target_field: 'name', data_type: 'string', confidence: 90 },
        { source_column: 'valor', target_field: 'current_value', data_type: 'number', confidence: 95 },
        { source_column: 'categoria', target_field: 'category', data_type: 'string', confidence: 85 },
        { source_column: 'unidade', target_field: 'unit', data_type: 'string', confidence: 80 }
      ]
    };
    
    return mappings[entityType] || [];
  };

  const generateSmartMapping = useCallback(async (envelope) => {
    if (!envelope) return;
    
    try {
      // Simular detecção de colunas baseada no formato do arquivo
      const sampleMappings = generateSampleMappings(envelope.payload.detected_format, targetEntity);
      setColumnMappings(sampleMappings);
      
      // Tentar encontrar perfil compatível
      const compatibleProfile = mappingProfiles.find(p => 
        p.file_type === envelope.payload.detected_format && 
        p.target_entity === targetEntity
      );
      
      if (compatibleProfile) {
        setSelectedProfile(compatibleProfile);
        setColumnMappings(compatibleProfile.column_mappings || sampleMappings);
      }
      
    } catch (error) {
      console.error('Erro ao gerar mapeamento:', error);
    }
  }, [targetEntity, mappingProfiles, setColumnMappings, setSelectedProfile]); // state setters are stable, but included for exhaustiveness. `generateSampleMappings` is stable.

  const loadEnvelopesAndProfiles = useCallback(async () => {
    if (!user?.data?.agencyId) return;
    
    try {
      setLoading(true);
      
      const [envelopesData, profilesData] = await Promise.all([
        IngestEnvelope.filter({
          agencyId: user.data.agencyId,
          processing_status: 'completed'
        }, '-created_date', 10),
        
        MappingProfile.filter({
          agencyId: user.data.agencyId,
          is_active: true
        })
      ]);
      
      setEnvelopes(envelopesData || []);
      setMappingProfiles(profilesData || []);
      
      // Auto-selecionar o primeiro envelope se disponível
      if (envelopesData?.length > 0) {
        setSelectedEnvelope(envelopesData[0]);
        // generateSmartMapping is called here, so it's a dependency
        generateSmartMapping(envelopesData[0]);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.data?.agencyId, generateSmartMapping, setEnvelopes, setMappingProfiles, setSelectedEnvelope, setLoading]); // Added state setters for exhaustiveness, though stable

  useEffect(() => {
    loadEnvelopesAndProfiles();
  }, [loadEnvelopesAndProfiles]);

  const handleMappingChange = (index, field, value) => {
    setColumnMappings(prev => prev.map((mapping, i) => 
      i === index ? { ...mapping, [field]: value } : mapping
    ));
  };

  const saveMappingProfile = async () => {
    if (!selectedEnvelope || !columnMappings.length) return;
    
    try {
      await MappingProfile.create({
        agencyId: user.data.agencyId,
        profile_name: `Auto-${targetEntity}-${Date.now()}`,
        file_type: selectedEnvelope.payload.detected_format,
        target_entity: targetEntity,
        column_mappings: columnMappings,
        created_by: user.id
      });
      
      alert('Perfil de mapeamento salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
    }
  };

  const processMappingAndCreateRecords = async () => {
    if (!selectedEnvelope || !columnMappings.length) return;
    
    setProcessing(true);
    
    try {
      // Aqui você integraria com o processamento real
      // Por enquanto, simulamos o sucesso
      
      alert(`Mapeamento processado! ${columnMappings.length} campos mapeados para ${targetEntity}.`);
      
      // Redirecionar para data-review
      window.location.href = createPageUrl('data-review');
      
    } catch (error) {
      console.error('Erro ao processar mapeamento:', error);
      alert('Erro ao processar mapeamento. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const getConfidenceBadge = (confidence) => {
    if (confidence >= 90) return <Badge className="bg-green-100 text-green-800">Alta</Badge>;
    if (confidence >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Média</Badge>;
    return <Badge className="bg-red-100 text-red-800">Baixa</Badge>;
  };

  if (loading) {
    return (
      <div className="container-page py-6 space-y-6">
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
          <h1 className="text-2xl font-bold text-gray-900">Assistente de Mapeamento</h1>
          <p className="text-gray-600 mt-1">
            Configure como mapear colunas do arquivo para campos das entidades
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={createPageUrl('data-review')}>
              Ver Revisões Pendentes
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={createPageUrl('upload-center')}>
              Novo Upload
            </Link>
          </Button>
        </div>
      </div>

      {envelopes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum arquivo para mapear
            </h3>
            <p className="text-gray-600 mb-4">
              Faça upload de arquivos primeiro para configurar mapeamentos
            </p>
            <Button asChild>
              <Link to={createPageUrl('upload-center')}>
                Fazer Upload
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Seleção de Arquivo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                1. Selecionar Arquivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {envelopes.map((envelope) => (
                  <div
                    key={envelope.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedEnvelope?.id === envelope.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedEnvelope(envelope);
                      generateSmartMapping(envelope);
                    }}
                  >
                    <p className="font-medium text-sm">{envelope.file_identity.original_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{envelope.payload.detected_format}</Badge>
                      <span className="text-xs text-gray-500">
                        {(envelope.file_identity.file_size_bytes / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Configuração de Mapeamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                2. Configurar Mapeamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Entidade Alvo */}
              <div>
                <label className="text-sm font-medium mb-2 block">Entidade Alvo:</label>
                <Select value={targetEntity} onValueChange={(value) => {
                  setTargetEntity(value);
                  if (selectedEnvelope) {
                    generateSmartMapping(selectedEnvelope);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Client">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Clientes
                      </div>
                    </SelectItem>
                    <SelectItem value="FinancialKPI">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        KPIs Financeiros
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Perfil Existente */}
              <div>
                <label className="text-sm font-medium mb-2 block">Usar Perfil Existente (Opcional):</label>
                <Select value={selectedProfile?.id || ''} onValueChange={(profileId) => {
                  const profile = mappingProfiles.find(p => p.id === profileId);
                  setSelectedProfile(profile);
                  if (profile) {
                    setColumnMappings(profile.column_mappings || []);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mappingProfiles
                      .filter(p => p.target_entity === targetEntity)
                      .map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.profile_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={() => selectedEnvelope && generateSmartMapping(selectedEnvelope)}
                variant="outline"
                className="w-full"
                disabled={!selectedEnvelope}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Gerar Mapeamento Inteligente
              </Button>
            </CardContent>
          </Card>

          {/* Mapeamento de Colunas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                3. Mapear Colunas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {columnMappings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ArrowDown className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Selecione um arquivo para ver o mapeamento</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {columnMappings.map((mapping, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{mapping.source_column}</span>
                        {getConfidenceBadge(mapping.confidence || 0)}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <Select 
                          value={mapping.target_field} 
                          onValueChange={(value) => handleMappingChange(index, 'target_field', value)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {targetEntity === 'Client' && [
                              <SelectItem key="name" value="name">Nome</SelectItem>,
                              <SelectItem key="legal_name" value="legal_name">Razão Social</SelectItem>,
                              <SelectItem key="cnpj" value="cnpj">CNPJ</SelectItem>,
                              <SelectItem key="email" value="email">Email</SelectItem>,
                              <SelectItem key="phone" value="phone">Telefone</SelectItem>,
                              <SelectItem key="sector" value="sector">Setor</SelectItem>
                            ]}
                            {targetEntity === 'FinancialKPI' && [
                              <SelectItem key="name" value="name">Nome</SelectItem>,
                              <SelectItem key="current_value" value="current_value">Valor</SelectItem>,
                              <SelectItem key="category" value="category">Categoria</SelectItem>,
                              <SelectItem key="unit" value="unit">Unidade</SelectItem>
                            ]}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="mt-2">
                        <Select 
                          value={mapping.data_type} 
                          onValueChange={(value) => handleMappingChange(index, 'data_type', value)}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">Texto</SelectItem>
                            <SelectItem value="number">Número</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="cnpj">CNPJ</SelectItem>
                            <SelectItem value="date">Data</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {columnMappings.length > 0 && (
                <div className="mt-6 space-y-3">
                  <Button 
                    onClick={saveMappingProfile}
                    variant="outline"
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar como Perfil
                  </Button>
                  
                  <Button 
                    onClick={processMappingAndCreateRecords}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={processing}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {processing ? 'Processando...' : 'Aplicar Mapeamento'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status */}
      {selectedEnvelope && columnMappings.length > 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Mapeamento configurado para <strong>{selectedEnvelope.file_identity.original_name}</strong>. 
            {columnMappings.length} colunas serão mapeadas para <strong>{targetEntity}</strong>.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
