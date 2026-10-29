import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Archive,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import { toast } from 'sonner';
import {
  executeClientOffboarding,
  OPEN_OPERATIONAL_TASK_STATUSES,
} from '@/lib/clientOffboarding';

export default function ClientActionButtons({ 
  client, 
  onEdit, 
  onUpdate, 
  size = "sm" 
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInactivateDialog, setShowInactivateDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [relatedData, setRelatedData] = useState(null);

  const checkRelatedData = async () => {
    try {
      const [services, tasks] = await Promise.all([
        Service.filter({ clientId: client.id }),
        Task.filter({ clientId: client.id })
      ]);

      return {
        services: services.length,
        activeTasks: tasks.filter((t) =>
          OPEN_OPERATIONAL_TASK_STATUSES.has(String(t.status || '').toLowerCase())
        ).length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        totalTasks: tasks.length
      };
    } catch (error) {
      console.error('Erro ao verificar dados relacionados:', error);
      return { services: 0, activeTasks: 0, completedTasks: 0, totalTasks: 0 };
    }
  };

  const handleInactivate = async () => {
    setLoading(true);
    try {
      const data = await checkRelatedData();
      setRelatedData(data);
      setShowInactivateDialog(true);
    } catch (_error) {
      toast.error('Erro ao verificar dados do cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const data = await checkRelatedData();
      setRelatedData(data);
      setShowDeleteDialog(true);
    } catch (_error) {
      toast.error('Erro ao verificar dados do cliente');
    } finally {
      setLoading(false);
    }
  };

  const confirmInactivate = async () => {
    setLoading(true);
    try {
      const confirmation = await executeClientOffboarding({
        client,
        agencyId: client.agencyId,
        motivo: 'desligamento',
      });
      console.info('[CLIENT_OFFBOARDING_EXECUTED]', confirmation);

      toast.success(
        `Cliente arquivado. ${confirmation.tarefasOffboardingCriadas.length} tarefas de offboarding criadas.`
      );
      onUpdate?.(confirmation);
      setShowInactivateDialog(false);
    } catch (error) {
      console.error('Erro ao desligar cliente:', error);
      toast.error('Erro ao executar offboarding do cliente');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await Client.delete(client.id);
      
      toast.success('Cliente excluído com sucesso');
      onUpdate?.();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Erro ao excluir cliente');
    } finally {
      setLoading(false);
    }
  };

  const isActive = client.status === 'ativo';
  const isInactive =
    client.status === 'inativo' ||
    client.status === 'arquivado' ||
    String(client.status || '').toLowerCase() === 'archived';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size={size}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Cliente
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {isActive && (
            <DropdownMenuItem onClick={handleInactivate} className="text-orange-600">
              <Archive className="mr-2 h-4 w-4" />
              Desligar / Arquivar
            </DropdownMenuItem>
          )}
          
          {isInactive && (
            <DropdownMenuItem 
              onClick={async () => {
                try {
                  await Client.update(client.id, {
                    status: 'ativo',
                    notificationsEnabled: true,
                    offboardingMotivo: null,
                  });
                  toast.success('Cliente reativado com sucesso');
                  onUpdate?.();
                } catch (_error) {
                  toast.error('Erro ao reativar cliente');
                }
              }}
              className="text-green-600"
            >
              <Archive className="mr-2 h-4 w-4" />
              Reativar Cliente
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={handleDelete} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir Cliente
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de Inativação */}
      <AlertDialog open={showInactivateDialog} onOpenChange={setShowInactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-orange-600" />
              Desligar / Arquivar Cliente
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p>
                  Confirma o offboarding de <strong>“{client.name}“</strong>? O cliente sai do radar ativo, backlog aberto é cancelado e o checklist de saída é gerado automaticamente.
                </p>
                
                {relatedData && (
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <h4 className="font-medium text-orange-800 mb-2">Impacto imediato:</h4>
                    <div className="space-y-1 text-sm text-orange-700">
                      {relatedData.services > 0 && (
                        <p>• {relatedData.services} serviço(s) serão pausados</p>
                      )}
                      {relatedData.activeTasks > 0 && (
                        <p>• {relatedData.activeTasks} entregável(is)/tarefa(s) abertos serão cancelados</p>
                      )}
                      {relatedData.completedTasks > 0 && (
                        <p>• {relatedData.completedTasks} tarefa(s) concluída(s) permanecem no histórico</p>
                      )}
                      <p>• 5 tarefas padrão de offboarding serão criadas (tráfego, mídia, acessos, financeiro)</p>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmInactivate}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={loading}
            >
              {loading ? 'Executando offboarding…' : 'Confirmar desligamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Exclusão - PERMITE EXCLUIR COM TAREFAS ATIVAS */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Excluir Cliente
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>
                  Tem certeza que deseja <strong className="text-red-600">excluir permanentemente</strong> o cliente <strong>“{client.name}“</strong>?
                </p>
                
                {relatedData && (relatedData.services > 0 || relatedData.totalTasks > 0) && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      ATENÇÃO: Este cliente possui dados relacionados
                    </h4>
                    <div className="space-y-2 text-sm text-red-700">
                      {relatedData.services > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            {relatedData.services}
                          </Badge>
                          <span>serviço(s) que serão excluído(s)</span>
                        </div>
                      )}
                      {relatedData.activeTasks > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            {relatedData.activeTasks}
                          </Badge>
                          <span>tarefa(s) ativa(s) que serão excluída(s)</span>
                        </div>
                      )}
                      {relatedData.completedTasks > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {relatedData.completedTasks}
                          </Badge>
                          <span>tarefa(s) concluída(s) que serão excluída(s)</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                      <p className="text-sm text-red-800 font-medium">
                        ⚠️ Esta ação é IRREVERSÍVEL e todos os dados relacionados serão perdidos permanentemente.
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        Considere inativar o cliente em vez de excluir para manter o histórico.
                      </p>
                    </div>
                  </div>
                )}

                {relatedData && relatedData.services === 0 && relatedData.totalTasks === 0 && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">
                      ✓ Este cliente não possui serviços ou tarefas relacionadas.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {relatedData && (relatedData.services > 0 || relatedData.activeTasks > 0) && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setTimeout(() => handleInactivate(), 100);
                }}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                Inativar em vez de Excluir
              </Button>
            )}
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Excluindo...' : 'Excluir Permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}