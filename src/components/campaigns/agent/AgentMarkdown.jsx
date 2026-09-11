/**
 * Renderização leve de markdown para bolhas do agente.
 * Cobre o que o brainstorm costuma emitir: negrito, títulos, hr, listas.
 */

import { Fragment } from 'react';

function renderInline(text, keyPrefix = 'i') {
  if (!text) return null;
  const nodes = [];
  const re = /(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g;
  let last = 0;
  let match;
  let idx = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t-${idx}`}>
          {text.slice(last, match.index)}
        </Fragment>
      );
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${idx}`}>{token.slice(2, -2)}</strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={`${keyPrefix}-e-${idx}`}>{token.slice(1, -1)}</em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${idx}`}
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: '0.92em',
            background: 'rgba(0,0,0,0.06)',
            padding: '0.05em 0.35em',
            borderRadius: 4,
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    last = match.index + token.length;
    idx += 1;
  }

  if (last < text.length) {
    nodes.push(
      <Fragment key={`${keyPrefix}-t-end`}>{text.slice(last)}</Fragment>
    );
  }

  return nodes.length ? nodes : text;
}

function headingStyle(level) {
  const sizes = { 1: 18, 2: 16, 3: 15, 4: 14 };
  return {
    margin: '0.65em 0 0.35em',
    fontSize: sizes[level] || 14,
    fontWeight: 700,
    lineHeight: 1.35,
  };
}

/**
 * @param {{ content: string, isUser?: boolean }} props
 */
export default function AgentMarkdown({ content, isUser = false }) {
  const raw = String(content || '');
  if (!raw.trim()) return null;

  if (isUser) {
    return (
      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {raw}
      </span>
    );
  }

  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let listBuf = [];
  let paraBuf = [];

  const flushList = () => {
    if (!listBuf.length) return;
    blocks.push({ type: 'ul', items: listBuf.slice() });
    listBuf = [];
  };

  const flushPara = () => {
    if (!paraBuf.length) return;
    blocks.push({ type: 'p', text: paraBuf.join('\n') });
    paraBuf = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      flushPara();
      continue;
    }
    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      flushList();
      flushPara();
      blocks.push({ type: 'hr' });
      continue;
    }
    const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushList();
      flushPara();
      blocks.push({
        type: 'h',
        level: heading[1].length,
        text: heading[2],
      });
      continue;
    }
    const bullet = /^[-*•]\s+(.+)$/.exec(trimmed);
    if (bullet) {
      flushPara();
      listBuf.push(bullet[1]);
      continue;
    }
    const numbered = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (numbered) {
      flushPara();
      listBuf.push(numbered[1]);
      continue;
    }
    flushList();
    paraBuf.push(line);
  }
  flushList();
  flushPara();

  return (
    <div style={{ wordBreak: 'break-word' }}>
      {blocks.map((block, i) => {
        if (block.type === 'hr') {
          return (
            <hr
              key={`hr-${i}`}
              style={{
                border: 0,
                borderTop: '1px solid rgba(0,0,0,0.12)',
                margin: '0.75em 0',
              }}
            />
          );
        }
        if (block.type === 'h') {
          const Tag = `h${Math.min(4, block.level)}`;
          return (
            <Tag key={`h-${i}`} style={headingStyle(block.level)}>
              {renderInline(block.text, `h${i}`)}
            </Tag>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul
              key={`ul-${i}`}
              style={{
                margin: '0.4em 0 0.55em',
                paddingLeft: '1.25em',
              }}
            >
              {block.items.map((item, j) => (
                <li key={`li-${i}-${j}`} style={{ marginBottom: 4 }}>
                  {renderInline(item, `li${i}-${j}`)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p
            key={`p-${i}`}
            style={{
              margin: i === 0 ? '0 0 0.55em' : '0.55em 0',
              whiteSpace: 'pre-wrap',
            }}
          >
            {renderInline(block.text, `p${i}`)}
          </p>
        );
      })}
    </div>
  );
}
