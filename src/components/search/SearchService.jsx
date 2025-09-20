import { createPageUrl } from '@/utils';

// Mock de dados simulando a base de dados completa
const mockDatabase = {
  clients: [
    { id: 'client_acme', name: 'ACME Corp', status: 'ativo' },
    { id: 'client_tech', name: 'Tech Solutions', status: 'ativo' },
    { id: 'client_health', name: 'Healthcare Inc', status: 'inativo' },
  ],
  services: [
    { id: 'service_mkt', name: 'Marketing Digital', clientId: 'client_acme' },
    { id: 'service_dev', name: 'Desenvolvimento Web', clientId: 'client_tech' },
    { id: 'service_branding', name: 'Branding', clientId: 'client_acme' },
  ],
  cycles: [
    { id: 'cycle_q3', name: 'Plano Q3 2024', serviceId: 'service_mkt', status: 'aprovado' },
    { id: 'cycle_jul', name: 'Ciclo Julho', serviceId: 'service_dev', status: 'em_execucao' },
  ],
  workOrders: [
    { id: 'wo_lp', title: 'Landing Page Black Friday', clientId: 'client_acme', status: 'concluido' }
  ],
  learnings: [
    { id: 'learn_video', title: 'Insight: Vídeos curtos aumentam engajamento em 25%', niche: 'B2B Tech', meta: 'Vídeos' }
  ]
};

// Simula a busca no backend, aplicando ranking e transformando os dados
export class SearchService {
  // Transforma um item do "banco de dados" para o formato de resultado de busca
  static transform(item, type) {
    const client = item.clientId ? mockDatabase.clients.find(c => c.id === item.clientId) : null;
    const service = item.serviceId ? mockDatabase.services.find(s => s.id === item.serviceId) : null;
    
    switch (type) {
      case 'client':
        return {
          id: item.id, type, title: item.name, subtitle: 'Cliente',
          meta: item.status, href: createPageUrl(`clients/${item.id}`), score: 0
        };
      case 'service':
        return {
          id: item.id, type, title: item.name, subtitle: `Serviço • ${client?.name || ''}`,
          meta: 'Serviço Recorrente', href: createPageUrl(`services/${item.id}`), score: 0
        };
      case 'cycle':
        const cycleClient = service ? mockDatabase.clients.find(c => c.id === service.clientId) : null;
        return {
          id: item.id, type, title: item.name, subtitle: `Ciclo • ${service?.name} • ${cycleClient?.name}`,
          meta: item.status, href: createPageUrl(`active-cycles?id=${item.id}`), score: 0
        };
      case 'workorder':
        return {
          id: item.id, type, title: item.title, subtitle: `Job • ${client?.name}`,
          meta: item.status, href: createPageUrl(`WorkOrders?id=${item.id}`), score: 0
        };
      case 'learning':
        return {
          id: item.id, type, title: item.title, subtitle: `Biblioteca • ${item.niche}`,
          meta: item.meta, href: createPageUrl(`library?id=${item.id}`), score: 0
        };
      default: return null;
    }
  }

  // Aplica a lógica de ranking
  static rank(results, query, context = {}) {
    const q = query.toLowerCase();
    return results.map(item => {
      let score = 100;
      const title = item.title.toLowerCase();
      const subtitle = item.subtitle.toLowerCase();

      // Boost por match
      if (title.includes(q)) score += 50;
      if (subtitle.includes(q)) score += 20;
      if (title.startsWith(q)) score += 30; // Match no início é mais relevante

      // Boost por contexto (se estiver dentro de um cliente, por exemplo)
      if (context.clientId && item.id.includes(context.clientId)) score += 40;

      // Boost por tipo (clientes e serviços são geralmente mais importantes)
      if (['client', 'service'].includes(item.type)) score += 10;
      
      // Simulação de sinônimos
      if ((q.includes('social') || q.includes('posts')) && title.includes('marketing')) score += 15;
      if ((q.includes('trafego') || q.includes('ads')) && title.includes('mídia paga')) score += 15;
      
      item.score = score;
      return item;
    }).sort((a, b) => b.score - a.score);
  }

  // Função principal de busca
  static async performSearch(query, filters = {}, context = {}) {
    // Simula delay de rede
    await new Promise(res => setTimeout(res, 250));

    const allItems = [
      ...mockDatabase.clients.map(i => this.transform(i, 'client')),
      ...mockDatabase.services.map(i => this.transform(i, 'service')),
      ...mockDatabase.cycles.map(i => this.transform(i, 'cycle')),
      ...mockDatabase.workOrders.map(i => this.transform(i, 'workorder')),
      ...mockDatabase.learnings.map(i => this.transform(i, 'learning')),
    ].filter(Boolean);

    let filtered = allItems;

    // Filtra por texto
    if (query) {
      const q = query.toLowerCase();
      filtered = allItems.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.subtitle.toLowerCase().includes(q)
      );
    }
    
    // Filtra por facetas
    if (filters.type) {
      filtered = filtered.filter(item => item.type === filters.type);
    }
    if (filters.client) {
       filtered = filtered.filter(item => item.subtitle.includes(filters.client));
    }

    return this.rank(filtered, query, context);
  }
  
  static async getRecentItems() {
    // Em uma app real, isso viria do localStorage ou de uma API de atividade
    await new Promise(res => setTimeout(res, 100));
    return [
      this.transform(mockDatabase.clients[0], 'client'),
      this.transform(mockDatabase.services[0], 'service'),
      this.transform(mockDatabase.cycles[0], 'cycle'),
    ].filter(Boolean);
  }
}