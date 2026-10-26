---
name: narrativa-marca
description: >
  Aplica o kit de marca do Estúdio Narrativa em propostas, apresentações e
  materiais comerciais (DOCX/PPTX/PDF). Use sempre que gerar documento visual
  da agência Narrativa: cores, tipografia, logos e isotipo “rr”.
---

# Kit de marca — Estúdio Narrativa

Aplique estas diretrizes em **todo** material comercial gerado para a agência Narrativa.
Combine esta skill com as skills Anthropic `docx`, `pptx` ou `pdf` conforme o formato pedido.

## Identidade

- Nome da marca: **narrativa** (sempre minúsculas no logotipo)
- Posicionamento: estúdio de comunicação com estética tátil, artesanal e contemporânea
- Tom: claro, humano, direto — sem jargão vazio

## Cores oficiais

| Token | Hex | Uso |
|-------|-----|-----|
| `burnt grape` | `#C02807` | PRIMARY — logo, títulos, CTAs |
| `orange rosé` | `#FF643D` | SECONDARY — acentos e hover |
| `sky blue` | `#BBD9F4` | ACCENT — superfícies suaves, info |
| `cloud` | `#FFFCFC` | NEUTRAL — fundos e texto em fundo escuro |
| `preto` | `#1A0D0B` | Fundos profundos / sidebar |

Regras:

- Preferir **burnt grape + cloud** como base; orange rosé / sky blue só como acento
- Não introduzir roxo, azul-elétrico ou gradientes genéricos de SaaS
- Contraste mínimo legível: texto burnt grape em cloud, ou cloud/branco em burnt grape/preto

## Tipografia

Arquivos em `fonts/`:

| Uso | Fonte | Arquivo |
|-----|-------|---------|
| Display / títulos fortes | Archivo ExtraBold | `fonts/ArchivoExtraBold.ttf` |
| Corpo / UI | Manrope Regular | `fonts/Manrope-Regular.ttf` |
| Ênfase no corpo | Manrope Bold | `fonts/Manrope-Bold.ttf` |

Regras:

- Títulos: Archivo ExtraBold, tracking levemente negativo, preferir minúsculas em capas alinhadas ao logo
- Corpo: Manrope 10–12 pt (DOCX) / 16–20 pt (PPTX)
- Não substituir por Inter, Roboto, Arial ou Calibri quando as fontes do kit estiverem disponíveis

## Assets (pasta `assets/`)

| Arquivo | Uso |
|---------|-----|
| `logo_vinho.png` / `logo_vinho.svg` | Wordmark em fundo claro (creme/branco) |
| `logo_creme.png` / `logo_creme.svg` | Wordmark em fundo escuro (preto/vinho) |
| `isotipo_vinho.svg` | Marca “aspas” monocromática |
| `aspas_cereja.png` | Isotipo tátil em fundo burnt grape |
| `aspas_azul_claro.png` | Isotipo tátil em sky blue |
| `aspas_azul_jeans.png` | Isotipo tátil em azul jeans |
| `rr_laranja.png` | Isotipo tátil orange rosé |
| `rr_lima.png` | Isotipo tátil (legado) |
| `rr_brush.png` | Isotipo pincel seco |
| `rr_giz.png` | Isotipo giz / pastel |
| `fundo.jpg` | Textura de fundo (capa / slide de abertura) |

Regras de logo:

- Manter proporção; área de respiro ≥ altura do “n”
- Não distorcer, não contornar, não recolorir fora da paleta
- Em capa escura: `logo_creme` + opcional isotipo coral/lima
- Em capa clara: `logo_vinho` + opcional isotipo vinho

## Layout — proposta (DOCX/PDF)

1. Capa: fundo creme ou textura `fundo.jpg`; logo Narrativa; título do material; nome do cliente; data
2. Páginas internas: margens generosas; títulos em vinho; corpo em preto suave
3. Separadores ou destaques com linha fina vinho ou bloco coral discreto
4. Rodapé: wordmark pequeno + “Estúdio Narrativa” se couber
5. Encerramento: contato + logo

## Layout — apresentação (PPTX)

1. Slide de capa: fundo escuro ou `fundo.jpg`; `logo_creme`; título curto
2. Slides de conteúdo: fundo creme; títulos Archivo vinho; bullets Manrope
3. Slide de destaque: fundo vinho ou coral com tipografia creme (usar com parcimônia)
4. Encerramento: isotipo rr + contato

## Conteúdo

- Português do Brasil
- Não inventar métricas, cases ou números de resultado
- Respeitar `tom_brand` e `restricoes_criativas` do briefing do cliente
- Se investimento/prazo faltarem: placeholders `[INVESTIMENTO]` / `[PRAZO]`

## Checklist antes de entregar

- [ ] Logo correto para o fundo (vinho vs creme)
- [ ] Paleta só com tokens oficiais
- [ ] Fontes Archivo + Manrope aplicadas
- [ ] Isotipo rr sem distorção
- [ ] Sem cores/fontes genéricas fora do kit
