import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SupportLibrary from '@/components/library/SupportLibrary';
import { BookOpen, Users, Zap } from 'lucide-react';

export default function SupportLibraryPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header com estatísticas */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Biblioteca de Apoio</h1>
              <p className="text-gray-600">Central de conhecimento, treinamentos e recursos</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Materiais Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-sm text-gray-600">Guias, checklists e treinamentos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Acessos Este Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">--</div>
                <p className="text-sm text-gray-600">Visualizações dos materiais</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-600" />
                  Materiais Populares
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">--</div>
                <p className="text-sm text-gray-600">Mais acessados</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Biblioteca Principal */}
        <Card>
          <CardContent className="p-6">
            <SupportLibrary />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}