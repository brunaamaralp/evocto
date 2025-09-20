import React, { useState } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, Send, Edit3, Trash2, Reply, 
  AtSign, User, Settings, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COMMENT_TYPES = {
  comment: { label: 'Comentário', color: 'bg-blue-100 text-blue-700' },
  status_change: { label: 'Status', color: 'bg-gray-100 text-gray-700' },
  assignment: { label: 'Atribuição', color: 'bg-green-100 text-green-700' },
  review: { label: 'Revisão', color: 'bg-purple-100 text-purple-700' },
  system: { label: 'Sistema', color: 'bg-orange-100 text-orange-700' }
};

export default function TaskComments({ task, onUpdate }) {
  const { user } = useSession();
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const comments = task.comments || [];
      const comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name || user.email,
        content: newComment.trim(),
        type: 'comment',
        mentions: extractMentions(newComment),
        attachments: [],
        createdAt: new Date().toISOString(),
        isEdited: false
      };

      const updatedComments = [...comments, comment];
      
      await Task.update(task.id, { 
        comments: updatedComments 
      });

      const updatedTask = { ...task, comments: updatedComments };
      onUpdate(updatedTask);
      
      setNewComment('');
      toast.success('Comentário adicionado!');

    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast.error('Erro ao adicionar comentário');
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editContent.trim()) return;

    setLoading(true);
    try {
      const comments = task.comments || [];
      const updatedComments = comments.map(comment => 
        comment.id === commentId 
          ? {
              ...comment,
              content: editContent.trim(),
              editedAt: new Date().toISOString(),
              isEdited: true,
              mentions: extractMentions(editContent)
            }
          : comment
      );

      await Task.update(task.id, { comments: updatedComments });

      const updatedTask = { ...task, comments: updatedComments };
      onUpdate(updatedTask);
      
      setEditingComment(null);
      setEditContent('');
      toast.success('Comentário editado!');

    } catch (error) {
      console.error('Erro ao editar comentário:', error);
      toast.error('Erro ao editar comentário');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Tem certeza que deseja excluir este comentário?')) return;

    setLoading(true);
    try {
      const comments = task.comments || [];
      const updatedComments = comments.filter(comment => comment.id !== commentId);

      await Task.update(task.id, { comments: updatedComments });

      const updatedTask = { ...task, comments: updatedComments };
      onUpdate(updatedTask);
      
      toast.success('Comentário excluído!');

    } catch (error) {
      console.error('Erro ao excluir comentário:', error);
      toast.error('Erro ao excluir comentário');
    } finally {
      setLoading(false);
    }
  };

  const extractMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  };

  const formatCommentContent = (content) => {
    // Destacar mentions
    return content.replace(/@(\w+)/g, '<span class="text-blue-600 font-medium">@$1</span>');
  };

  const startEdit = (comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditContent('');
  };

  const canEditComment = (comment) => {
    return comment.userId === user.id && comment.type === 'comment';
  };

  const comments = task.comments || [];

  return (
    <div className="space-y-4">
      {/* Add Comment */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicionar comentário... (use @ para mencionar alguém)"
                className="min-h-20 resize-none"
                disabled={loading}
              />
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  <AtSign className="w-3 h-3 inline mr-1" />
                  Use @ para mencionar usuários
                </div>
                <Button 
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || loading}
                  className="flex items-center gap-1"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'Enviando...' : 'Comentar'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      {comments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum comentário ainda</p>
              <p className="text-sm">Seja o primeiro a comentar nesta tarefa</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const commentType = COMMENT_TYPES[comment.type] || COMMENT_TYPES.comment;
            const isEditing = editingComment === comment.id;
            
            return (
              <Card key={comment.id} className="border-l-2" style={{borderLeftColor: comment.type === 'comment' ? '#3b82f6' : '#9ca3af'}}>
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {comment.userName?.charAt(0) || comment.userEmail?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {comment.userName || comment.userEmail}
                          </span>
                          <Badge className={commentType.color} variant="secondary">
                            {commentType.label}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDistance(new Date(comment.createdAt), new Date(), { 
                              addSuffix: true,
                              locale: ptBR 
                            })}
                          </span>
                          {comment.isEdited && (
                            <Badge variant="outline" className="text-xs">
                              editado
                            </Badge>
                          )}
                        </div>

                        {canEditComment(comment) && !isEditing && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(comment)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-16 resize-none"
                            disabled={loading}
                          />
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm"
                              onClick={() => handleEditComment(comment.id)}
                              disabled={!editContent.trim() || loading}
                            >
                              Salvar
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              disabled={loading}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="text-sm text-gray-700 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: formatCommentContent(comment.content) 
                          }}
                        />
                      )}

                      {comment.mentions && comment.mentions.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <AtSign className="w-3 h-3" />
                          <span>Mencionou: {comment.mentions.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}