import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ServiceCategoryManager from '@/components/settings/ServiceCategoryManager';

export default function AgencyCategoriesPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link 
          to={createPageUrl('settings')} 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para Configurações
        </Link>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categorias de Serviço</h1>
          <p className="text-gray-600 mt-2">
            Gerencie as categorias personalizadas para seus templates e serviços. 
            Essas categorias serão usadas para organizar e filtrar seus serviços.
          </p>
        </div>
      </div>

      <ServiceCategoryManager />
    </div>
  );
}