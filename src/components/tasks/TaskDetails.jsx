
import React, { useState, useEffect } from 'react';
import { Task } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  CheckSquare, MessageCircle, Paperclip, History, 
  Upload, Download, Play, Pause, Clock, User,
  FileText, Image, Video, Archive, Trash2, 
  Plus, Send, Edit, Eye, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FILE_TYPE_ICONS = {
  'application/pdf': FileText,
  'image/jpeg': Image,
  'image/png': Image,
  'image/gif': Image,
  'video/mp4': Video,
  'video/quicktime': Video,
  'application/zip': Archive,
  'application/x-zip-compressed': Archive,
  'text/plain': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
};

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const STATUS_COLORS = {
  backlog: 'bg-gray-100 text-gray-800',
  todo: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  blocked: 'bg-orange-100 text-orange-800'
};

export default function TaskDetails({ taskId, onClose, onTaskUpdate }) {
  const { user } = useSession();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // States for different tabs
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [attachmentDescription, setAttachmentDescription] = useState('');
  const [timeEntry, setTimeEntry] = useState({
    startTime: '',
    endTime: '',
    description: '',
    duration: 0
  });
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStartTime, setTrackingStartTime] = useState(null);

  const loadTask = React.useCallback(async () => {
    if (!taskId || !user?.data?.agencyId) return;

    try {
      setLoading(true);
      const taskData = await Task.get(taskId);
      
      if (!taskData || taskData.agencyId !== user.data.agencyId) {
        throw new Error('Tarefa não encontrada');
      }

      setTask(taskData);
    } catch (error) {
      console.error('Erro ao carregar tarefa:', error);
      toast.error('Erro ao carregar tarefa');
    } finally {
      setLoading(false);
    }
  }, [taskId, user?.data?.agencyId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const handleSaveTask = async (updates) => {
    try {
      setSaving(true);
      
      const updatedTask = await Task.update(taskId, {
        ...updates,
        statusHistory: [
          ...(task.statusHistory || []),
          {
            status: updates.status || task.status,
            changedBy: user.id,
            changedByName: user.full_name,
            changedAt: new Date().toISOString(),
            reason: `Atualização via interface de detalhes`,
            previousStatus: task.status
          }
        ]
      });

      setTask(updatedTask);
      if (onTaskUpdate) onTaskUpdate(updatedTask);
      toast.success('Tarefa atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      toast.error('Erro ao salvar tarefa');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const comment = {
        id: `comment_${Date.now()}`,
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name,
        content: newComment,
        type: 'comment',
        mentions: [],
        attachments: [],
        createdAt: new Date().toISOString(),
        isEdited: false
      };

      await handleSaveTask({
        comments: [...(task.comments || []), comment]
      });

      setNewComment('');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast.error('Erro ao adicionar comentário');
    }
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const attachments = [...(task.attachments || [])];

      for (const file of files) {
        try {
          const uploadResult = await UploadFile({ file });
          
          const attachment = {
            id: `attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            url: uploadResult.file_url,
            type: file.type.startsWith('image/') ? 'image' : 
                  file.type.startsWith('video/') ? 'video' : 
                  file.type === 'application/pdf' ? 'document' : 'other',
            mimeType: file.type,
            size: file.size,
            uploadedBy: user.id,
            uploadedByName: user.full_name,
            uploadedAt: new Date().toISOString(),
            description: attachmentDescription || `Upload de ${file.name}`,
            isEvidence: false
          };

          attachments.push(attachment);
        } catch (uploadError) {
          console.error('Erro no upload:', uploadError);
          toast.error(`Erro ao fazer upload de ${file.name}`);
        }
      }

      await handleSaveTask({ attachments });
      setSelectedFiles([]);
      setAttachmentDescription('');
      toast.success(`${files.length} arquivo(s) anexado(s) com sucesso`);
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleChecklistItem = async (itemIndex, completed) => {
    const updatedChecklist = task.checklist.map((item, index) =>
      index === itemIndex
        ? {
            ...item,
            completed,
            completedBy: completed ? user.id : null,
            completedByName: completed ? user.full_name : null,
            completedAt: completed ? new Date().toISOString() : null
          }
        : item
    );

    // Calcular novo progresso
    const completedItems = updatedChecklist.filter(item => item.completed).length;
    const progress = Math.round((completedItems / updatedChecklist.length) * 100);

    await handleSaveTask({ 
      checklist: updatedChecklist,
      progress
    });
  };

  const handleStartTimeTracking = () => {
    setIsTracking(true);
    setTrackingStartTime(new Date().toISOString());
    toast.success('Cronômetro iniciado');
  };

  const handleStopTimeTracking = async () => {
    if (!trackingStartTime) return;

    const endTime = new Date().toISOString();
    const duration = Math.round((new Date(endTime) - new Date(trackingStartTime)) / (1000 * 60)); // minutos

    const newTimeEntry = {
      id: `time_${Date.now()}`,
      userId: user.id,
      startTime: trackingStartTime,
      endTime,
      duration,
      description: timeEntry.description || 'Sessão de trabalho',
      createdAt: new Date().toISOString()
    };

    await handleSaveTask({
      timeEntries: [...(task.timeEntries || []), newTimeEntry],
      actualHours: ((task.actualHours || 0) * 60 + duration) / 60 // converter para horas
    });

    setIsTracking(false);
    setTrackingStartTime(null);
    setTimeEntry({ startTime: '', endTime: '', description: '', duration: 0 });
    toast.success(`${duration} minutos registrados`);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    const IconComponent = FILE_TYPE_ICONS[mimeType] || FileText;
    return <IconComponent className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4">Carregando tarefa...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <p>Tarefa não encontrada</p>
            <Button onClick={onClose} className="mt-4">Fechar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <CardHeader className="border-b flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={STATUS_COLORS[task.status]}>
                  {task.status.replace('_', ' ')}
                </Badge>
                <Badge className={PRIORITY_COLORS[task.priority]}>
                  {task.priority}
                </Badge>
                {task.dueDate && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
          
          {task.progress > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Progresso</span>
                <span>{task.progress}%</span>
              </div>
              <Progress value={task.progress} />
            </div>
          )}
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 overflow-hidden p-0">
          <Tabs defaultValue="checklist" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mx-6 mt-4">
              <TabsTrigger value="checklist" className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Checklist
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Comentários ({task.comments?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="attachments" className="flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Anexos ({task.attachments?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="checklist" className="mt-0 space-y-4">
                {task.description && (
                  <div className="mb-6">
                    <Label className="text-sm font-medium">Descrição</Label>
                    <p className="text-gray-600 mt-1">{task.description}</p>
                  </div>
                )}

                {(!task.checklist || task.checklist.length === 0) ? (
                  <div className="text-center py-8">
                    <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Nenhum item no checklist</h3>
                    <p className="text-gray-600">
                      Esta tarefa não possui itens de checklist definidos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {task.checklist.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={(checked) => handleToggleChecklistItem(index, checked)}
                          disabled={saving}
                        />
                        <div className="flex-1">
                          <p className={`text-sm ${item.completed ? 'line-through text-gray-500' : ''}`}>
                            {item.text}
                          </p>
                          {item.completed && item.completedBy && (
                            <p className="text-xs text-gray-500 mt-1">
                              Concluído por {item.completedByName} em{' '}
                              {format(new Date(item.completedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        {item.required && (
                          <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Time Tracking */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Registro de Tempo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {isTracking ? (
                          <>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleStopTimeTracking}
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              Parar ({Math.floor((Date.now() - new Date(trackingStartTime)) / 60000)}m)
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleStartTimeTracking}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Iniciar
                          </Button>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Total: {((task.actualHours || 0) * 60).toFixed(0)} minutos
                      </div>
                    </div>
                    
                    {isTracking && (
                      <div className="mt-3">
                        <Input
                          placeholder="Descrição do trabalho realizado..."
                          value={timeEntry.description}
                          onChange={(e) => setTimeEntry(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comments" className="mt-0 space-y-4">
                {/* New Comment */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{user.full_name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Textarea
                          placeholder="Adicionar comentário..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={3}
                        />
                        <div className="flex justify-end mt-2">
                          <Button
                            size="sm"
                            onClick={handleAddComment}
                            disabled={!newComment.trim() || saving}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Comentar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Comments List */}
                {(!task.comments || task.comments.length === 0) ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Nenhum comentário</h3>
                    <p className="text-gray-600">
                      Seja o primeiro a comentar nesta tarefa.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {task.comments.map((comment, index) => (
                      <Card key={comment.id || index}>
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{comment.userName?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-sm">{comment.userName}</span>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(comment.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </span>
                                {comment.isEdited && (
                                  <Badge variant="secondary" className="text-xs">Editado</Badge>
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                              {comment.attachments && comment.attachments.length > 0 && (
                                <div className="flex gap-2 mt-2">
                                  {comment.attachments.map((attachment, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      <Paperclip className="w-3 h-3 mr-1" />
                                      {attachment}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="attachments" className="mt-0 space-y-4">
                {/* Upload Area */}
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div>
                        <Label>Descrição (opcional)</Label>
                        <Input
                          placeholder="Descreva o que está sendo anexado..."
                          value={attachmentDescription}
                          onChange={(e) => setAttachmentDescription(e.target.value)}
                        />
                      </div>
                      
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          multiple
                          onChange={(e) => setSelectedFiles([...e.target.files])}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            Clique para selecionar arquivos ou arraste-os aqui
                          </p>
                        </label>
                      </div>

                      {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                          <Label>Arquivos Selecionados:</Label>
                          {[...selectedFiles].map((file, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              {getFileIcon(file.type)}
                              <span>{file.name}</span>
                              <span className="text-gray-500">({formatFileSize(file.size)})</span>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            onClick={() => handleFileUpload(selectedFiles)}
                            disabled={uploading}
                          >
                            {uploading ? 'Enviando...' : 'Anexar Arquivos'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Attachments List */}
                {(!task.attachments || task.attachments.length === 0) ? (
                  <div className="text-center py-8">
                    <Paperclip className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Nenhum anexo</h3>
                    <p className="text-gray-600">
                      Anexe arquivos, evidências ou documentos relacionados à tarefa.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {task.attachments.map((attachment, index) => (
                      <Card key={attachment.id || index}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            {getFileIcon(attachment.mimeType)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{attachment.name}</p>
                              <p className="text-sm text-gray-600 truncate">
                                {attachment.description}
                              </p>
                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                <span>Por {attachment.uploadedByName}</span>
                                <span>{format(new Date(attachment.uploadedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                                <span>{formatFileSize(attachment.size)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {attachment.isEvidence && (
                                <Badge variant="secondary" className="text-xs">
                                  Evidência
                                </Badge>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(attachment.url, '_blank')}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = attachment.url;
                                  a.download = attachment.name;
                                  a.click();
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-0 space-y-4">
                {(!task.statusHistory || task.statusHistory.length === 0) ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Nenhum histórico</h3>
                    <p className="text-gray-600">
                      O histórico de mudanças aparecerá aqui conforme a tarefa for atualizada.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...(task.statusHistory || [])].reverse().map((entry, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{entry.changedByName?.[0] || 'S'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{entry.changedByName || 'Sistema'}</span>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(entry.changedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </span>
                              </div>
                              <p className="text-sm">
                                {entry.previousStatus ? (
                                  <>
                                    Alterou status de <Badge variant="outline" className="text-xs mx-1">{entry.previousStatus}</Badge>
                                    para <Badge variant="outline" className="text-xs mx-1">{entry.status}</Badge>
                                  </>
                                ) : (
                                  `Status definido como ${entry.status}`
                                )}
                              </p>
                              {entry.reason && (
                                <p className="text-xs text-gray-600 mt-1">{entry.reason}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Time entries in history */}
                    {task.timeEntries && task.timeEntries.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 mt-4">Registros de Tempo</h4>
                        {[...task.timeEntries].reverse().map((entry, index) => (
                          <Card key={index} className="bg-blue-50">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">
                                    {entry.duration} minutos registrados
                                  </p>
                                  <p className="text-xs text-gray-600">{entry.description}</p>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(entry.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
