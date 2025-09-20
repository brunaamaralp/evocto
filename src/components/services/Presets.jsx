import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  X, 
  Package, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  Zap
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function Presets({ service, onUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newBundle, setNewBundle] = useState({
    name: '',
    description: '',
    deliverables: [],
    estimated_hours: 0,
    price_modifier: 1
  });
  const [newChannelPreset, setNewChannelPreset] = useState({
    name: '',
    channels: [],
    default_formats: [],
    recommended_frequency: 'monthly'
  });

  const addBundle = () => {
    if (newBundle.name && newBundle.description) {
      const updatedBundles = [...(service.presets?.deliverable_bundles || []), newBundle];
      onUpdate({
        presets: {
          ...service.presets,
          deliverable_bundles: updatedBundles
        }
      });
      setNewBundle({
        name: '',
        description: '',
        deliverables: [],
        estimated_hours: 0,
        price_modifier: 1
      });
    }
  };

  const removeBundle = (index) => {
    const updatedBundles = (service.presets?.deliverable_bundles || []).filter((_, i) => i !== index);
    onUpdate({
      presets: {
        ...service.presets,
        deliverable_bundles: updatedBundles
      }
    });
  };

  const addChannelPreset = () => {
    if (newChannelPreset.name && newChannelPreset.channels.length > 0) {
      const updatedPresets = [...(service.presets?.channel_presets || []), newChannelPreset];
      onUpdate({
        presets: {
          ...service.presets,
          channel_presets: updatedPresets
        }
      });
      setNewChannelPreset({
        name: '',
        channels: [],
        default_formats: [],
        recommended_frequency: 'monthly'
      });
    }
  };

  const removeChannelPreset = (index) => {
    const updatedPresets = (service.presets?.channel_presets || []).filter((_, i) => i !== index);
    onUpdate({
      presets: {
        ...service.presets,
        channel_presets: updatedPresets
      }
    });
  };

  const addDeliverableToBundle = (deliverable) => {
    if (deliverable && !newBundle.deliverables.includes(deliverable)) {
      setNewBundle({
        ...newBundle,
        deliverables: [...newBundle.deliverables, deliverable]
      });
    }
  };

  const removeDeliverableFromBundle = (deliverable) => {
    setNewBundle({
      ...newBundle,
      deliverables: newBundle.deliverables.filter(d => d !== deliverable)
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-0 shadow-lg">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Presets & Bundles
                <Badge variant="outline" className="text-xs">
                  {(service.presets?.deliverable_bundles?.length || 0) + (service.presets?.channel_presets?.length || 0)} configurados
                </Badge>
              </div>
              {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Bundles de Entregáveis */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-medium">Bundles de Entregáveis</Label>
                <Badge variant="secondary" className="text-xs">
                  {service.presets?.deliverable_bundles?.length || 0} bundles
                </Badge>
              </div>
              <p className="text-sm text-slate-600">
                Configure pacotes pré-definidos de entregáveis para acelerar a criação de contratos.
              </p>

              {/* Existing Bundles */}
              {(service.presets?.deliverable_bundles || []).length > 0 && (
                <div className="space-y-3">
                  {service.presets.deliverable_bundles.map((bundle, index) => (
                    <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-blue-900">{bundle.name}</h4>
                          <p className="text-sm text-blue-700">{bundle.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBundle(index)}
                          className="text-blue-600 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-blue-600">
                        <span>{bundle.deliverables?.length || 0} entregáveis</span>
                        <span>{bundle.estimated_hours}h estimadas</span>
                        <span>{((bundle.price_modifier - 1) * 100).toFixed(0)}% do preço base</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Bundle */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <Label className="text-slate-900">Criar Novo Bundle</Label>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input
                    value={newBundle.name}
                    onChange={(e) => setNewBundle({...newBundle, name: e.target.value})}
                    placeholder="Nome do bundle"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={newBundle.estimated_hours}
                      onChange={(e) => setNewBundle({...newBundle, estimated_hours: parseInt(e.target.value)})}
                      placeholder="Horas"
                      className="w-20"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      value={newBundle.price_modifier}
                      onChange={(e) => setNewBundle({...newBundle, price_modifier: parseFloat(e.target.value)})}
                      placeholder="1.0"
                      className="w-20"
                    />
                  </div>
                </div>
                <Textarea
                  value={newBundle.description}
                  onChange={(e) => setNewBundle({...newBundle, description: e.target.value})}
                  placeholder="Descrição do bundle..."
                  rows={2}
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={addBundle}
                    disabled={!newBundle.name || !newBundle.description}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Bundle
                  </Button>
                </div>
              </div>
            </div>

            {/* Channel Presets */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-medium">Presets de Canais</Label>
                <Badge variant="secondary" className="text-xs">
                  {service.presets?.channel_presets?.length || 0} presets
                </Badge>
              </div>
              <p className="text-sm text-slate-600">
                Configure combinações padrão de canais e formatos para diferentes estratégias.
              </p>

              {/* Existing Channel Presets */}
              {(service.presets?.channel_presets || []).length > 0 && (
                <div className="space-y-3">
                  {service.presets.channel_presets.map((preset, index) => (
                    <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-purple-900">{preset.name}</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {preset.channels?.map(channel => (
                              <Badge key={channel} variant="outline" className="text-xs">
                                {channel}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChannelPreset(index)}
                          className="text-purple-600 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-purple-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {preset.recommended_frequency}
                        </span>
                        <span>{preset.default_formats?.length || 0} formatos</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Channel Preset */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <Label className="text-slate-900">Criar Novo Preset de Canais</Label>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input
                    value={newChannelPreset.name}
                    onChange={(e) => setNewChannelPreset({...newChannelPreset, name: e.target.value})}
                    placeholder="Nome do preset"
                  />
                  <select
                    value={newChannelPreset.recommended_frequency}
                    onChange={(e) => setNewChannelPreset({...newChannelPreset, recommended_frequency: e.target.value})}
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                  >
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quinzenal</option>
                    <option value="monthly">Mensal</option>
                    <option value="quarterly">Trimestral</option>
                  </select>
                </div>
                <p className="text-xs text-slate-500">
                  Canais selecionados: {newChannelPreset.channels.join(', ') || 'Nenhum'}
                </p>
                <div className="flex justify-end">
                  <Button 
                    onClick={addChannelPreset}
                    disabled={!newChannelPreset.name || newChannelPreset.channels.length === 0}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Preset
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}