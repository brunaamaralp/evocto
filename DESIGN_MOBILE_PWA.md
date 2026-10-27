# Mobile & PWA — shell narrativa

Documento alinhado ao shell atual (`ContextualLayout` + `MobileBottomNav` + Vite PWA). Não descreve um “Task Manager” fictício.

## Breakpoints

| Faixa | Uso no shell |
|-------|----------------|
| `< lg` (1024px) | Bottom nav, `ShellBackButton`, hamburger só em páginas imersivas |
| `md` (768px) | Breadcrumbs / busca no header |
| `sm` (640px) | Empilhamento de headers e grids |

## Shell mobile

- **Voltar:** `ShellBackButton` no header (`history` → pai contextual). Botões `ArrowLeft` de página usam `.page-back-btn` (só desktop).
- **Menu completo:** item **Mais** na bottom nav (hamburger no header só em brainstorm / delivery-workspace).
- **Safe area:** `viewport-fit=cover` em `index.html`; `.shell-header-safe`, bottom nav e `.fixed-footer-above-nav` / `.above-mobile-bottom-nav` em `index.css`.
- **Touch:** preferir `.touch-target` (min 44×44) nos controles do chrome.

## PWA

- Manifest: `public/manifest.json`
- Service worker: `virtual:pwa-register` em `src/main.jsx` (produção)
- Ícones: `/icons/*`

## Utilitários

Ativos em `src/index.css` (`.shell-header-safe`, `.touch-target`, `.page-back-btn`, offsets da bottom nav).
`Button` default/icon: min 44px; `sm`: min 40px.
