
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  HelpCircle, MessageCircle, Phone, Mail, 
  ExternalLink, ChevronDown, Search, Book,
  PlayCircle, FileText, CheckCircle, BarChart3, Bell,
  X, Send, Clock, CheckCircle2, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { SendEmail } from '@/api/integrations';

export default function HelpSupport() {
  const [faqOpen, setFaqOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    priority: 'medium'
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      id: 1,
      question: "Como posso aprovar um documento?",
      answer: "Na aba 'Aprovações', clique no documento que precisa ser aprovado. Você verá um preview do conteúdo e poderá escolher entre 'Aprovar' ou 'Solicitar Alterações'. Você também pode adicionar comentários explicando sua decisão.",
      category: "Aprovações",
      helpful: 0
    },
    {
      id: 2,
      question: "Onde posso ver os relatórios dos meus projetos?",
      answer: "Na aba 'Relatórios' você encontra todos os ciclos completados e seus resultados. Cada relatório mostra métricas de performance, resultados alcançados e pode ser baixado em PDF para suas apresentações internas.",
      category: "Relatórios",
      helpful: 0
    },
    {
      id: 3,
      question: "Como alterar informações do meu briefing?",
      answer: "Você pode visualizar seu briefing na aba 'Briefing', mas edições são feitas pela agência para manter a integridade do projeto. Se precisar de alterações, use o botão 'Solicitar Alteração' ou entre em contato conosco.",
      category: "Briefing",
      helpful: 0
    },
    {
      id: 4,
      question: "Não estou recebendo notificações por email",
      answer: "Primeiro, verifique sua caixa de spam/lixeira. Se o problema persistir, entre em contato conosco para verificar suas preferências de notificação. Você pode receber alertas sobre aprovações pendentes, novos relatórios e atualizações importantes.",
      category: "Notificações",
      helpful: 0
    },
    {
      id: 5,
      question: "Como baixar documentos e relatórios?",
      answer: "Na maioria das telas há um botão 'Baixar PDF' ou ícone de download. Se não aparecer, o documento pode ainda estar sendo gerado. Você receberá uma notificação quando estiver pronto.",
      category: "Documentos",
      helpful: 0
    },
    {
      id: 6,
      question: "O que significa cada status de aprovação?",
      answer: "• Pendente: Aguardando sua análise\n• Aprovado: Você aprovou e o trabalho pode prosseguir\n• Alterações solicitadas: Você pediu modificações\n• Expirado: O prazo para aprovação passou",
      category: "Aprovações",
      helpful: 0
    }
  ];

  const quickGuides = [
    {
      title: "Primeira aprovação",
      description: "Passo a passo para aprovar seu primeiro documento",
      icon: CheckCircle,
      duration: "3 min",
      steps: ["Acesse a aba Aprovações", "Clique no documento", "Revise o conteúdo", "Escolha Aprovar ou Solicitar Alterações"]
    },
    {
      title: "Entendendo relatórios",
      description: "Como interpretar os dados e métricas dos seus projetos",
      icon: BarChart3,
      duration: "5 min",
      steps: ["Vá para a aba Relatórios", "Selecione um ciclo", "Analise as métricas", "Baixe o PDF se necessário"]
    },
    {
      title: "Configurando notificações",
      description: "Personalize como você quer receber atualizações",
      icon: Bell,
      duration: "2 min",
      steps: ["Clique no seu avatar", "Vá em Configurações", "Ajuste preferências de email", "Salve as alterações"]
    }
  ];

  const handleContactSubmit = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSubmitting(true);
      
      await SendEmail({
        to: 'suporte@agencia.com', 
        subject: `[PORTAL CLIENTE] ${contactForm.subject}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 20px; color: white; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">📧 Nova Mensagem do Portal</h2>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <div style="margin-bottom: 20px;">
                <div style="display: inline-block; background: ${
                  contactForm.priority === 'high' ? '#fef3c7' : 
                  contactForm.priority === 'medium' ? '#e0e7ff' : '#f3f4f6'
                }; color: ${
                  contactForm.priority === 'high' ? '#92400e' : 
                  contactForm.priority === 'medium' ? '#3730a3' : '#374151'
                }; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                  ${contactForm.priority === 'high' ? '🔴 Alta Prioridade' : 
                    contactForm.priority === 'medium' ? '🟡 Prioridade Normal' : '🟢 Baixa Prioridade'}
                </div>
              </div>
              
              <h3 style="color: #1f2937; margin: 0 0 10px 0;">📌 ${contactForm.subject}</h3>
              
              <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                <p style="margin: 0; color: #374151; line-height: 1.6; white-space: pre-wrap;">${contactForm.message}</p>
              </div>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 20px;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  ⏰ Enviado em ${new Date().toLocaleString('pt-BR')}<br>
                  🌐 Via Portal do Cliente
                </p>
              </div>
            </div>
          </div>
        `
      });

      toast.success('✅ Mensagem enviada com sucesso! Nossa equipe responderá em breve.');
      setContactForm({ subject: '', message: '', priority: 'medium' });
      setContactDialogOpen(false);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('❌ Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex items-center space-x-3">
      {/* FAQ Popover */}
      <Popover open={faqOpen} onOpenChange={setFaqOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800 hover:bg-gray-100">
            <Book className="w-4 h-4 mr-2" />
            FAQ
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[400px] p-0" align="end" sideOffset={5}>
          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="text-lg flex items-center">
                <Book className="w-5 h-5 mr-2" />
                Perguntas Frequentes
              </CardTitle>
              
              <div className="relative mt-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar nas perguntas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/70"
                />
              </div>
            </CardHeader>
            
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              {filteredFaqs.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {filteredFaqs.map((faq) => (
                    <details key={faq.id} className="group">
                      <summary className="p-4 cursor-pointer hover:bg-gray-50 transition-colors list-none">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900 leading-5">
                              {faq.question}
                            </p>
                            <Badge variant="secondary" className="text-xs mt-2">
                              {faq.category}
                            </Badge>
                          </div>
                          <ChevronDown className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0 transform group-open:rotate-180 transition-transform" />
                        </div>
                      </summary>
                      <div className="px-4 pb-4 bg-gray-50">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {faq.answer}
                        </p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs text-gray-500">Esta resposta foi útil?</span>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              👍 Sim
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              👎 Não
                            </Button>
                          </div>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 text-sm">Nenhuma pergunta encontrada</p>
                  <p className="text-gray-400 text-xs mt-1">Tente usar palavras diferentes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800 hover:bg-gray-100">
            <HelpCircle className="w-4 h-4 mr-2" />
            Ajuda
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl flex items-center">
              <HelpCircle className="w-6 h-6 mr-3 text-blue-600" />
              Como podemos ajudar?
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Quick Guides */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <PlayCircle className="w-5 h-5 mr-2 text-purple-600" />
                Guias Rápidos
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {quickGuides.map((guide, index) => {
                  const Icon = guide.icon;
                  return (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900 group-hover:text-blue-900">
                              {guide.title}
                            </h5>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {guide.duration}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {guide.description}
                          </p>
                          <div className="space-y-1">
                            {guide.steps.map((step, stepIndex) => (
                              <div key={stepIndex} className="flex items-center text-xs text-gray-500">
                                <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center mr-2 text-[10px] font-medium">
                                  {stepIndex + 1}
                                </div>
                                {step}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
                Entrar em Contato
              </h4>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assunto *
                    </label>
                    <Input
                      placeholder="Resumo da sua dúvida ou problema"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                      className="h-10"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prioridade
                    </label>
                    <select
                      value={contactForm.priority}
                      onChange={(e) => setContactForm({...contactForm, priority: e.target.value})}
                      className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">🟢 Baixa prioridade</option>
                      <option value="medium">🟡 Prioridade normal</option>
                      <option value="high">🔴 Alta prioridade</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensagem *
                  </label>
                  <Textarea
                    placeholder="Descreva sua dúvida ou problema em detalhes. Quanto mais informações você fornecer, melhor poderemos ajudar!"
                    value={contactForm.message}
                    onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                    rows={4}
                    className="resize-none"
                  />
                </div>
                
                <div className="flex justify-between items-center pt-4">
                  <div className="text-xs text-gray-500">
                    📧 Resposta típica: 2-4 horas úteis
                  </div>
                  
                  <Button
                    onClick={handleContactSubmit}
                    disabled={submitting || !contactForm.subject.trim() || !contactForm.message.trim()}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Mensagem
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-semibold text-gray-900 mb-4">📞 Contato Direto</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <a 
                  href="mailto:suporte@agencia.com"
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium text-sm text-gray-900 group-hover:text-blue-900">Email</p>
                    <p className="text-xs text-gray-600">24h úteis</p>
                  </div>
                </a>
                
                <a 
                  href="tel:+5511999999999"
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors group"
                >
                  <Phone className="w-5 h-5 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-sm text-gray-900 group-hover:text-green-900">Telefone</p>
                    <p className="text-xs text-gray-600">9h-18h</p>
                  </div>
                </a>
                
                <a 
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors group"
                >
                  <MessageCircle className="w-5 h-5 text-purple-600" />
                  <div className="text-left">
                    <p className="font-medium text-sm text-gray-900 group-hover:text-purple-900">WhatsApp</p>
                    <p className="text-xs text-gray-600">Rápido</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
