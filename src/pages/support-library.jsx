import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SupportLibrary from '@/components/library/SupportLibrary';
import { BookOpen, Users, Zap } from 'lucide-react';

export default function SupportLibraryPage() {
  return (
    <div className="min-h-screen bg-[#F8F7FB] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header com estatísticas */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-[#C02807]" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#18162A]">Biblioteca de Apoio</h1>
              <p className="text-[#7A7595]">Central de conhecimento, treinamentos e recursos</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card className="rounded-2xl border border-[#E8E5F5]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-[#18162A]">
                  <BookOpen className="w-5 h-5 text-[#C02807]" />
                  Materiais Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#18162A]">--</div>
                <p className="text-sm text-[#7A7595]">Guias, checklists e treinamentos</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-[#E8E5F5]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-[#18162A]">
                  <Users className="w-5 h-5 text-[#C02807]" />
                  Acessos Este Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#18162A]">--</div>
                <p className="text-sm text-[#7A7595]">Visualizações dos materiais</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-[#E8E5F5]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-[#18162A]">
                  <Zap className="w-5 h-5 text-[#C02807]" />
                  Materiais Populares
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#18162A]">--</div>
                <p className="text-sm text-[#7A7595]">Mais acessados</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Biblioteca Principal */}
        <Card className="rounded-2xl border border-[#E8E5F5]">
          <CardContent className="p-6">
            <SupportLibrary />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}