# Projetos — arquitetura e implantação

## Hierarquia

```
Agência
└── Cliente (clients)
    └── Projeto (projects)                    ← novo
        ├── Serviço contratado (services.projectId)
        ├── Ciclo de planejamento (cycle_plans.projectId)
        ├── Campanha / briefing (briefs.projectId)
        └── Tarefa (tasks.projectId — obrigatório)
            └── Subtarefa (tasks.parentTaskId, mesmo projectId da mãe)
```

Tarefas internas (sem cliente) ficam no projeto **"Interno da agência"** (`clientId = null`).

### Tabela `projects`

| coluna      | tipo    | observação                                             |
|-------------|---------|--------------------------------------------------------|
| agencyId    | varchar |                                                        |
| clientId    | varchar | `null` = projeto interno da agência                    |
| name        | varchar |                                                        |
| status      | varchar | `ativo` · `pausado` · `concluido` · `arquivado`        |
| kind        | varchar | `service` · `general` · `internal` · `campaign` · `custom` |
| serviceId   | varchar | projeto que nasceu de um serviço contratado            |
| isDefault   | boolean | projeto "Geral" do cliente / "Interno" da agência      |
| payload     | text    | demais campos (descrição etc.)                         |

## Atribuição automática

`src/lib/projects/projectAssignment.js` é registrado como hook do `entityAdapter`.
Toda criação/edição de tarefa, ciclo ou briefing que chega sem `projectId` herda o projeto nesta ordem:

1. tarefa-mãe → 2. ciclo → 3. campanha/briefing → 4. serviço → 5. projeto "Geral" do cliente → 6. "Interno da agência".

Um serviço contratado novo (não-template) cria o próprio projeto com o nome do serviço.
Tarefa sem projeto resolvido é rejeitada.

## Legado: `projectId` = clientId

Em `briefs`, o `projectId` guardava o **clientId**. Leitores passaram a usar `clientId`;
gravadores antigos que ainda mandam `projectId: clientId` são corrigidos pelo hook
(`isLegacyClientProjectId`). Em `learning_entries`, o `projectId` continua significando
cliente e **não** faz parte deste modelo.

## Implantação (ordem importa)

1. Provisionar schema (idempotente):
   ```bash
   npm run appwrite:setup-projects
   ```
2. Publicar o front. Enquanto a coluna não existe, o adapter grava `projectId` no
   payload e filtra no cliente, então nada quebra se a ordem inverter.
3. Simular a migração (não grava):
   ```bash
   npm run appwrite:migrate-projects
   ```
4. Aplicar:
   ```bash
   npm run appwrite:migrate-projects -- --apply
   ```
   Uma agência só: `-- --apply --agency=<agencyId>`. Pode rodar de novo sem duplicar.

## Telas

- **Cliente** (`client-detail`): seção *Projetos* com progresso e "Novo projeto".
- **Projeto** (`project-detail?projectId=`): tarefas em árvore com subtarefas, status,
  renomear, serviços, ciclos e campanhas do projeto.
- **Nova tarefa**: seletor de projeto (ou automático); também cria subtarefa.
- **Painel da tarefa**: link para o projeto.
- **Dashboard**: *Projetos recentes* agrupa pela atividade da equipe por projeto.
