import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, Search, Filter, Star, Clock, 
  TrendingUp, FileText, Lightbulb, Plus,
  Archive, Eye, Edit
} from 'lucide-react';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { LearningEntry } from '@/api/entities';
import { PlaybookItem } from '@/api/entities';

export default function LibraryPage() {
  const { user, agencyId } = useSession();
  const [loading, setLoading] = useState(true);
  const [learnings, setLearnings] = useState([]);
  const [playbooks, setPlaybooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('learnings');

  useEffect(() => {
    const loadLibraryData = async () => {
      if (!agencyId) return;

      try {
        setLoading(true);
        
        const [learningsData, playbooksData] = await Promise.all([
          LearningEntry.filter({ agencyId }, '-created_date', 50),
          PlaybookItem.filter({ agencyId, status: 'published' }, '-created_date', 50)
        ]);

        setLearnings(learningsData || []);
        setPlaybooks(playbooksData || []);
      } catch (error) {
        console.error('Erro ao carregar biblioteca:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLibraryData();
  }, [agencyId]);

  const filteredLearnings = learnings.filter(learning => 
    learning.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    learning.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPlaybooks = playbooks.filter(playbook => 
    playbook.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    playbook.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingState message="Carregando biblioteca..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Biblioteca</h1>
            <p className="text-gray-600 mt-1">Conhecimento e aprendizados da agência</p>
          </div>
          
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Aprendizado
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">{learnings.length}</div>
              <div className="text-sm text-gray-600">Aprendizados</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{playbooks.length}</div>
              <div className="text-sm text-gray-600">Playbooks</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">
                {learnings.filter(l => l.reviewed).length}
              </div>
              <div className="text-sm text-gray-600">Revisados</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar na biblioteca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="learnings" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Aprendizados ({filteredLearnings.length})
            </TabsTrigger>
            <TabsTrigger value="playbooks" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Playbooks ({filteredPlaybooks.length})
            </TabsTrigger>
          </TabsList>

          {/* Aba de Aprendizados */}
          <TabsContent value="learnings" className="space-y-6">
            {filteredLearnings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLearnings.map((learning) => (
                  <Card key={learning.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-5 h-5 text-yellow-500" />
                          <Badge variant={learning.reviewed ? 'default' : 'secondary'}>
                            {learning.reviewed ? 'Revisado' : 'Pendente'}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {learning.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                        {learning.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{learning.sourceType}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(learning.created_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      
                      {learning.tags && learning.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {learning.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Lightbulb}
                title={searchTerm ? 'Nenhum aprendizado encontrado' : 'Nenhum aprendizado ainda'}
                description={
                  searchTerm 
                    ? 'Tente ajustar o termo de busca.'
                    : 'Seus aprendizados aparecerão aqui conforme você trabalha com clientes.'
                }
                action={() => console.log('Criar aprendizado')}
                actionText="Criar Aprendizado"
                variant="info"
              />
            )}
          </TabsContent>

          {/* Aba de Playbooks */}
          <TabsContent value="playbooks" className="space-y-6">
            {filteredPlaybooks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlaybooks.map((playbook) => (
                  <Card key={playbook.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-blue-500" />
                          <Badge variant="default">
                            {playbook.serviceType?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {playbook.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                        {playbook.summary}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          {Math.round(playbook.confidence * 100)}% confiança
                        </span>
                        <span>v{playbook.version}</span>
                      </div>
                      
                      {playbook.applicability && (
                        <div className="text-xs text-gray-500">
                          <span>Aplicável: {playbook.applicability.market}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title={searchTerm ? 'Nenhum playbook encontrado' : 'Nenhum playbook criado'}
                description={
                  searchTerm 
                    ? 'Tente ajustar o termo de busca.'
                    : 'Playbooks são criados a partir dos seus melhores aprendizados.'
                }
                action={() => console.log('Criar playbook')}
                actionText="Criar Playbook"
                variant="info"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}