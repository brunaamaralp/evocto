import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Página 404 - ATUALIZADA com navegação limpa
 */
export default function NotFoundPage() {
  const suggestedPages = [
    {
      title: 'Dashboard',
      description: 'Visão geral da sua agência',
      href: createPageUrl('dashboard'),
      icon: Home
    },
    {
      title: 'Clientes',
      description: 'Gerenciar seus clientes',
      href: createPageUrl('clients'),
      icon: Home
    },
    {
      title: 'Templates de Serviço',
      description: 'Configurar modelos de serviço',
      href: createPageUrl('services'),
      icon: Home
    },
    {
      title: 'Tarefas',
      description: 'Ver todas as tarefas',
      href: createPageUrl('tasks-manager'),
      icon: Home
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Página não encontrada
            </h1>
            
            <p className="text-gray-600 mb-6">
              A página que você está procurando não existe ou foi removida.
            </p>
            
            <div className="space-y-3">
              <Link to={createPageUrl('dashboard')}>
                <Button className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Ir para Dashboard
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-500 mb-3">
                Páginas sugeridas:
              </p>
              
              <div className="space-y-2">
                {suggestedPages.map((page, index) => (
                  <Link
                    key={index}
                    to={page.href}
                    className="block p-2 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className="font-medium text-sm text-gray-900">
                      {page.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {page.description}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}