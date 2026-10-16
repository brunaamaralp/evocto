# Spec — Controle da própria empresa (P0 → P2)

Status: **P0, P1 e P2.1 (opção A) implementados**; P2.2 adiado (Carteira na home cobre o essencial).  
Origem: análise de clareza da agência vs cliente (canvas `controle-agencia-analise`) — Comercial · Financeiro · Operacional.  
Princípio: reforçar o **cockpit da agência** sem enfraquecer o shell de cliente (entrega).

## Contexto

Hoje o produto é **client-delivery–centric**:

| Shell | Conteúdo | Clareza |
|-------|----------|---------|
| Global (`ContextualSidebar` sem `clientId`) | Dashboard, Clientes, Tarefas, Biblioteca, Relatórios, Financeiro, Templates, Settings | Fino; falta “empresa” |
| Cliente (`?clientId=`) | Operação · Planejamento · Cliente | Rico e guiado |

**Veredito da análise:** operacional cross-client e financeiro da agência existem; comercial B2B está ausente; admin/equipe/ocupação estão fragmentados ou fora do menu.

## Objetivos

1. Tornar o controle da **própria empresa** descobridor e fácil (menu + hub).
2. Manter intactas as specs de Hub · Campanha · Workspace · Planejamento iterativo (create só no Planejamento **por cliente**).
3. Não reativar CRM de academia (Nave) sem decisão explícita de produto.

## Não-objetivos (todas as fases)

- Mudar arquitetura de rotas de campanha / workspace (Fases 0–5 campanha).
- Materializar planejamento anual / temas anuais (já removidos em PI-5).
- Portal do cliente.
- Unificar Appwrite schema academia↔agência além do necessário para copy/UX.

---

## Visão do menu global (alvo)

```
Dashboard
Clientes
Tarefas
Ocupação          ← P0 (hours-hub)
Biblioteca
Relatórios
Financeiro
─────────
Minha empresa     ← P0 (hub unificado)
Templates         (ou mover para Minha empresa → catálogo)
Configurações     (perfil pessoal; empresa vai para Minha empresa)
```

Agrupamento sugerido na sidebar (seções):

- **Operação:** Dashboard, Clientes, Tarefas, Ocupação  
- **Empresa:** Financeiro, Relatórios, Biblioteca, Minha empresa  
- **Sistema:** Templates (opcional), Configurações (perfil / notificações / integrações pessoais)

---

# P0 — Descoberta imediata (menu + hub)

**Meta:** o usuário encontra equipe, ocupação e identidade da agência sem saber URL.  
**Esforço relativo:** S–M  
**Risco:** baixo (rotas já existem)

## P0.1 — Expor Equipe e Ocupação no menu

### Comportamento

| Item | Rota | Label no menu | Ícone sugerido | Quem vê |
|------|------|---------------|----------------|---------|
| Ocupação | `/hours-hub` | **Ocupação** | `Clock` / `Timer` | owner, admin, team |
| Equipe | ver P0.2 | **Equipe** (aba ou deep link do hub) | `Users` | owner, admin (team: leitura se já permitido) |

### Implementação

1. Em `src/components/layout/ContextualSidebar.jsx` (bloco **global**, ~linhas do menu Dashboard…Templates):
   - Inserir item **Ocupação** → `createPageUrl('hours-hub')`, `isActive: currentPage === 'hours-hub'`.
   - Inserir item **Minha empresa** → ver P0.2 (não duplicar “Equipe” solto se o hub já tiver aba Equipe).
2. Marcar `hours-hub` / hub da empresa em `KNOWN_APP_SEGMENTS` / route registry se necessário para highlight.
3. Header (`ModernHeader.jsx`): manter atalho Equipe no dropdown **ou** apontar para a mesma rota do hub (evitar duas destinações diferentes).

### Aceite P0.1

- [x] Sidebar global mostra **Ocupação**; click abre `/hours-hub` funcional.
- [x] Item ativo destaca corretamente na rota.
- [x] Mobile / drawer usa os mesmos itens.
- [x] Shell de cliente **não** ganha esses itens (permanece no contexto do cliente).

---

## P0.2 — Hub “Minha empresa”

### Problema

Páginas sobrepostas / órfãs:

| Rota | Conteúdo aproximado | Problema |
|------|---------------------|----------|
| `/settings?tab=agency` | Nome, contato | Fragmentado |
| `/team-management` | Membros + convites | Só no dropdown do perfil |
| `/my-agency` | Nome + membros (thin) | Fora do menu |
| `/agency-management` | Identidade, branding, equipe | Fora do menu; overlap |

### Decisão de produto

**Uma rota canônica:** `/minha-empresa` (alias opcional: redirect de `/my-agency` e `/agency-management`).

Abas (query `?tab=`):

| Tab | Conteúdo | Fonte atual a consolidar |
|-----|----------|---------------------------|
| `geral` | Nome, contato, logo | `settings` agency + `agency-management` info |
| `equipe` | Membros, convites, papéis | `team-management` / `TeamMemberManagement` |
| `marca` | Cores / branding (se ainda usado) | `agency-management` branding |
| `preferencias` | Feature flags / categorias **operacionais da agência** (opcional nesta fase) | `settings-agency-features` — só link ou embed leve |

**Configurações (`/settings`)** passa a focar:

- Perfil do usuário  
- Notificações  
- Integrações pessoais / Drive  
- Aba Financeiro **config** (planos/bancos) — permanece até P1 limpar copy; link “Ver financeiro operacional → `/financeiro`”

### Implementação

1. Nova página `src/pages/minha-empresa.jsx` (ou renomear/expandir `my-agency.jsx`).
2. Registrar rota em `src/pages/index.jsx`: `/minha-empresa`, redirects:
   - `/my-agency` → `/minha-empresa?tab=equipe` (ou `geral`)
   - `/agency-management` → `/minha-empresa`
   - `/team-management` → `/minha-empresa?tab=equipe`
3. Reutilizar componentes existentes (`TeamMemberManagement`, forms de Agency) — **não** reescrever CRUD.
4. Sidebar: item **Minha empresa** → `/minha-empresa`.
5. Permissões: owner/admin editam; team vê equipe (read) se política atual permitir.
6. Atualizar links do header dropdown para a rota canônica.

### Aceite P0.2

- [x] Um único lugar no menu: **Minha empresa**.
- [x] Abas Geral + Equipe funcionais com dados reais.
- [x] Redirects das rotas antigas não quebram bookmarks.
- [x] `/settings` não é mais o único caminho para editar nome da agência (ou deixa de duplicar: preferir hub).
- [x] Sem regressão em convites / papéis.

### Fora de P0.2

- Redesign visual pesado do hub.  
- Migrar toda a aba Financeiro de Settings para cá (fica P1 se fizer sentido).

---

# P1 — Clareza da carteira + linguagem

**Meta:** visão de **carteira da empresa** + copy sem DNA de academia.  
**Esforço relativo:** M  
**Risco:** médio (nova superfície no dashboard / página)

## P1.1 — Painel portfolio (carteira)

### Problema

Dashboard responde “o que faço hoje?”; não responde “como está minha carteira?”.

### Decisão de UX

**Opção A (preferida):** seção nova no `/dashboard`, abaixo de “Em andamento” (ou substituindo lista longa de campanhas por resumo + link).  
**Opção B:** página `/carteira` ligada no menu Empresa.

Spec assume **Opção A** na home + link “Ver carteira completa” se a lista crescer (> N clientes).

### Conteúdo da linha por cliente (ativo)

| Coluna | Fonte | Notas |
|--------|-------|-------|
| Nome | `Client` | Link → `client-detail` |
| Status | `client.status` | ativo / pausado / etc. |
| Campanhas ativas | `deriveActiveCampaigns` (já no dashboard) | contagem ou “—” |
| Tarefas abertas | `Task` filtrado por `clientId` + status aberto | incluir badge atrasadas |
| Financeiro resumido | `agencyFinance` charges do mês (saldo aberto / em atraso) | falha silenciosa → “—” |
| CTA | Abrir hub | |

Ordenação default: atrasadas financeiras / tarefas atrasadas primeiro; depois nome.

Limites: carregar só clientes `ativo` (fallback: todos se lista vazia de ativos), top 12 + “Ver todos”.

### Implementação

1. Extrair helper `src/lib/buildAgencyPortfolioRows.js` (puro, testável) a partir dos dados já buscados no dashboard + charges leves.
2. UI: tabela compacta ou lista (padrão visual do dashboard atual — sem cards KPI genéricos).
3. Não bloquear home se financeiro falhar.
4. Empty: reutilizar setup steps existentes.

### Aceite P1.1

- [x] Na home, usuário vê overview da carteira sem abrir cada cliente.
- [x] Click no nome abre hub do cliente.
- [x] Contagens de tarefas coerentes com `/tasks-manager` (mesma regra de “aberta”).
- [x] Performance aceitável com dezenas de clientes (1–2 round-trips; sem N+1 óbvio).

### Fora de P1.1

- Planejamento multi-cliente (P2).  
- Gráficos de receita anuais.

---

## P1.2 — Limpar copy “academia” (financeiro / settings)

### Problema

Usuário da agência vê termos/layouts de “Minha academia”, `academyId` em UI, PlanSelect de academia — reduz confiança de que o módulo é da **empresa**.

### Escopo (UX / copy primeiro)

Arquivos prioritários (audit + replace user-facing):

- `src/lib/financeiroHubTabs.js`
- `src/components/finance/FinanceiroConfigTab.jsx` (+ layout `AcademyTabSettingsLayout` se só for wrapper visual — renomear ou trocar título)
- Strings em `terminologyData` / i18n relacionadas a academia no fluxo financeiro da agência
- Labels visíveis em PlanSelect / hubs usados por `/settings?tab=financeiro` e `/financeiro`

### Regras

| Em código (API/Appwrite) | Em UI |
|--------------------------|-------|
| Pode permanecer `academyId` como alias técnico de `agencyId` onde já mapeado | Sempre **Agência** / **Empresa** / **Minha empresa** |
| Stores `useLeadStore` | Não expor “academia” em labels; sync silencioso ok |

Glossário UI:

- Academia → **Agência**  
- Aluno / mensalidade escolar → só se feature existir; senão remover do fluxo agência  
- “Minha academia” → **Minha empresa** ou **Configurações financeiras**

### Aceite P1.2

- [x] Busca na UI (strings renderizadas no fluxo `/financeiro` + settings financeiro) sem “academia” / “Minha academia”.
- [x] Funcionalidade financeira inalterada (cobranças, caixa, DRE).
- [x] Documento curto em PR listando strings trocadas.

#### Strings trocadas (P1.2)

| Antes | Depois | Onde |
|-------|--------|------|
| Minha academia → Financeiro | Configurações → Financeiro | `PlanSelect.jsx`, comentários `financeiroHubTabs.js` |
| gravados na academia | gravados na agência | `FinanceSettingsBanksSection.jsx` |
| Padrão academia (UI / default novo) | Padrão agência (lookup aceita ambos) | fee receivers / migrate |
| Alunos vinculados… | Clientes já vinculados… | `FinanceiroConfigTab.jsx` |
| Academia não selecionada… | Agência não selecionada… | `errorMessages.js` |

### Fora de P1.2

- Renomear coleções Appwrite.  
- Remover código de leads academia (decisão P2).

---

# P2 — Expansão estratégica (decisão + opcional)

**Meta:** fechar buraco comercial **ou** integrar; opcionalmente panorama multi-cliente.  
**Esforço relativo:** L  
**Risco:** alto se reaproveitar Nave sem desenho

## P2.1 — Comercial: decisão obrigatória antes de código

### Opções (escolher **uma**)

| Opção | Descrição | Quando escolher |
|-------|-----------|-----------------|
| **A — CRM leve nativo** | Pipeline mínimo: Lead → Qualificação → Proposta → Fechado/Perdido; ao Fechado, CTA “Criar cliente” | Venda consultiva dentro do Evocto |
| **B — Integração externa** | Link/embed Pipedrive/HubSpot/Notion + webhook opcional “won → criar cliente” | Já usam CRM fora |
| **C — Adiar** | Documentar gap; só melhorar handoff Clients + Financeiro (upsell manual) | Foco continua 100% operação |

### Se Opção A (CRM leve) — escopo MVP

**Inclusões:**

- Coleção `agency_leads` (ou equivalente) com `agencyId`, status, contato, valor estimado, notas  
- Página `/comercial` no menu Empresa  
- Kanban ou lista por estágio  
- Ação “Converter em cliente” → cria `Client` + opcional tarefa interna de onboarding  

**Exclusões:**

- Reusar UI/rotas de `/pipeline` `/alunos` `/inbox` de academia sem auditoria  
- Proposta PDF complexa / assinatura digital (fase seguinte)  
- Automação WhatsApp de vendas (já há DNA academia — não misturar)

### Aceite P2.1

- [x] Decisão A/B/C registrada nesta spec (checkbox abaixo) e no changelog de produto.  
- [x] Se A: `/comercial` no menu; converter lead → cliente funciona.  
- [ ] Se B: doc de integração + deep link na Minha empresa / Clientes.  
- [ ] Se C: issue “não fazer” com data de revisão.

**Decisão:** [x] A · [ ] B · [ ] C · Data: 2026-10-15 · Quem: produto (chat)

#### Provisionamento Appwrite — tabela `agency_leads`

Criar tabela `agency_leads` no database Evocto (row security / perms `users` como demais tabelas), com:

| Coluna | Tipo | Notas |
|--------|------|--------|
| `agencyId` | string | indexado |
| `name` | string | contato |
| `email` | string | opcional |
| `phone` | string | opcional |
| `status` | string | `lead` \| `qualificacao` \| `proposta` \| `fechado` \| `perdido` |
| `convertedClientId` | string | opcional |
| `payload` | string | JSON: `companyName`, `estimatedValue`, `notes`, etc. |

Código: `AgencyLead` em `tableMap` / `entities.js`; UI em `src/pages/comercial.jsx`.

---

## P2.2 — Panorama multi-cliente (opcional)

### Problema

Planejamento (`/planejamento?clientId=`) é poderoso **por cliente**; dono da agência não vê “quem está sem campanha no mês” sem entrar um a um. P1.1 cobre parte disso.

### Escopo (só se P1.1 não bastar)

Página `/panorama-carteira` ou aba no portfolio:

- Grade mês atual × clientes ativos  
- Célula: vazio / planejado / em execução / concluído (reutilizar status de campanha do Planejamento iterativo)  
- Click → Panorama daquele cliente (`buildAnnualPlanHref(clientId)`)

### Regras

- **Não** criar campanha em lote nesta fase (há `Planejar Múltiplos` **dentro** do cliente).  
- Read-only + navegação.  
- Alinhado a `docs/SPEC_PLANEJAMENTO_ITERATIVO.md` (Panorama Anual = home de planejamento **do cliente**).

### Aceite P2.2

- [ ] Usuário vê status de planejamento do mês para N clientes numa tela.  
- [ ] Click abre planejamento do cliente correto.  
- [ ] Sem create cross-client nesta fase.

**Decisão de fazer P2.2:** [ ] Sim · [x] Não (P1.1 Carteira suficiente) · Data: 2026-10-15

---

## Ordem de execução

```
P0.1 Menu Ocupação
P0.2 Hub Minha empresa + redirects + menu
──── ship P0 ────
P1.1 Portfolio na home
P1.2 Copy academia → agência
──── ship P1 ────
P2.1 Decisão comercial → implementação da opção
P2.2 Panorama multi-cliente (se aprovado)
```

Dependências:

- P0.2 não depende de P0.1 (podem ir em paralelo).  
- P1.1 beneficia de dados já no dashboard; independente de P0.  
- P1.2 independente; pode paralelizar com P1.1.  
- P2.2 idealmente depois de P1.1 (evitar duas visões de carteira divergentes).

---

## Arquivos-chave

| Área | Paths |
|------|--------|
| Nav live | `src/components/layout/ContextualSidebar.jsx`, `ModernHeader.jsx` |
| Rotas | `src/pages/index.jsx`, `Layout.jsx` (segments) |
| Ocupação | `src/pages/hours-hub.jsx`, `src/lib/hoursHubCore.js` |
| Equipe / agência | `src/pages/team-management.jsx`, `my-agency.jsx`, `agency-management.jsx`, `settings.jsx`, `components/team/*` |
| Home / portfolio | `src/pages/dashboard.jsx`, `hooks/useClientHubData` (`deriveActiveCampaigns`) |
| Financeiro | `src/pages/agency-finance.jsx`, `lib/agencyFinance/*`, `components/finance/FinanceiroConfigTab.jsx`, `lib/financeiroHubTabs.js` |
| Planejamento | `src/pages/planejamento.jsx`, `docs/SPEC_PLANEJAMENTO_ITERATIVO.md` |

## Relação com outras specs

| Spec | Relação |
|------|---------|
| `SPEC_CAMPANHA_*` / Hub·Workspace | **Não alterar** portas de create; portfolio só navega |
| `SPEC_PLANEJAMENTO_ITERATIVO` | P2.2 é read-only sobre o modelo atual |
| `SPEC_CORRECAO_APPWRITE_SCHEMA` | P1.2 é copy; schema alias academyId permanece até outra iniciativa |

---

## Critério de sucesso (produto)

Depois de P0+P1, um owner consegue responder sem “hackear URL”:

1. O que a equipe está fazendo hoje e quem está sobrecarregado?  
2. Como está o caixa / a receber da **minha** empresa?  
3. Onde configuro equipe e identidade da agência?  
4. Como vai a carteira de clientes (saúde operacional + sinal financeiro)?

Depois de P2 (se A ou B):  

5. Onde está o comercial / pipeline (nativo ou externo)?

---

## Changelog desta spec

| Data | Nota |
|------|------|
| 2026-10-15 | Versão inicial P0–P2 a partir da análise de controle da agência |
| 2026-10-15 | P0 implementado: menu Ocupação + hub `/minha-empresa` + redirects |
| 2026-10-15 | P1 implementado: Carteira na home + copy academia→agência |
| 2026-10-15 | P2.1 opção A: `/comercial` + AgencyLead + converter cliente; P2.2 adiado |
