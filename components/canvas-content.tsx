import React from 'react';
import ReactMarkdown from 'react-markdown';
import { MDXProvider } from '@mdx-js/react';
import CanvasForm from './canvas-form';
import {
  Clause,
  SectionTitle,
  SubClause,
  DocumentTitle,
  Parties,
  Notice
} from './legal-document';

// MDX components mapping
const mdxComponents = {
  Clause,
  SectionTitle,
  SubClause,
  DocumentTitle,
  Parties,
  Notice,
  // Standard HTML elements
  h1: (props: any) => <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem', color: '#222' }} {...props} />,
  h2: (props: any) => <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.8rem', marginTop: '1.5rem', color: '#333' }} {...props} />,
  h3: (props: any) => <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.6rem', marginTop: '1.2rem', color: '#444' }} {...props} />,
  p: (props: any) => <p style={{ marginBottom: '1rem', lineHeight: '1.6', color: '#333' }} {...props} />,
  ul: (props: any) => <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }} {...props} />,
  li: (props: any) => <li style={{ marginBottom: '0.5rem', lineHeight: '1.5' }} {...props} />,
  strong: (props: any) => <strong style={{ fontWeight: '600', color: '#222' }} {...props} />,
  em: (props: any) => <em style={{ fontStyle: 'italic', color: '#555' }} {...props} />,
};

// Custom MDX-like parser for our JSX components
const parseCustomMDX = (content: string, highlightedId: string | null = null) => {
  const components: React.ReactNode[] = [];
  let currentIndex = 0;
  
  // Simple regex patterns for our components (ordered by specificity)
  const patterns = [
    {
      name: 'DocumentTitle',
      regex: /<DocumentTitle\s+id="([^"]*)"\s*>\s*([\s\S]*?)\s*<\/DocumentTitle>/g,
      component: DocumentTitle
    },
    {
      name: 'Parties',
      regex: /<Parties\s+([^>]*)\s*\/>/g,
      component: Parties
    },
    {
      name: 'SectionTitle',
      regex: /<SectionTitle\s+number="([^"]*)"\s+id="([^"]*)"\s*>\s*([\s\S]*?)\s*<\/SectionTitle>/g,
      component: SectionTitle
    },
    {
      name: 'SubClause',
      regex: /<SubClause\s+number="([^"]*)"\s+id="([^"]*)"\s*>\s*([\s\S]*?)\s*<\/SubClause>/g,
      component: SubClause
    },
    {
      name: 'Clause',
      regex: /<Clause\s+number="([^"]*)"\s+id="([^"]*)"\s*>\s*([\s\S]*?)\s*<\/Clause>/g,
      component: Clause
    },
    {
      name: 'Notice',
      regex: /<Notice\s+id="([^"]*)"\s*>\s*([\s\S]*?)\s*<\/Notice>/g,
      component: Notice
    }
  ];

  // Find all matches across all patterns first
  const allMatches: Array<{
    pattern: any;
    match: RegExpMatchArray;
    fullMatch: string;
    startIndex: number;
    endIndex: number;
  }> = [];

  for (const pattern of patterns) {
    const matches = [...content.matchAll(pattern.regex)];
    for (const match of matches) {
      const fullMatch = match[0];
      const startIndex = match.index!;
      const endIndex = startIndex + fullMatch.length;
      
      allMatches.push({
        pattern,
        match,
        fullMatch,
        startIndex,
        endIndex
      });
    }
  }

  // Sort matches by start position
  allMatches.sort((a, b) => a.startIndex - b.startIndex);

  let lastIndex = 0;

  // Process matches in order
  for (const { pattern, match, fullMatch, startIndex, endIndex } of allMatches) {
    // Add text before the match
    if (startIndex > lastIndex) {
      const textBefore = content.substring(lastIndex, startIndex);
      if (textBefore.trim()) {
        components.push(
          <ReactMarkdown key={`text-${currentIndex++}`}>
            {textBefore}
          </ReactMarkdown>
        );
      }
    }
    
    // Add the component
    let props: any = {};
    let children: React.ReactNode = null;
    
    if (pattern.name === 'Parties') {
      // Parse attributes for Parties component
      const attrMatch = match[1].match(/(\w+)="([^"]*)"/g);
      if (attrMatch) {
        attrMatch.forEach(attr => {
          const [key, value] = attr.split('=');
          props[key] = value.replace(/"/g, '');
        });
      }
      children = null; // Parties is self-closing
    } else if (pattern.name === 'DocumentTitle') {
      props.id = match[1];
      children = match[2];
    } else if (pattern.name === 'SectionTitle' || pattern.name === 'Clause' || pattern.name === 'SubClause') {
      props.number = match[1];
      props.id = match[2];
      children = match[3];
    } else if (pattern.name === 'Notice') {
      props.id = match[1];
      children = match[2];
    } else {
      children = match[1];
    }
    
    // Add highlighting props
    props.isHighlighted = highlightedId === props.id;
    
    const Component = pattern.component;
    components.push(
      <Component key={`${pattern.name}-${currentIndex++}`} {...props}>
        {children}
      </Component>
    );
    
    lastIndex = endIndex;
  }
  
  // Add any remaining text
  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex);
    if (remainingText.trim()) {
      components.push(
        <ReactMarkdown key={`text-${currentIndex++}`}>
          {remainingText}
        </ReactMarkdown>
      );
    }
  }
  
  return components;
};

interface CanvasContentProps {
  type: 'form' | 'table' | 'bullet_points' | 'image' | 'contract_section' | 'markdown' | 'default';
  data: any;
  onFormSubmit?: (values: Record<string, string>) => void;
  onFormCancel?: () => void;
  onFormValuesChange?: (values: Record<string, string>) => void;
  room?: any;
  onSendChatMessage?: (msg: string) => void;
}

export const CanvasContent: React.FC<CanvasContentProps> = ({
  type,
  data,
  onFormSubmit,
  onFormCancel,
  onFormValuesChange,
  room,
  onSendChatMessage,
}) => {
  switch (type) {
    case 'form':
      // Check if form data is properly structured
      if (!data || !data.id || !Array.isArray(data.fields)) {
        return (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#666',
            fontSize: '1.1rem'
          }}>
            Invalid form data
          </div>
        );
      }
      
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          height: '100%',
          padding: '1.2rem 1rem',
          overflowY: 'auto',
        }}>
          <CanvasForm
            formId={data.id}
            fields={data.fields}
            onSubmit={onFormSubmit || (() => {})}
            onCancel={onFormCancel || (() => {})}
            isCanvasMode={true}
            onFormValuesChange={onFormValuesChange}
            room={room}
            onSendChatMessage={onSendChatMessage}
            firstForm={!!data.firstForm}
          />
        </div>
      );

    case 'table':
      return (
        <div style={{
          padding: '2rem',
          height: '100%',
          overflowY: 'auto',
        }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>
            {data.title || 'Data Table'}
          </h3>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #e0e0e0',
          }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                {data.headers?.map((header: string, index: number) => (
                  <th key={index} style={{
                    padding: '0.75rem',
                    textAlign: 'left',
                    border: '1px solid #e0e0e0',
                    fontWeight: 600,
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows?.map((row: any[], rowIndex: number) => (
                <tr key={rowIndex}>
                  {row.map((cell: any, cellIndex: number) => (
                    <td key={cellIndex} style={{
                      padding: '0.75rem',
                      border: '1px solid #e0e0e0',
                    }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'bullet_points':
      return (
        <div style={{
          padding: '2rem',
          height: '100%',
          overflowY: 'auto',
        }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>
            {data.title || 'Key Points'}
          </h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {data.points?.map((point: string, index: number) => (
              <li key={index} style={{
                padding: '0.5rem 0',
                borderBottom: index < data.points.length - 1 ? '1px solid #f0f0f0' : 'none',
                display: 'flex',
                alignItems: 'flex-start',
              }}>
                <span style={{
                  color: '#007bff',
                  marginRight: '0.75rem',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                }}>
                  •
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case 'image':
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          padding: '2rem',
        }}>
          <div style={{ textAlign: 'center' }}>
            <img 
              src={data.url} 
              alt={data.alt || 'Canvas Image'}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
            {data.caption && (
              <p style={{
                marginTop: '1rem',
                color: '#666',
                fontSize: '0.875rem',
              }}>
                {data.caption}
              </p>
            )}
          </div>
        </div>
      );

    case 'contract_section':
      return (
        <div style={{
          padding: '2rem',
          height: '100%',
          overflowY: 'auto',
        }}>
          <h3 style={{ 
            marginBottom: '1rem', 
            fontSize: '1.25rem', 
            fontWeight: 600,
            color: '#333',
          }}>
            {data.title || 'Contract Section'}
          </h3>
          <div style={{
            background: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
          }}>
            <div style={{
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
              color: '#333',
            }}>
              {data.content}
            </div>
            {data.highlights && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #dee2e6' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Key Points:
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  {data.highlights.map((highlight: string, index: number) => (
                    <li key={index} style={{ marginBottom: '0.25rem' }}>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );

    case 'markdown':
              // Check if content contains custom components to determine if we should show the title
        const hasCustomComponents = /<(DocumentTitle|Parties|SectionTitle|Clause|SubClause|Notice)/.test(data.markdown);
        
        // State for highlighted element ID
        const [highlightedId, setHighlightedId] = React.useState<string | null>(null);
        
        // Handle highlight updates from agent
        React.useEffect(() => {
          if (data.highlightId !== undefined) {
            console.log(`[Frontend] Setting highlightedId to: "${data.highlightId}"`);
            setHighlightedId(data.highlightId || null);
          }
        }, [data.highlightId]);
        
        return (
        <div style={{
          padding: '2rem',
          height: '100%',
          overflowY: 'auto',
        }}>
          {!hasCustomComponents && (
            <h3 style={{ 
              marginBottom: '1rem', 
              fontSize: '1.25rem', 
              fontWeight: 600,
              color: '#333',
            }}>
              {data.title || 'Markdown Content'}
            </h3>
          )}
          <div style={{
            background: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            lineHeight: '1.6',
            color: '#333',
          }}>
            {parseCustomMDX(data.markdown, highlightedId)}
          </div>
        </div>
      );

    case 'default':
      return null;

    default:
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          color: '#666',
          fontSize: '1.1rem'
        }}>
          Unknown Content Type
        </div>
      );
  }
}; 