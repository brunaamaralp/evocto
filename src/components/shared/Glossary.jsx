
import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Link } from 'react-router-dom';
import { Search, Link as LinkIcon, BookOpen, ExternalLink } from 'lucide-react';
import { glossaryData } from './glossaryData';

export const GlossaryContext = React.createContext();

export function GlossaryProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState(null);

  const openGlossary = (slug) => {
    setTerm(slug);
    setIsOpen(true);
  };

  const value = { openGlossary };

  return (
    <GlossaryContext.Provider value={value}>
      {children}
      <GlossaryDrawer 
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        initialTerm={term}
      />
    </GlossaryContext.Provider>
  );
}

export const useGlossary = () => React.useContext(GlossaryContext);

function GlossaryCard({ item }) {
    const { openGlossary } = useGlossary();
    return (
        <div className="p-4 border rounded-lg bg-white">
            <h3 className="font-semibold text-base text-slate-900">{item.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{item.short}</p>
            <p className="text-xs text-slate-500 mt-2 italic">"{item.whenToUse}"</p>
            
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Relacionados:</span>
                    {item.related?.map(slug => {
                        const relatedItem = glossaryData.find(i => i.slug === slug);
                        return (
                            <Button 
                                key={slug} 
                                variant="link" 
                                className="h-auto p-0 text-xs"
                                onClick={() => openGlossary(slug)}
                            >
                                {relatedItem?.title || slug}
                            </Button>
                        )
                    })}
                </div>
                {item.deepLink && (
                    <Button size="sm" asChild className="h-8">
                        <Link to={item.deepLink}>
                            <ExternalLink className="w-3 h-3 mr-2" />
                            Ver em Ação
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    )
}

export function GlossaryDrawer({ isOpen, onOpenChange, initialTerm }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState(glossaryData);

  useEffect(() => {
    if (initialTerm) {
      setSearchTerm(initialTerm);
      // Scroll to the term if needed, can be enhanced later
    } else {
        setSearchTerm('');
    }
  }, [initialTerm, isOpen]);

  useEffect(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();
    const results = glossaryData.filter(item => 
      item.title.toLowerCase().includes(lowerCaseSearch) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch))
    );
    setFilteredData(results);
  }, [searchTerm]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '?') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="w-5 h-5 text-purple-600"/>
            Glossário do EvolvIA
          </SheetTitle>
          <SheetDescription>
            Entenda os termos e conceitos da plataforma.
          </SheetDescription>
        </SheetHeader>
        
        <div className="p-6 pb-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Buscar por termo (ex: RC, Ciclo)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-4 bg-slate-50/50">
            {filteredData.length > 0 ? (
                filteredData.map(item => <GlossaryCard key={item.slug} item={item} />)
            ) : (
                <div className="text-center py-10">
                    <p className="font-medium">Nenhum termo encontrado.</p>
                    <p className="text-sm text-slate-500">Tente uma busca diferente.</p>
                </div>
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
