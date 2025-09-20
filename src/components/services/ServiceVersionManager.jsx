import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  GitBranch, AlertTriangle, Info, CheckCircle,
  Plus, ArrowUp, Clock, FileText, Users
} from 'lucide-react';
import { toast } from 'sonner';

const VERSION_TYPES = {
  PATCH: { label: 'Patch (v1.0.1)', description: 'Correções menores, sem impacto estrutural' },
  MINOR: { label: 'Minor (v1.1.0)', description: 'Novas funcionalidades, compatível com instâncias' },
  MAJOR: { label: 'Major (v2.0.0)', description: 'Mudanças estruturais, pode quebrar compatibilidade' }
};

export default function ServiceVersionManager({ 
  service, 
  onVersionUpdate, 
  isOpen, 
  onClose 
}) {
  const [selectedVersionType, setSelectedVersionType] = useState('MINOR');
  const [customVersion, setCustomVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const currentVersion = service?.version || 'v1.0';
  
  const generateNextVersion = (type) => {
    const version = currentVersion.replace('v', '');
    const parts = version.split('.').map(n => parseInt(n) || 0);
    
    switch (type) {
      case 'PATCH':
        return `v${parts[0]}.${parts[1]}.${(parts[2] || 0) + 1}`;
      case 'MINOR':
        return `v${parts[0]}.${(parts[1] || 0) + 1}.0`;
      case 'MAJOR':
        return `v${(parts[0] || 1) + 1}.0.0`;
      default:
        return currentVersion;
    }
  };

  const suggestedVersion = generateNextVersion(selectedVersionType);

  const validateVersion = (version) => {
    const versionRegex = /^v?\d+\.\d+(\.\d+)?$/;
    return versionRegex.test(version);
  };

  const compareVersions = (v1, v2) => {
    const normalize = (v) => v.replace('v', '').split('.').map(n => parseInt(n) || 0);
    const parts1 = normalize(v1);
    const parts2 = normalize(v2);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    return 0;
  };

  const handleVersionUpdate = () => {
    const newVersion = useCustom ? customVersion : suggestedVersion;
    
    // Validations
    if (!validateVersion(newVersion)) {
      toast.error('Formato de versão inválido. Use o formato v1.0.0');
      return;
    }

    if (compareVersions(newVersion, currentVersion) <= 0) {
      toast.error('Nova versão deve ser maior que a atual');
      return;
    }

    if (!releaseNotes.trim()) {
      toast.error('Notas de release são obrigatórias');
      return;
    }

    // Call parent handler
    onVersionUpdate({
      newVersion,
      previousVersion: currentVersion,
      versionType: selectedVersionType,
      releaseNotes,
      timestamp: new Date().toISOString()
    });

    onClose();
    toast.success(`Versão atualizada para ${newVersion}`);
  };

  const getVersionImpactWarning = () => {
    if (selectedVersionType === 'MAJOR') {
      return {
        type: 'error',
        message: 'Versão MAJOR pode quebrar compatibilidade com instâncias existentes. Continue apenas se as mudanças forem fundamentais.'
      };
    }
    
    if (selectedVersionType === 'MINOR') {
      return {
        type: 'warning',
        message: 'Versão MINOR adiciona funcionalidades. Instâncias existentes não receberão as mudanças automaticamente.'
      };
    }
    
    return {
      type: 'info',
      message: 'Versão PATCH para correções menores. Baixo impacto nas instâncias existentes.'
    };
  };

  const impact = getVersionImpactWarning();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Gerenciar Versão do Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Version Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{service?.name}</h3>
                  <p className="text-sm text-gray-600">Template atual</p>
                </div>
                <Badge variant="outline" className="font-mono">
                  {currentVersion}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Version Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Tipo de Atualização</Label>
            
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(VERSION_TYPES).map(([type, config]) => (
                <Card
                  key={type}
                  className={`cursor-pointer border-2 transition-colors ${
                    selectedVersionType === type && !useCustom
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedVersionType(type);
                    setUseCustom(false);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{config.label}</h4>
                        <p className="text-sm text-gray-600">{config.description}</p>
                      </div>
                      {selectedVersionType === type && !useCustom && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Custom Version Option */}
              <Card
                className={`cursor-pointer border-2 transition-colors ${
                  useCustom
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setUseCustom(true)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">Versão Customizada</h4>
                      <p className="text-sm text-gray-600">Definir versão manualmente</p>
                    </div>
                    {useCustom && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  
                  {useCustom && (
                    <Input
                      placeholder="ex: v1.2.5"
                      value={customVersion}
                      onChange={(e) => setCustomVersion(e.target.value)}
                      className="mt-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Version Preview */}
          <Card className="bg-gray-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm text-gray-600">Nova versão será:</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="font-mono text-base px-3 py-1">
                      {useCustom ? (customVersion || 'v?.?.?') : suggestedVersion}
                    </Badge>
                    <ArrowUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">de {currentVersion}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Impact Warning */}
          <Alert variant={impact.type === 'error' ? 'destructive' : 'default'}>
            {impact.type === 'error' && <AlertTriangle className="h-4 w-4" />}
            {impact.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
            {impact.type === 'info' && <Info className="h-4 w-4" />}
            <AlertDescription>{impact.message}</AlertDescription>
          </Alert>

          {/* Release Notes */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Notas da Release *
            </Label>
            <textarea
              placeholder="Descreva as mudanças realizadas nesta versão..."
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md h-24 resize-none"
              required
            />
            <p className="text-xs text-gray-500">
              Estas notas ajudarão a equipe a entender as mudanças realizadas.
            </p>
          </div>

          {/* Instance Impact Info */}
          {service?.template_metadata?.usage_count > 0 && (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                <strong>Impacto:</strong> Este template tem {service.template_metadata.usage_count} instância(s) ativa(s). 
                As mudanças não afetarão instâncias existentes automaticamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleVersionUpdate}
              disabled={!releaseNotes.trim()}
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Atualizar Versão
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}