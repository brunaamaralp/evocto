# Skill custom Evocto (fase 2)

Template para upload na Anthropic Skills API. O runtime do app já lê:

| Variável | Efeito |
|----------|--------|
| `ANTHROPIC_SKILL_PROPOSTA_ID` | skill_id para propostas (default `docx`) |
| `ANTHROPIC_SKILL_PROPOSTA_TYPE` | `anthropic` ou `custom` |
| `ANTHROPIC_SKILL_APRESENTACAO_ID` | skill_id para apresentações (default `pptx`) |
| `ANTHROPIC_SKILL_APRESENTACAO_TYPE` | `anthropic` ou `custom` |
| `ANTHROPIC_SKILL_*_VERSION` | versão (default `latest`) |
| `ANTHROPIC_SKILL_PROPOSTA_FORMAT` | `pdf` para forçar PDF em vez de DOCX |
| `ANTHROPIC_SKILL_MARCA_ID` | skill custom do kit Narrativa (`skills/narrativa-marca`) |
| `ANTHROPIC_SKILL_MARCA_TYPE` | `custom` |
| `ANTHROPIC_SKILL_MARCA_VERSION` | versão (default `latest`) |

Kit de marca: ver [`../narrativa-marca/`](../narrativa-marca/).

Ver [SKILL.md](./SKILL.md) e a doc oficial: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
