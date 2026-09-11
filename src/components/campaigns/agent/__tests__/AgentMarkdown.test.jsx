import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AgentMarkdown from '../AgentMarkdown.jsx';

describe('AgentMarkdown', () => {
  it('renderiza negrito e título sem asteriscos literais', () => {
    const html = renderToStaticMarkup(
      <AgentMarkdown content={'### 3. **Beirute como estrela**\n\nTexto **negrito** aqui.'} />
    );
    expect(html).toContain('<strong>');
    expect(html).toContain('Beirute como estrela');
    expect(html).not.toContain('**Beirute');
    expect(html).not.toContain('###');
  });

  it('renderiza regra horizontal', () => {
    const html = renderToStaticMarkup(
      <AgentMarkdown content={'Antes\n\n---\n\nDepois'} />
    );
    expect(html).toContain('<hr');
    expect(html).not.toContain('---');
  });

  it('não interpreta markdown em mensagens do usuário', () => {
    const html = renderToStaticMarkup(
      <AgentMarkdown content="**não negrito**" isUser />
    );
    expect(html).toContain('**não negrito**');
    expect(html).not.toContain('<strong>');
  });
});
