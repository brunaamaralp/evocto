import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { MappingProfile } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Wand2, 
  Save, 
  RotateCcw, 
  CheckCircle,
  AlertCircle,
  Info,
  ArrowRight,
  Target
} from 'lucide-react';
import { toast } from 'sonner';

export default function IntelligentMapper({ 
  fileHeaders = [], 
  targetEntity = 'Client', 
  fileType = 'csv',
  onMappingComplete,
  onCancel 
}) {
  const { user } = useSession();
  const [mappings, setMappings] = useState([]);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [showSaveProfile, setShowSaveProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Campos disponíveis por entidade
  const entityFields = {
    'Client': [
      { field: 'name', label: 'Nome/Razão Social', type: 'string', required: true },
      { field: 'legal_name', label: 'Nome Fantasia', type: 'string', required: false },
      { field: 'cnpj', label: 'CNPJ', type: 'cnpj', required: false },
      { field: 'email', label: 'Email', type: 'email', required: false },
      { field: 'phone', label: 'Telefone', type: 'string', required: false },
      { field: 'sector', label: 'Setor', type: 'string', required: false },
      { field: 'company_size', label: 'Porte da Empresa', type: 'string', required: false },
      { field: 'revenue_range', label: 'Faixa de Faturamento', type: 'string', required: false }
    ],
    'FinancialKPI': [
      { field: 'name', label: 'Nome do KPI', type: 'string', required: true },
      { field: 'current_value', label: 'Valor Atual', type: 'currency', required: true },
      { field: 'target_value', label: 'Valor Meta', type: 'currency', required: false },
      { field: 'category', label: 'Categoria', type: 'string', required: true },
      { field: 'unit', label: 'Unidade', type: 'string', required: false },
      { field: 'frequency', label: 'Frequência', type: 'string', required: false }
    ],
    'Service': [
      { field: 'name', label: 'Nome do Serviço', type: 'string', required: true },
      { field: 'description', label: 'Descrição', type: 'string', required: false },
      { field: 'category', label: 'Categoria', type: 'string', required: true },
      { field: 'contract_value', label: 'Valor do Contrato', type: 'currency', required: false },
      { field: 'start_date', label: 'Data de Início', type: 'date', required: false },
      { field: 'end_date', label: 'Data de Término', type: 'date', required: false }
    ]
  };

  // Padrões comuns para detecção automática
  const commonPatterns = {
    'Client': {
      'name': ['nome', 'razao social', 'razão social', 'empresa', 'client name', 'company'],
      'cnpj': ['cnpj', 'cnpj/cpf', 'documento', 'tax id'],
      'email': ['email', 'e-mail', 'mail'],
      'phone': ['telefone', 'fone', 'phone', 'tel'],
      'sector': ['setor', 'segmento', 'área', 'sector', 'industry']
    },
    'FinancialKPI': {
      'name': ['indicador', 'kpi', 'métrica', 'nome', 'indicator'],
      'current_value': ['valor', 'atual', 'value', 'amount', 'total'],
      'target_value': ['meta', 'objetivo', 'target', 'goal'],
      'category': ['categoria', 'tipo', 'category', 'type']
    },
    'Service': {
      'name': ['serviço', 'service', 'produto', 'product'],
      'contract_value': ['valor', 'preço', 'price', 'amount', 'total'],
      'start_date': ['início', 'start', 'data início', 'begin'],
      'end_date': ['fim', 'end', 'data fim', 'término']
    }
  };

  const loadProfiles = useCallback(async () => {
    if (!user?.data?.agencyId) return;

    try {
      const profiles = await MappingProfile.filter({
        agencyId: user.data.agencyId,
        file_type: fileType,
        target_entity: targetEntity,
        is_active: true
      });
      
      setAvailableProfiles(profiles || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  }, [user?.data?.agencyId, fileType, targetEntity]);

  const initializeMappings = useCallback(() => {
    const initialMappings = fileHeaders.map(header => ({
      source_column: header,
      target_field: '',
      data_type: 'string',
      transformation: 'none',
      confidence: 0,
      auto_detected: false
    }));
    
    setMappings(initialMappings);
    setLoading(false);
  }, [fileHeaders]);

  useEffect(() => {
    loadProfiles();
    initializeMappings();
  }, [loadProfiles, initializeMappings]);

  const detectAutomaticMappings = async () => {
    setAutoDetecting(true);
    
    try {
      const patterns = commonPatterns[targetEntity] || {};
      const updatedMappings = mappings.map(mapping => {
        const headerLower = mapping.source_column.toLowerCase();
        let bestMatch = { field: '', confidence: 0 };
        
        // Procurar padrões que correspondem ao cabeçalho
        for (const [fieldName, fieldPatterns] of Object.entries(patterns)) {
          for (const pattern of fieldPatterns) {
            if (headerLower.includes(pattern.toLowerCase())) {
              const confidence = calculatePatternConfidence(headerLower, pattern);
              if (confidence > bestMatch.confidence) {
                bestMatch = { field: fieldName, confidence };
              }
            }
          }
        }
        
        // Se encontrou uma correspondência com confiança > 60%
        if (bestMatch.confidence > 60) {
          const fieldInfo = entityFields[targetEntity]?.find(f => f.field === bestMatch.field);
          return {
            ...mapping,
            target_field: bestMatch.field,
            data_type: fieldInfo?.type || 'string',
            confidence: Math.round(bestMatch.confidence),
            auto_detected: true
          };
        }
        
        return mapping;
      });
      
      setMappings(updatedMappings);
      toast.success('Detecção automática concluída!');
      
    } catch (error) {
      console.error('Error in auto detection:', error);
      toast.error('Erro na detecção automática');
    } finally {
      setAutoDetecting(false);
    }
  };

  const calculatePatternConfidence = (header, pattern) => {
    const headerClean = header.replace(/[^a-záàâãéêíóôõúç]/gi, ' ').toLowerCase();
    const patternClean = pattern.toLowerCase();
    
    // Correspondência exata
    if (headerClean === patternClean) return 100;
    
    // Contém o padrão completo
    if (headerClean.includes(patternClean)) return 85;
    
    // Correspondência de palavras
    const headerWords = headerClean.split(' ').filter(w => w.length > 2);
    const patternWords = patternClean.split(' ').filter(w => w.length > 2);
    
    let matches = 0;
    for (const word of patternWords) {
      if (headerWords.some(hw => hw.includes(word) || word.includes(hw))) {
        matches++;
      }
    }
    
    return Math.round((matches / patternWords.length) * 70);
  };

  const updateMapping = (index, field, value) => {
    const updatedMappings = mappings.map((mapping, i) => {
      if (i === index) {
        const updated = { ...mapping, [field]: value };
        
        // Se mudou o campo alvo, atualizar tipo de dados automaticamente
        if (field === 'target_field') {
          const fieldInfo = entityFields[targetEntity]?.find(f => f.field === value);
          if (fieldInfo) {
            updated.data_type = fieldInfo.type;
          }
          updated.auto_detected = false;
        }
        
        return updated;
      }
      return mapping;
    });
    
    setMappings(updatedMappings);
  };

  const applyProfile = async (profileId) => {
    try {
      const profile = availableProfiles.find(p => p.id === profileId);
      if (!profile) return;
      
      const profileMappings = profile.column_mappings || [];
      
      const updatedMappings = mappings.map(mapping => {
        const profileMapping = profileMappings.find(pm => 
          pm.source_column.toLowerCase() === mapping.source_column.toLowerCase()
        );
        
        if (profileMapping) {
          return {
            ...mapping,
            target_field: profileMapping.target_field,
            data_type: profileMapping.data_type,
            transformation: profileMapping.transformation || 'none',
            confidence: profileMapping.confidence || 90
          };
        }
        
        return mapping;
      });
      
      setMappings(updatedMappings);
      
      // Atualizar estatísticas do perfil
      await MappingProfile.update(profileId, {
        'usage_stats.usage_count': (profile.usage_stats?.usage_count || 0) + 1,
        'usage_stats.last_used': new Date().toISOString()
      });
      
      toast.success(`Perfil "${profile.profile_name}" aplicado!`);
      
    } catch (error) {
      console.error('Error applying profile:', error);
      toast.error('Erro ao aplicar perfil');
    }
  };

  const saveProfile = async () => {
    if (!profileName.trim()) {
      toast.error('Nome do perfil é obrigatório');
      return;
    }
    
    try {
      const profileData = {
        agencyId: user.data.agencyId,
        profile_name: profileName,
        file_type: fileType,
        target_entity: targetEntity,
        column_mappings: mappings.filter(m => m.target_field).map(m => ({
          source_column: m.source_column,
          target_field: m.target_field,
          data_type: m.data_type,
          transformation: m.transformation,
          confidence: m.confidence
        })),
        header_patterns: generateHeaderPatterns(),
        created_by: user.id,
        tags: [fileType, targetEntity.toLowerCase()]
      };
      
      await MappingProfile.create(profileData);
      
      setShowSaveProfile(false);
      setProfileName('');
      await loadProfiles();
      
      toast.success('Perfil de mapeamento salvo!');
      
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
    }
  };

  const generateHeaderPatterns = () => {
    return mappings
      .filter(m => m.target_field && m.confidence > 70)
      .map(m => ({
        patterns: [m.source_column.toLowerCase()],
        target_field: m.target_field,
        confidence: m.confidence
      }));
  };

  const validateMappings = () => {
    const requiredFields = entityFields[targetEntity]?.filter(f => f.required) || [];
    const mappedRequiredFields = requiredFields.filter(rf => 
      mappings.some(m => m.target_field === rf.field)
    );
    
    return {
      isValid: mappedRequiredFields.length === requiredFields.length,
      missingFields: requiredFields.filter(rf => 
        !mappings.some(m => m.target_field === rf.field)
      )
    };
  };

  const handleComplete = () => {
    const validation = validateMappings();
    
    if (!validation.isValid) {
      toast.error(`Campos obrigatórios não mapeados: ${validation.missingFields.map(f => f.label).join(', ')}`);
      return;
    }
    
    const validMappings = mappings.filter(m => m.target_field);
    onMappingComplete(validMappings);
  };

  const getConfidenceBadge = (confidence) => {
    if (confidence >= 80) return <Badge className="bg-green-100 text-green-800">Alta</Badge>;
    if (confidence >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Média</Badge>;
    if (confidence > 0) return <Badge className="bg-red-100 text-red-800">Baixa</Badge>;
    return <Badge variant="outline">Manual</Badge>;
  };

  const getDataTypeIcon = (type) => {
    const icons = {
      'string': '📝',
      'number': '🔢', 
      'currency': '💰',
      'date': '📅',
      'email': '📧',
      'cnpj': '🏢',
      'boolean': '✅'
    };
    return icons[type] || '📝';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Carregando mapeamento inteligente...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Mapeamento Inteligente - {targetEntity}
        </CardTitle>
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant="outline">{fileType.toUpperCase()}</Badge>
          <Badge variant="outline">{fileHeaders.length} colunas</Badge>
          <Badge variant="outline">
            {mappings.filter(m => m.target_field).length} mapeadas
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Ações de Controle */}
        <div className="flex flex-wrap gap-3 items-center">
          <Button
            onClick={detectAutomaticMappings}
            disabled={autoDetecting}
            variant="outline"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            {autoDetecting ? 'Detectando...' : 'Auto-Detectar'}
          </Button>

          {availableProfiles.length > 0 && (
            <Select value={selectedProfile} onValueChange={applyProfile}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Aplicar perfil salvo" />
              </SelectTrigger>
              <SelectContent>
                {availableProfiles.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.profile_name}
                    {profile.usage_stats?.usage_count > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({profile.usage_stats.usage_count}x)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            onClick={() => setShowSaveProfile(true)}
            variant="outline"
            disabled={mappings.filter(m => m.target_field).length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Perfil
          </Button>

          <Button
            onClick={initializeMappings}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </div>

        {/* Tabela de Mapeamento */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coluna do Arquivo</TableHead>
                <TableHead>Campo de Destino</TableHead>
                <TableHead>Tipo de Dados</TableHead>
                <TableHead>Transformação</TableHead>
                <TableHead>Confiança</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                        {mapping.source_column}
                      </code>
                      {mapping.auto_detected && (
                        <Badge variant="secondary" className="text-xs">
                          <Wand2 className="w-3 h-3 mr-1" />
                          Auto
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Select
                      value={mapping.target_field}
                      onValueChange={(value) => updateMapping(index, 'target_field', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecionar campo..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>
                          <span className="text-gray-500">Não mapear</span>
                        </SelectItem>
                        {entityFields[targetEntity]?.map(field => (
                          <SelectItem key={field.field} value={field.field}>
                            <div className="flex items-center gap-2">
                              <span>{field.label}</span>
                              {field.required && <span className="text-red-500">*</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{getDataTypeIcon(mapping.data_type)}</span>
                      <Select
                        value={mapping.data_type}
                        onValueChange={(value) => updateMapping(index, 'data_type', value)}
                        disabled={!mapping.target_field}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">Texto</SelectItem>
                          <SelectItem value="number">Número</SelectItem>
                          <SelectItem value="currency">Moeda</SelectItem>
                          <SelectItem value="date">Data</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="boolean">Sim/Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Select
                      value={mapping.transformation}
                      onValueChange={(value) => updateMapping(index, 'transformation', value)}
                      disabled={!mapping.target_field}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        <SelectItem value="normalize_cnpj">Normalizar CNPJ</SelectItem>
                        <SelectItem value="parse_currency">Parse Moeda</SelectItem>
                        <SelectItem value="format_date">Formatar Data</SelectItem>
                        <SelectItem value="lowercase">Minúsculo</SelectItem>
                        <SelectItem value="uppercase">Maiúsculo</SelectItem>
                        <SelectItem value="trim">Remover Espaços</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  
                  <TableCell>
                    {getConfidenceBadge(mapping.confidence)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Validação */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Status do Mapeamento
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>{mappings.filter(m => m.target_field).length} colunas mapeadas</span>
            </div>
            
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span>{mappings.filter(m => !m.target_field).length} não mapeadas</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span>
                {entityFields[targetEntity]?.filter(f => f.required).length || 0} campos obrigatórios
              </span>
            </div>
          </div>

          {(() => {
            const validation = validateMappings();
            if (!validation.isValid) {
              return (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Campos obrigatórios não mapeados:</span>
                  </div>
                  <div className="mt-1 text-sm text-red-700">
                    {validation.missingFields.map(f => f.label).join(', ')}
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Ações Finais */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          
          <Button onClick={handleComplete}>
            <ArrowRight className="w-4 h-4 mr-2" />
            Confirmar Mapeamento
          </Button>
        </div>
      </CardContent>

      {/* Modal para Salvar Perfil */}
      <Dialog open={showSaveProfile} onOpenChange={setShowSaveProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Perfil de Mapeamento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="profile-name">Nome do Perfil</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Ex: DRE Padrão, Clientes Excel..."
              />
            </div>

            <div className="text-sm text-gray-600">
              <p>Este perfil salvará o mapeamento atual para:</p>
              <ul className="mt-2 space-y-1">
                <li>• <strong>Tipo de arquivo:</strong> {fileType.toUpperCase()}</li>
                <li>• <strong>Entidade:</strong> {targetEntity}</li>
                <li>• <strong>Colunas mapeadas:</strong> {mappings.filter(m => m.target_field).length}</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSaveProfile(false)}>
                Cancelar
              </Button>
              <Button onClick={saveProfile}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Perfil
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}