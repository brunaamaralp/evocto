import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Save } from 'lucide-react';

export default function LearningForm({ learning, onSave, onCancel }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    setFormData(learning || {
      title: '',
      description: '',
      niche: '',
      format: '',
      trigger: '',
      promise: '',
      rationale: '',
      tags: []
    });
  }, [learning]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTagsChange = (e) => {
    const tags = e.target.value.split(',').map(tag => tag.trim());
    setFormData(prev => ({ ...prev, tags }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="border-0 shadow-2xl">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-slate-900">
                {learning?.id ? "Editar Aprendizado" : "Adicionar Aprendizado"}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Aprendizado *</Label>
                <Input id="title" value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea id="description" value={formData.description || ''} onChange={e => handleChange('description', e.target.value)} required rows={3} />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="niche">Nicho de Mercado *</Label>
                  <Input id="niche" value={formData.niche || ''} onChange={e => handleChange('niche', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="format">Formato da Campanha *</Label>
                  <Input id="format" value={formData.format || ''} onChange={e => handleChange('format', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trigger">Gatilho Psicológico</Label>
                  <Input id="trigger" value={formData.trigger || ''} onChange={e => handleChange('trigger', e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promise">Promessa Central</Label>
                <Input id="promise" value={formData.promise || ''} onChange={e => handleChange('promise', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rationale">Racional (Por que funcionou?)</Label>
                <Textarea id="rationale" value={formData.rationale || ''} onChange={e => handleChange('rationale', e.target.value)} rows={3} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                <Input id="tags" value={formData.tags?.join(', ') || ''} onChange={handleTagsChange} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  {learning?.id ? "Atualizar" : "Salvar"} Aprendizado
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}