# 🧾 **SISTEMA DE BRIEFING HÍBRIDO - DOCUMENTAÇÃO COMPLETA**

## 📋 **VISÃO GERAL**

O Sistema de Briefing Híbrido é uma solução inovadora que permite aos consultores personalizar a execução de serviços através de um briefing inteligente preenchido durante o kickoff, com aplicação automática de regras de IA para ajustar tarefas baseadas no contexto específico do cliente.

### **🎯 Objetivos**
- **Personalização**: Adaptar execução baseada no contexto real do cliente
- **Eficiência**: Automatizar ajustes através de regras determinísticas
- **Flexibilidade**: Manter templates como base, com personalização via diffs
- **Transparência**: Auditoria completa de ajustes e motivos

---

## 🏗️ **ARQUITETURA**

### **Fluxo Principal**
```
Serviço Ativado → Tarefas do Template → Briefing do Consultor → IA Rules → Ajustes → Tarefas Personalizadas
```

### **Componentes Principais**

#### **1. Modelos de Dados**
- **`Briefing`**: Representa briefing por instância de serviço
- **`TaskAdjustment`**: Representa ajustes aplicados às tarefas

#### **2. Serviços**
- **`BriefingService`**: CRUD + aplicação de regras
- **`AIRulesService`**: Regras determinísticas por tipo de serviço

#### **3. Hooks**
- **`useBriefing`**: Gerenciamento completo do briefing
- **`useTaskAdjustments`**: Gerenciamento de ajustes

#### **4. Componentes UI**
- **`BriefingForm`**: Formulário dinâmico por tipo de serviço
- **`TaskAdjustmentsViewer`**: Visualização de ajustes aplicados

---

## 📊 **MODELOS DE DADOS**

### **Briefing**
```javascript
{
  id: "uuid",
  servico_instancia_id: "uuid",
  cliente_id: "uuid", 
  servico_tipo: "diagnostico_avulso | mentoria_margem | gestao_360",
  itens: {}, // Schema específico por tipo
  preenchido_por_user_id: "uuid",
  preenchido_em: "ISO-8601",
  versao: 1,
  status: "ativo | superseded | rascunho"
}
```

### **TaskAdjustment**
```javascript
{
  id: "uuid",
  servico_instancia_id: "uuid",
  briefing_id: "uuid",
  action: "PRIORITIZE | DEFER | HIDE | ADD_SUBTASK | ADD_TASK | ADD_NOTE | SET_MILESTONE",
  task_id: "uuid|null",
  task_template_key: "string|null",
  payload: {},
  reason: "string",
  created_at: "ISO-8601",
  created_by: "ai_system | user_id",
  status: "active | superseded | cancelled"
}
```

---

## 🤖 **REGRAS DE IA POR SERVIÇO**

### **Diagnóstico Financeiro Avulso**

#### **Regra 1: Dados Limitados**
```javascript
condition: briefing.itens.disponibilidade_dados === 'baixa'
actions: [
  { action: 'ADD_SUBTASK', task: 'coleta_minima_dados' },
  { action: 'DEFER', tasks: ['analise_profunda'] }
]
```

#### **Regra 2: Foco em Fluxo de Caixa**
```javascript
condition: briefing.itens.principal_dor === 'fluxo_caixa'
actions: [
  { action: 'PRIORITIZE', task: 'avaliar_fluxo_caixa', priority: 'P0' },
  { action: 'ADD_NOTE', task: 'avaliar_fluxo_caixa', note: 'Focar em recebíveis' }
]
```

#### **Regra 3: Endividamento Crítico**
```javascript
condition: endividamento_total > (faturamento_mensal_medio * 3)
actions: [
  { action: 'ADD_TASK', task: 'mapear_dividas_renegociacao' }
]
```

### **Mentoria em Precificação**

#### **Regra 1: Elasticidade Alta**
```javascript
condition: briefing.itens.elasticidade_preco_percebida === 'alta'
actions: [
  { action: 'PRIORITIZE', task: 'identificar_custos', priority: 'P0' },
  { action: 'ADD_SUBTASK', task: 'mapear_oportunidades_custo' }
]
```

#### **Regra 2: Capacidade de Negociação**
```javascript
condition: briefing.itens.capacidade_negociacao_fornecedores === 'alta'
actions: [
  { action: 'ADD_TASK', task: 'sprint_renegociacao_fornecedores' }
]
```

#### **Regra 3: Política Agressiva de Descontos**
```javascript
condition: briefing.itens.politica_descontos_atual === 'agressiva'
actions: [
  { action: 'ADD_TASK', task: 'auditoria_politica_descontos' }
]
```

### **Gestão Financeira 360**

#### **Regra 1: Maturidade Baixa**
```javascript
condition: briefing.itens.maturidade_processos === 'baixa'
actions: [
  { action: 'ADD_TASK', task: 'implantacao_basica_governanca' }
]
```

#### **Regra 2: Inadimplência Alta**
```javascript
condition: inadimplencia_percent > 10 && politica_credito !== 'rigida'
actions: [
  { action: 'ADD_TASK', task: 'definir_politica_credito_rigorosa' }
]
```

#### **Regra 3: Estoque Problemático**
```javascript
condition: estoque_valor > 100000 && ruptura_estoque_frequente
actions: [
  { action: 'PRIORITIZE', task: 'controle_estoque', priority: 'P0' },
  { action: 'ADD_SUBTASK', task: 'implementar_curva_abc' }
]
```

---

## 🎣 **HOOKS**

### **useBriefing**
```javascript
const {
  briefing,
  briefings,
  adjustments,
  stats,
  isLoading,
  isSubmitting,
  error,
  createBriefing,
  updateBriefing,
  submitBriefing,
  createNewVersion,
  applyAdjustmentsToTasks,
  refresh,
  hasActiveBriefing,
  hasDraftBriefing,
  canSubmit,
  adjustmentsCount
} = useBriefing(servicoInstanciaId);
```

### **useTaskAdjustments**
```javascript
const {
  adjustments,
  isLoading,
  error,
  stats,
  loadAdjustments,
  loadAdjustmentsByBriefing,
  applyAdjustmentsToTasks,
  refresh,
  getAdjustmentStats,
  getAdjustmentsByAction,
  getAdjustmentsByReason,
  getAdjustmentsForTask,
  hasAdjustments,
  getMostCommonAction,
  getMostCommonReason,
  totalAdjustments,
  prioritizeCount,
  deferCount,
  hideCount,
  addTaskCount,
  addSubtaskCount,
  addNoteCount,
  setMilestoneCount
} = useTaskAdjustments(servicoInstanciaId);
```

---

## 🎨 **COMPONENTES UI**

### **BriefingForm**
```javascript
<BriefingForm
  servicoInstanciaId={servicoInstanciaId}
  clienteId={clienteId}
  servicoTipo={servicoTipo}
  onBriefingSubmitted={handleBriefingSubmitted}
  onCancel={handleCancel}
/>
```

**Características:**
- Formulário dinâmico baseado no tipo de serviço
- Validação em tempo real
- Salvamento automático de rascunho
- Indicadores visuais de status

### **TaskAdjustmentsViewer**
```javascript
<TaskAdjustmentsViewer
  servicoInstanciaId={servicoInstanciaId}
  tasks={tasks}
  showStats={true}
/>
```

**Características:**
- Visualização de ajustes aplicados
- Estatísticas por ação e motivo
- Filtros e busca
- Indicadores visuais de tarefas ajustadas

---

## 🔄 **INTEGRAÇÃO COM TRIGGERS**

### **Eventos Registrados**

#### **1. Briefing Enviado**
```javascript
eventName: 'briefing_submitted'
action: Aplicar regras de IA e persistir ajustes
```

#### **2. Briefing Ativado**
```javascript
eventName: 'briefing_activated'
action: Notificar equipe sobre ativação
```

#### **3. Ajustes Aplicados**
```javascript
eventName: 'adjustments_applied'
action: Atualizar tarefas com ajustes
```

### **Regras de Trigger**
```javascript
// Regra: Briefing Enviado -> Aplicar Regras de IA
registerRule({
  id: 'briefing_submitted_ai_rules',
  eventName: 'briefing_submitted',
  description: 'Aplica regras de IA após envio do briefing',
  action: async (event) => {
    const briefing = await briefingService.getBriefing(event.entityId);
    const adjustments = await aiRulesService.applyRules(briefing);
    // Persistir ajustes...
  }
});
```

---

## 🚀 **COMO USAR**

### **1. Criar Briefing**
```javascript
const briefing = await briefingService.createBriefing({
  servico_instancia_id: 'service-123',
  cliente_id: 'client-456',
  servico_tipo: 'diagnostico_avulso',
  itens: {
    empresa_setor: 'Comércio',
    principal_dor: 'fluxo_caixa',
    faturamento_mensal_medio: 50000,
    // ... outros campos
  },
  preenchido_por_user_id: 'user-789'
});
```

### **2. Enviar Briefing**
```javascript
const result = await briefingService.submitBriefing(briefing.id);
// result.adjustments contém os ajustes aplicados
// result.stats contém estatísticas dos ajustes
```

### **3. Aplicar Ajustes às Tarefas**
```javascript
const result = await briefingService.applyAdjustmentsToTasks(tasks, servicoInstanciaId);
// result.adjustedTasks: tarefas ajustadas
// result.newTasks: novas tarefas criadas
```

### **4. Usar Hooks**
```javascript
function ServicePage({ servicoInstanciaId }) {
  const { briefing, submitBriefing, applyAdjustmentsToTasks } = useBriefing(servicoInstanciaId);
  const { adjustments, stats } = useTaskAdjustments(servicoInstanciaId);
  
  // Usar dados e funções...
}
```

---

## 📈 **ESTATÍSTICAS E MÉTRICAS**

### **Métricas de Briefing**
- Total de briefings por serviço
- Briefings ativos vs rascunhos
- Versões por briefing
- Tempo médio de preenchimento

### **Métricas de Ajustes**
- Total de ajustes aplicados
- Ajustes por ação (PRIORITIZE, DEFER, etc.)
- Ajustes por motivo
- Ajustes por criador (IA vs usuário)

### **Métricas de Performance**
- Tempo de aplicação das regras
- Taxa de sucesso das regras
- Impacto nos prazos de entrega

---

## 🔒 **PERMISSÕES E SEGURANÇA**

### **Permissões**
- **Consultor**: Criar, editar, enviar briefing
- **Cliente**: Apenas visualizar (se aplicável)
- **Admin**: Gerenciar regras de IA

### **Auditoria**
- Log de todas as ações
- Rastreamento de mudanças
- Histórico de versões
- Motivos dos ajustes

---

## 🧪 **TESTES**

### **Testes Unitários**
```javascript
// Teste de validação de briefing
describe('Briefing Validation', () => {
  it('should validate required fields', () => {
    const briefing = new Briefing({
      servico_instancia_id: 'test',
      servico_tipo: 'diagnostico_avulso',
      itens: { empresa_setor: 'Comércio' }
    });
    
    const validation = briefing.validate();
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Campo principal_dor é obrigatório');
  });
});
```

### **Testes de Integração**
```javascript
// Teste de fluxo completo
describe('Briefing Flow', () => {
  it('should create briefing, apply rules, and generate adjustments', async () => {
    const briefing = await briefingService.createBriefing(briefingData);
    const result = await briefingService.submitBriefing(briefing.id);
    
    expect(result.adjustments.length).toBeGreaterThan(0);
    expect(result.briefing.status).toBe('ativo');
  });
});
```

---

## 📚 **EXEMPLOS DE USO**

### **Exemplo 1: Diagnóstico com Dados Limitados**
```javascript
// Briefing preenchido
const briefing = {
  servico_tipo: 'diagnostico_avulso',
  itens: {
    disponibilidade_dados: 'baixa',
    principal_dor: 'fluxo_caixa',
    restricoes_tempo: 'urgente_7d'
  }
};

// Ajustes aplicados automaticamente
const adjustments = [
  { action: 'ADD_SUBTASK', task: 'coleta_minima_dados' },
  { action: 'DEFER', task: 'analise_profunda' },
  { action: 'PRIORITIZE', task: 'avaliar_fluxo_caixa', priority: 'P0' }
];
```

### **Exemplo 2: Mentoria com Risco Alto**
```javascript
// Briefing preenchido
const briefing = {
  servico_tipo: 'mentoria_margem',
  itens: {
    elasticidade_preco_percebida: 'alta',
    risco_perda_clientes_com_reajuste: 'alto',
    politica_descontos_atual: 'agressiva'
  }
};

// Ajustes aplicados automaticamente
const adjustments = [
  { action: 'PRIORITIZE', task: 'identificar_custos', priority: 'P0' },
  { action: 'ADD_TASK', task: 'teste_ab_preco' },
  { action: 'ADD_TASK', task: 'auditoria_politica_descontos' }
];
```

---

## 🎯 **ROADMAP**

### **Fase 1: Implementação Base** ✅
- [x] Modelos de dados
- [x] Serviços de briefing e IA
- [x] Hooks básicos
- [x] Componentes UI
- [x] Integração com triggers

### **Fase 2: Melhorias** 🔄
- [ ] Testes automatizados
- [ ] Dashboard de métricas
- [ ] Editor de regras de IA
- [ ] Notificações em tempo real
- [ ] Exportação de relatórios

### **Fase 3: Avançado** 📋
- [ ] IA generativa para sugestões
- [ ] Aprendizado de máquina
- [ ] Integração com APIs externas
- [ ] Mobile app
- [ ] Analytics avançados

---

## 🆘 **SUPORTE E TROUBLESHOOTING**

### **Problemas Comuns**

#### **1. Briefing não valida**
- Verificar campos obrigatórios
- Validar schema por tipo de serviço
- Conferir tipos de dados

#### **2. Regras de IA não aplicam**
- Verificar condições das regras
- Conferir dados do briefing
- Verificar logs de erro

#### **3. Ajustes não persistem**
- Verificar permissões do usuário
- Conferir integridade dos dados
- Verificar sistema de triggers

### **Logs e Debug**
```javascript
// Habilitar logs detalhados
console.log('[BriefingService] Debug mode enabled');

// Verificar estado do briefing
const briefing = await briefingService.getBriefing(briefingId);
console.log('Briefing state:', briefing);

// Verificar ajustes aplicados
const adjustments = await briefingService.getActiveAdjustmentsByService(serviceId);
console.log('Active adjustments:', adjustments);
```

---

## 📞 **CONTATO**

Para dúvidas, sugestões ou problemas:
- **Email**: suporte@evocto.com
- **Documentação**: `/briefing-demo` (página de demonstração)
- **Issues**: GitHub Issues

---

**Sistema de Briefing Híbrido v1.0** - Implementado com sucesso! 🚀

