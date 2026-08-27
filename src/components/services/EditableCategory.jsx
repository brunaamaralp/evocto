import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVICE_CATEGORY_KEYS, getCategoryLabel } from '@/constants/serviceCategories';

const defaultCategories = SERVICE_CATEGORY_KEYS;

export default function EditableCategory({ value, onChange, placeholder = "Digite uma categoria..." }) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState(defaultCategories);
  const inputRef = useRef(null);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Filtrar sugestões baseado no que foi digitado
    if (newValue) {
      const filtered = defaultCategories.filter(cat => 
        cat.toLowerCase().includes(newValue.toLowerCase()) ||
        cat.replace('_', ' ').toLowerCase().includes(newValue.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions(defaultCategories);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addCategory(inputValue.trim());
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setInputValue('');
    }
  };

  const addCategory = (category) => {
    // Normalizar para snake_case
    const normalized = category.toLowerCase().replace(/\s+/g, '_');
    
    if (!value.includes(normalized)) {
      onChange([...value, normalized]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeCategory = (categoryToRemove) => {
    onChange(value.filter(cat => cat !== categoryToRemove));
  };

  const formatCategoryDisplay = (category) => {
    return getCategoryLabel(category);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-3">
      {/* Categorias Selecionadas */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="flex items-center gap-1 px-3 py-1"
            >
              {formatCategoryDisplay(category)}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-slate-300"
                onClick={() => removeCategory(category)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input para Nova Categoria */}
      <div className="relative" ref={inputRef}>
        <div className="relative">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="pr-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Plus className="h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Sugestões */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
            >
              {suggestions.map((category) => (
                <button
                  key={category}
                  onClick={() => addCategory(category)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                  type="button"
                >
                  {formatCategoryDisplay(category)}
                </button>
              ))}
              
              {/* Opção para criar nova categoria se não existe */}
              {inputValue && !suggestions.some(s => s.toLowerCase() === inputValue.toLowerCase()) && (
                <button
                  onClick={() => addCategory(inputValue)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors border-t border-slate-100 text-blue-600"
                  type="button"
                >
                  <Plus className="h-3 w-3 inline mr-2" />
                  Criar "{formatCategoryDisplay(inputValue)}"
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-xs text-slate-500">
        Digite uma categoria e pressione Enter para adicionar. Clique nas sugestões para seleção rápida.
      </p>
    </div>
  );
}