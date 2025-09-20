import React, { useState } from 'react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  X, 
  HelpCircle, 
  AlertTriangle,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const QUESTION_TYPES = [
  'long_text',
  'short_text', 
  'multiple_choice',
  'multiple_choice_multiple',
  'number',
  'email',
  'url'
];

const TRIGGER_OPTIONS = [
  'resposta_vaga',
  'menos_10_palavras',
  'menos_50_chars',
  'falta_detalhes',
  'resposta_generica',
  'resposta_confusa'
];

export default function QuestionEditor({ question, onSave, onCancel }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(question);
  const [activeTab, setActiveTab] = useState('basic');
  const [newOption, setNewOption] = useState('');
  const [newTrigger, setNewTrigger] = useState('');

  const handleSave = () => {
    if (!formData.text.trim()) {
      toast.error(t('briefing.questions.errors.textRequired'));
      return;
    }

    // Validate multiple choice has options
    if ((formData.type === 'multiple_choice' || formData.type === 'multiple_choice_multiple') && 
        (!formData.options || formData.options.length === 0)) {
      toast.error(t('briefing.questions.errors.optionsRequired'));
      return;
    }

    onSave(formData);
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    
    const options = formData.options || [];
    setFormData({
      ...formData,
      options: [...options, newOption.trim()]
    });
    setNewOption('');
  };

  const removeOption = (index) => {
    const options = [...(formData.options || [])];
    options.splice(index, 1);
    setFormData({
      ...formData,
      options
    });
  };

  const addTrigger = () => {
    if (!newTrigger || !TRIGGER_OPTIONS.includes(newTrigger)) return;
    
    const triggers = formData.followUpTriggers || [];
    if (triggers.includes(newTrigger)) return;
    
    setFormData({
      ...formData,
      followUpTriggers: [...triggers, newTrigger]
    });
    setNewTrigger('');
  };

  const removeTrigger = (trigger) => {
    const triggers = (formData.followUpTriggers || []).filter(t => t !== trigger);
    setFormData({
      ...formData,
      followUpTriggers: triggers
    });
  };

  const requiresOptions = formData.type === 'multiple_choice' || formData.type === 'multiple_choice_multiple';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">
              {question.id ? t('briefing.questions.actions.edit') : t('briefing.questions.actions.add')}
            </h3>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">{t('briefing.questions.tabs.basic')}</TabsTrigger>
              <TabsTrigger value="options">{t('briefing.questions.tabs.options')}</TabsTrigger>
              <TabsTrigger value="ai">{t('briefing.questions.tabs.ai')}</TabsTrigger>
              <TabsTrigger value="advanced">{t('briefing.questions.tabs.advanced')}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('briefing.questions.fields.text')} *
                </label>
                <Textarea
                  value={formData.text}
                  onChange={(e) => setFormData({...formData, text: e.target.value})}
                  placeholder={t('briefing.questions.placeholders.text')}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('briefing.questions.fields.type')}
                  </label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({...formData, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {t(`briefing.questionTypes.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pt-6">
                  <label className="text-sm font-medium">
                    {t('briefing.questions.fields.required')}
                  </label>
                  <input
                    type="checkbox"
                    checked={formData.required || false}
                    onChange={(e) => setFormData({...formData, required: e.target.checked})}
                    className="toggle"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('briefing.questions.fields.explanation')}
                </label>
                <Input
                  value={formData.explanation || ''}
                  onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                  placeholder={t('briefing.questions.placeholders.explanation')}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {t('briefing.questions.hints.explanation')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('briefing.questions.fields.placeholder')}
                </label>
                <Input
                  value={formData.placeholder || ''}
                  onChange={(e) => setFormData({...formData, placeholder: e.target.value})}
                  placeholder={t('briefing.questions.placeholders.placeholder')}
                />
              </div>
            </TabsContent>

            <TabsContent value="options" className="space-y-4">
              {requiresOptions ? (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('briefing.questions.fields.options')} *
                  </label>
                  
                  <div className="space-y-2 mb-3">
                    {(formData.options || []).map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={option}
                          onChange={(e) => {
                            const options = [...(formData.options || [])];
                            options[index] = e.target.value;
                            setFormData({...formData, options});
                          }}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder={t('briefing.questions.placeholders.newOption')}
                      onKeyPress={(e) => e.key === 'Enter' && addOption()}
                    />
                    <Button onClick={addOption} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <HelpCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>{t('briefing.questions.noOptionsNeeded')}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    {t('briefing.questions.followUp.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600">
                    {t('briefing.questions.followUp.description')}
                  </p>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('briefing.questions.followUp.triggers')}
                    </label>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(formData.followUpTriggers || []).map(trigger => (
                        <Badge key={trigger} variant="secondary" className="gap-1">
                          {t(`briefing.triggers.${trigger}`)}
                          <button 
                            onClick={() => removeTrigger(trigger)}
                            className="hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Select value={newTrigger} onValueChange={setNewTrigger}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={t('briefing.questions.followUp.selectTrigger')} />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIGGER_OPTIONS
                            .filter(option => !(formData.followUpTriggers || []).includes(option))
                            .map(option => (
                              <SelectItem key={option} value={option}>
                                {t(`briefing.triggers.${option}`)}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                      <Button onClick={addTrigger} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="w-4 h-4" />
                    {t('briefing.questions.advanced.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('briefing.questions.fields.order')}
                    </label>
                    <Input
                      type="number"
                      value={formData.order || 1}
                      onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 1})}
                      min="1"
                    />
                  </div>

                  {/* Future: Conditional logic, validation rules, etc. */}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              {t('cta.cancel')}
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {t('cta.save')}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}