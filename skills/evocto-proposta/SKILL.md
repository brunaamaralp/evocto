---
name: evocto-proposta
description: >
  Gera propostas comerciais e apresentações no padrão Evocto (agência).
  Use quando o usuário pedir proposta, pitch deck, apresentação comercial
  ou material comercial a partir de briefing de cliente.
---

# Skill Evocto — Proposta / Apresentação

## Quando usar

- Proposta comercial em DOCX/PDF
- Apresentação comercial em PPTX
- Material alinhado ao DNA do cliente (público, tom, produtos, restrições)

## Estrutura da proposta

1. Capa (agência, cliente, data, título)
2. Contexto e desafio
3. Diagnóstico / entendimento
4. Solução e escopo
5. Metodologia (breve)
6. Investimento e condições
7. Prazo e próximos passos
8. Contato

## Estrutura da apresentação (6–10 slides)

Capa → Agenda → Desafio → Oportunidade → Solução → Escopo → Cronograma → Investimento → Próximos passos → Encerramento

## Regras de marca

- Português do Brasil, tom profissional e claro
- Não inventar métricas ou cases
- Respeitar `tom_brand` e `restricoes_criativas` do briefing
- Se investimento/prazo faltarem, usar placeholders `[INVESTIMENTO]` / `[PRAZO]`
- Visual da agência: use a skill **`narrativa-marca`** (kit de marca Estúdio Narrativa) quando estiver no container — cores, tipografia Archivo/Manrope e logos em `assets/`

## Como publicar na Anthropic

1. Compacte esta pasta (`SKILL.md` + recursos opcionais) conforme a Skills API
2. Faça upload via Console Anthropic ou `POST /v1/skills`
3. Copie o `skill_id` gerado (`skill_…`)
4. No ambiente do Evocto, defina:

```bash
ANTHROPIC_SKILL_PROPOSTA_ID=skill_xxx
ANTHROPIC_SKILL_PROPOSTA_TYPE=custom
ANTHROPIC_SKILL_APRESENTACAO_ID=skill_xxx   # ou skill separada para pptx
ANTHROPIC_SKILL_APRESENTACAO_TYPE=custom
```

Sem essas variáveis, o MVP usa as skills Anthropic built-in (`docx` / `pptx`).
