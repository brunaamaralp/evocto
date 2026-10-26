# Skill — Kit de marca Narrativa

Pacote Anthropic Agent Skill com identidade visual do Estúdio Narrativa.

## Conteúdo

```
narrativa-marca/
├── SKILL.md
├── README.md
├── assets/          # logos, isotipo rr, fundo
└── fonts/           # Archivo ExtraBold + Manrope
```

Origem dos assets: `Kit de marca Narrativa (para a skill).zip` + fontes Archivo/Manrope.

## Publicar na Anthropic

1. Compacte a pasta `narrativa-marca` (com `SKILL.md` na raiz da pasta).
2. Upload: Console Anthropic → Skills, ou:

```bash
curl -X POST "https://api.anthropic.com/v1/skills" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -F "display_title=Narrativa Marca" \
  -F "files[]=@narrativa-marca.zip"
```

(Ou envie os arquivos individualmente com paths relativos.)

3. Copie o `skill_id` (`skill_…`) e no ambiente do Evocto:

```bash
ANTHROPIC_SKILL_MARCA_ID=skill_xxx
ANTHROPIC_SKILL_MARCA_TYPE=custom
ANTHROPIC_SKILL_MARCA_VERSION=latest
```

O runtime anexa esta skill **junto** com `docx` / `pptx` na geração de material.

## Limite

Upload total &lt; 30 MB (uncompressed). Este kit fica ~3 MB com assets otimizados.
