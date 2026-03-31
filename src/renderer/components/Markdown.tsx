import React from 'react';

/**
 * Lightweight markdown renderer for chat messages.
 * Supports: bold, italic, code, code blocks, headers, lists, links, line breaks.
 * No external dependencies.
 */

interface Props {
  content: string;
  style?: React.CSSProperties;
}

export function Markdown({ content, style }: Props) {
  const blocks = parseBlocks(content);
  return (
    <div style={{ ...baseStyle, ...style }}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}

type Block =
  | { type: 'paragraph'; content: string }
  | { type: 'heading'; level: number; content: string }
  | { type: 'code-block'; language: string; content: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; alignments: ('left' | 'center' | 'right')[]; rows: string[][] }
  | { type: 'hr' };

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code-block', language: lang, content: codeLines.join('\n') });
      i++; // skip closing ```
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2] });
      i++;
      continue;
    }

    // HR
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Table: line with pipes, followed by separator row (|---|---|)
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*[-:]+[-|\s:]+\s*\|?\s*$/.test(lines[i + 1])) {
      const parseRow = (row: string) => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
      const headers = parseRow(line);
      const sepCells = parseRow(lines[i + 1]);
      const alignments = sepCells.map(c => {
        if (c.startsWith(':') && c.endsWith(':')) return 'center' as const;
        if (c.endsWith(':')) return 'right' as const;
        return 'left' as const;
      });
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', headers, alignments, rows });
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*+]\s/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    // Ordered list
    if (/^[\s]*\d+[.)]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*\d+[.)]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*\d+[.)]\s/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-special lines
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].trimStart().startsWith('```') &&
      !lines[i].match(/^#{1,4}\s/) && !/^[\s]*[-*+]\s/.test(lines[i]) && !/^[\s]*\d+[.)]\s/.test(lines[i]) &&
      !/^[-*_]{3,}\s*$/.test(lines[i].trim())) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', content: paraLines.join('\n') });
    }
  }

  return blocks;
}

function renderBlock(block: Block, key: number): React.ReactNode {
  switch (block.type) {
    case 'heading':
      const fontSize = block.level === 1 ? 18 : block.level === 2 ? 16 : block.level === 3 ? 14 : 13;
      return (
        <div key={key} style={{ fontSize, fontWeight: 600, margin: '12px 0 6px 0', lineHeight: 1.4 }}>
          {renderInline(block.content)}
        </div>
      );
    case 'code-block':
      return (
        <pre key={key} style={codeBlockStyle}>
          <code>{block.content}</code>
        </pre>
      );
    case 'list':
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag key={key} style={{ margin: '6px 0', paddingLeft: 20, lineHeight: 1.7 }}>
          {block.items.map((item, j) => (
            <li key={j} style={{ fontSize: 14 }}>{renderInline(item)}</li>
          ))}
        </Tag>
      );
    case 'table':
      return (
        <div key={key} style={{ overflowX: 'auto', margin: '8px 0' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {block.headers.map((h, j) => (
                  <th key={j} style={{ ...thStyle, textAlign: block.alignments[j] || 'left' }}>{renderInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} style={ri % 2 === 1 ? trAltStyle : undefined}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ ...tdStyle, textAlign: block.alignments[ci] || 'left' }}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'hr':
      return <hr key={key} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />;
    case 'paragraph':
      return (
        <p key={key} style={{ fontSize: 14, lineHeight: 1.7, margin: '6px 0', wordBreak: 'break-word' }}>
          {renderInline(block.content)}
        </p>
      );
  }
}

function renderInline(text: string): React.ReactNode {
  // Process inline markdown: bold, italic, code, links
  const parts: React.ReactNode[] = [];
  // Regex to match inline elements
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // Inline code
      parts.push(<code key={match.index} style={inlineCodeStyle}>{match[1].slice(1, -1)}</code>);
    } else if (match[2]) {
      // Bold **text**
      parts.push(<strong key={match.index}>{match[2].slice(2, -2)}</strong>);
    } else if (match[3]) {
      // Bold __text__
      parts.push(<strong key={match.index}>{match[3].slice(2, -2)}</strong>);
    } else if (match[4]) {
      // Italic *text*
      parts.push(<em key={match.index}>{match[4].slice(1, -1)}</em>);
    } else if (match[5]) {
      // Italic _text_
      parts.push(<em key={match.index}>{match[5].slice(1, -1)}</em>);
    } else if (match[6]) {
      // Link [text](url)
      parts.push(
        <a key={match.index} href={match[8]} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{match[7]}</a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

const baseStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.7,
};

const codeBlockStyle: React.CSSProperties = {
  background: 'var(--bg, #1a1a1d)',
  border: '1px solid var(--border, #333)',
  borderRadius: 8,
  padding: '12px 16px',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
  overflowX: 'auto',
  margin: '8px 0',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
  lineHeight: 1.5,
};

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontWeight: 600,
  borderBottom: '2px solid var(--border, #333)',
  background: 'var(--bg, #1a1a1d)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderBottom: '1px solid var(--border, #333)',
};

const trAltStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
};

const inlineCodeStyle: React.CSSProperties = {
  background: 'var(--bg, #1a1a1d)',
  border: '1px solid var(--border, #333)',
  borderRadius: 4,
  padding: '1px 5px',
  fontSize: '0.9em',
  fontFamily: 'var(--font-mono)',
};
