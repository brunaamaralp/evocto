
import React, { useState } from 'react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import QuestionEditor from './QuestionEditor';

export default function CategoryEditor({ categories = [], onChange }) {
  const { t } = useTranslation();
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAddCategory = () => {
    const newCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      description: '',
      order: categories.length + 1,
      questions: []
    };
    setEditingCategory(newCategory);
  };

  const handleSaveCategory = (categoryData) => {
    if (categoryData.id && categories.find(c => c.id === categoryData.id)) {
      // Update existing
      const updatedCategories = categories.map(cat =>
        cat.id === categoryData.id ? categoryData : cat
      );
      onChange(updatedCategories);
    } else {
      // Add new
      onChange([...categories, categoryData]);
    }
    setEditingCategory(null);
  };

  const handleDeleteCategory = (categoryId) => {
    if (!confirm(t('briefing.categories.confirmDelete'))) return;

    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    onChange(updatedCategories);
  };

  const handleAddQuestion = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const newQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: '',
      type: 'long_text',
      required: false,
      placeholder: '',
      explanation: '',
      options: [],
      followUpTriggers: [],
      followUps: [],
      order: (category.questions?.length || 0) + 1,
      categoryId
    };

    setEditingQuestion(newQuestion);
  };

  const handleSaveQuestion = (questionData) => {
    const updatedCategories = categories.map(category => {
      if (category.id === questionData.categoryId) {
        const questions = category.questions || [];

        if (questions.find(q => q.id === questionData.id)) {
          // Update existing
          return {
            ...category,
            questions: questions.map(q =>
              q.id === questionData.id ? questionData : q
            )
          };
        } else {
          // Add new
          return {
            ...category,
            questions: [...questions, questionData]
          };
        }
      }
      return category;
    });

    onChange(updatedCategories);
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (categoryId, questionId) => {
    if (!confirm(t('briefing.questions.confirmDelete'))) return;

    const updatedCategories = categories.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          questions: (category.questions || []).filter(q => q.id !== questionId)
        };
      }
      return category;
    });

    onChange(updatedCategories);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'category') {
      const reorderedCategories = Array.from(categories);
      const [removed] = reorderedCategories.splice(source.index, 1);
      reorderedCategories.splice(destination.index, 0, removed);

      // Update order property
      const updatedCategories = reorderedCategories.map((cat, index) => ({
        ...cat,
        order: index + 1
      }));

      onChange(updatedCategories);
    } else if (type === 'question') {
      const categoryId = source.droppableId;
      const category = categories.find(c => c.id === categoryId);
      if (!category) return;

      const reorderedQuestions = Array.from(category.questions || []);
      const [removed] = reorderedQuestions.splice(source.index, 1);
      reorderedQuestions.splice(destination.index, 0, removed);

      const updatedCategories = categories.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            questions: reorderedQuestions.map((q, index) => ({
              ...q,
              order: index + 1
            }))
          };
        }
        return cat;
      });

      onChange(updatedCategories);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{t('briefing.categories.title')}</h3>
          <p className="text-sm text-slate-600">{t('briefing.categories.subtitle')}</p>
        </div>
        <Button onClick={handleAddCategory} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          {t('briefing.categories.actions.add')}
        </Button>
      </div>

      {/* Categories List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categories" type="category">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              <AnimatePresence>
                {categories.map((category, index) => (
                  <Draggable key={category.id} draggableId={category.id} index={index}>
                    {(provided, snapshot) => (
                      <motion.div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`${snapshot.isDragging ? 'z-50' : ''}`}
                      >
                        <Card className="border border-slate-200">
                          <Collapsible
                            open={expandedCategories.has(category.id)}
                            onOpenChange={() => toggleCategory(category.id)}
                          >
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-4 h-4 text-slate-400" />
                                  </div>

                                  {expandedCategories.has(category.id) ?
                                    <ChevronDown className="w-4 h-4 text-slate-500" /> :
                                    <ChevronRight className="w-4 h-4 text-slate-500" />
                                  }

                                  <div className="flex-1">
                                    <CardTitle className="text-base">{category.name || t('briefing.categories.untitled')}</CardTitle>
                                    {category.description && (
                                      <p className="text-sm text-slate-600 mt-1">{category.description}</p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      {(category.questions?.length || 0)} {t('briefing.categories.questions')}
                                    </Badge>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCategory(category);
                                      }}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCategory(category.id);
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <CardContent className="pt-0">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <h4 className="font-medium text-slate-700">{t('briefing.questions.title')}</h4>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddQuestion(category.id)}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      {t('briefing.questions.actions.add')}
                                    </Button>
                                  </div>

                                  <Droppable droppableId={category.id} type="question">
                                    {(provided) => (
                                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                        {(category.questions || []).map((question, qIndex) => (
                                          <Draggable key={question.id} draggableId={question.id} index={qIndex}>
                                            {(provided, snapshot) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`border border-slate-200 rounded-lg p-3 bg-white ${
                                                  snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-sm'
                                                } transition-shadow`}
                                              >
                                                <div className="flex items-start gap-3">
                                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing mt-1">
                                                    <GripVertical className="w-3 h-3 text-slate-400" />
                                                  </div>

                                                  <FileText className="w-4 h-4 text-slate-500 mt-0.5" />

                                                  <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-900 truncate">
                                                      {question.text || t('briefing.questions.untitled')}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                      <Badge variant="outline" size="sm">
                                                        {t(`briefing.questionTypes.${question.type}`)}
                                                      </Badge>
                                                      {question.required && (
                                                        <Badge variant="secondary" size="sm">
                                                          {t('briefing.form.required')}
                                                        </Badge>
                                                      )}
                                                      {question.followUpTriggers?.length > 0 && (
                                                        <Badge variant="outline" size="sm">
                                                          {question.followUpTriggers.length} {t('briefing.form.aiTriggers')}
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  </div>

                                                  <div className="flex gap-1">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => setEditingQuestion({...question, categoryId: category.id})}
                                                    >
                                                      <Edit className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => handleDeleteQuestion(category.id, question.id)}
                                                      className="text-red-600 hover:text-red-700"
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </Draggable>
                                        ))}
                                        {provided.placeholder}
                                      </div>
                                    )}
                                  </Droppable>
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      </motion.div>
                    )}
                  </Draggable>
                ))}
              </AnimatePresence>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Category Editor Modal */}
      {editingCategory && (
        <CategoryEditModal
          category={editingCategory}
          onSave={handleSaveCategory}
          onCancel={() => setEditingCategory(null)}
        />
      )}

      {/* Question Editor Modal */}
      {editingQuestion && (
        <QuestionEditor
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onCancel={() => setEditingQuestion(null)}
        />
      )}
    </div>
  );
}

// Category Edit Modal Component
function CategoryEditModal({ category, onSave, onCancel }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(category);

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error(t('briefing.categories.errors.nameRequired'));
      return;
    }
    onSave(formData);
  };

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
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {category.id ? t('briefing.categories.actions.edit') : t('briefing.categories.actions.add')}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('briefing.categories.fields.name')}
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder={t('briefing.categories.placeholders.name')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('briefing.categories.fields.description')}
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder={t('briefing.categories.placeholders.description')}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onCancel}>
              {t('cta.cancel')}
            </Button>
            <Button onClick={handleSave}>
              {t('cta.save')}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
