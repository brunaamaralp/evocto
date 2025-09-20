export const glossaryData = [
  {
    "slug": "servico",
    "title": "Serviço",
    "short": "Linha de trabalho contínua (ex.: Social Media, Tráfego Pago).",
    "whenToUse": "Organiza ciclos recorrentes para um cliente.",
    "related": ["ciclo", "plano-do-ciclo"],
    "deepLink": "/services-overview",
    "tags": ["cliente", "ciclo", "recorrente"]
  },
  {
    "slug": "ciclo",
    "title": "Ciclo",
    "short": "Período operacional do serviço (ex.: Mensal, Trimestral).",
    "whenToUse": "Tem Plano, Execução e Fechamento. É onde o trabalho acontece.",
    "related": ["servico", "plano-do-ciclo", "rc"],
    "deepLink": "/active-cycles",
    "tags": ["período", "plano", "execução"]
  },
  {
    "slug": "briefing-mestre",
    "title": "Briefing Mestre",
    "short": "Contexto estratégico vivo do cliente, atualizado por aprendizados.",
    "whenToUse": "Fonte da verdade para gerar insights, escopos e planos.",
    "related": ["insights", "learning", "guardrails"],
    "deepLink": "/briefings",
    "tags": ["cliente", "estratégia", "contexto"]
  },
  {
    "slug": "rc",
    "title": "RC (Revisão e Confirmação)",
    "short": "Link temporário e seguro para o cliente aprovar um Briefing ou Plano.",
    "whenToUse": "Use para enviar qualquer material para validação externa antes de torná-lo 'Approved'.",
    "related": ["approved", "plano-do-ciclo", "portal-do-cliente"],
    "deepLink": "/briefings",
    "tags": ["aprovação", "cliente", "link", "segurança"]
  },
  {
    "slug": "approved",
    "title": "Approved (Aprovado)",
    "short": "Versão imutável e oficial de um Briefing ou Plano, com PDF.",
    "whenToUse": "Marca o ponto de 'não retorno' e serve como registro histórico.",
    "related": ["rc", "pdf-export"],
    "deepLink": null,
    "tags": ["imutável", "histórico", "pdf"]
  },
  {
    "slug": "plano-do-ciclo",
    "title": "Plano do Ciclo",
    "short": "Prioridades, testes e escopo IN/OUT para o período.",
    "whenToUse": "Define o que será feito no ciclo. Pode gerar um RC para aprovação.",
    "related": ["ciclo", "escopo-in-out", "rc"],
    "deepLink": "/active-cycles",
    "tags": ["planejamento", "escopo", "estratégia"]
  },
  {
    "slug": "escopo-in-out",
    "title": "Escopo IN/OUT",
    "short": "Lista clara do que está incluído (IN) e excluído (OUT) no ciclo.",
    "whenToUse": "Alinha expectativas sobre entregáveis. Cada item IN tem Esforço/Impacto.",
    "related": ["plano-do-ciclo", "esforco-impacto"],
    "deepLink": null,
    "tags": ["entregáveis", "expectativa", "alinhamento"]
  },
  {
    "slug": "esforco-impacto",
    "title": "Esforço/Impacto",
    "short": "Matriz para priorizar itens de escopo (Baixo, Médio, Alto).",
    "whenToUse": "Ajuda a focar em quick wins (baixo esforço, alto impacto).",
    "related": ["escopo-in-out", "plano-do-ciclo"],
    "deepLink": null,
    "tags": ["priorização", "matriz", "estratégia"]
  },
  {
    "slug": "guardrails",
    "title": "Guardrails",
    "short": "Limites de segurança (ex.: orçamento, claims).",
    "whenToUse": "Violações exigem revisão humana e evitam erros estratégicos.",
    "related": ["briefing-mestre", "riscos-saude"],
    "deepLink": "/agency-policies",
    "tags": ["segurança", "limites", "risco", "ia"]
  },
  {
    "slug": "learning",
    "title": "Learning (Aprendizado)",
    "short": "Insight capturado (de upload, reunião, execução).",
    "whenToUse": "Alimente a Biblioteca para que a IA possa usá-lo em futuros planos e briefings.",
    "related": ["playbook", "biblioteca", "briefing-mestre"],
    "deepLink": "/library",
    "tags": ["insight", "biblioteca", "ia"]
  },
  {
    "slug": "playbook",
    "title": "Playbook",
    "short": "Aprendizado curado e global da agência, com aplicabilidade definida.",
    "whenToUse": "Fonte de sugestões inteligentes para novos Planos de Ciclo.",
    "related": ["learning", "biblioteca"],
    "deepLink": "/playbooks",
    "tags": ["global", "estratégia", "curadoria", "ia"]
  },
  {
    "slug": "riscos-saude",
    "title": "Riscos & Saúde",
    "short": "Estado do serviço no ciclo (OK, Atenção, Crítico) com sinais acionáveis.",
    "whenToUse": "Monitore para antecipar problemas, como RCs expirando ou KPIs fora da meta.",
    "related": ["guardrails", "sla-digest"],
    "deepLink": "/active-cycles",
    "tags": ["monitoramento", "saúde", "risco"]
  },
  {
    "slug": "portal-do-cliente",
    "title": "Portal do Cliente",
    "short": "Página simples e segura para o cliente aprovar RCs e baixar PDFs.",
    "whenToUse": "Interface externa, focada em simplicidade e clareza para o cliente.",
    "related": ["rc", "approved"],
    "deepLink": null,
    "tags": ["cliente", "aprovação", "pdf"]
  },
  {
    "slug": "sla-digest",
    "title": "SLA & Digest",
    "short": "Prazos de triagem/fechamento e resumos diários por e-mail.",
    "whenToUse": "Definido nas Políticas da Agência para garantir a cadência da operação.",
    "related": ["riscos-saude", "guardrails"],
    "deepLink": "/agency-policies",
    "tags": ["prazos", "email", "operações"]
  }
];

export default glossaryData;