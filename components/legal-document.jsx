import React from 'react';
import ReactMarkdown from 'react-markdown';

// Clause component
export const Clause = ({ number, children, id, isHighlighted }) => {
  const ref = React.useRef(null);
  
  React.useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);
  
  return (
    <div 
      ref={ref}
      id={id}
      style={{ 
        display: 'flex', 
        marginBottom: '1.2em',
        lineHeight: '1.6',
        color: '#333',
        padding: isHighlighted ? '0.5rem' : '0',
        borderRadius: isHighlighted ? '6px' : '0',
        background: isHighlighted ? '#fff3cd' : 'transparent',
        border: isHighlighted ? '2px solid #ffc107' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ 
        width: '3.5em', 
        fontWeight: '600',
        fontSize: '0.95rem',
        color: '#555',
        flexShrink: 0
      }}>
        {number}
      </div>
      <div style={{ 
        flex: 1,
        fontSize: '0.95rem'
      }}>
        <ReactMarkdown>{children}</ReactMarkdown>
      </div>
    </div>
  );
};

// SectionTitle component
export const SectionTitle = ({ number, children, id, isHighlighted }) => {
  const ref = React.useRef(null);
  
  React.useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);
  
  return (
    <div 
      ref={ref}
      id={id}
      style={{ 
        display: 'flex', 
        alignItems: 'baseline', 
        marginBottom: '1.5em', 
        marginTop: '1em',
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: '0.5em',
        padding: isHighlighted ? '0.5rem' : '0',
        borderRadius: isHighlighted ? '6px' : '0',
        background: isHighlighted ? '#fff3cd' : 'transparent',
        border: isHighlighted ? '2px solid #ffc107' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ 
        width: '3.5em', 
        fontWeight: 'bold',
        fontSize: '1rem',
        color: '#333',
        flexShrink: 0
      }}>
        {number}
      </div>
      <div style={{ 
        flex: 1, 
        fontWeight: 'bold', 
        textTransform: 'uppercase',
        fontSize: '1.1rem',
        color: '#222',
        letterSpacing: '0.5px'
      }}>
        {children}
      </div>
    </div>
  );
};

// SubClause component for nested clauses
export const SubClause = ({ number, children, id, isHighlighted }) => {
  const ref = React.useRef(null);
  
  React.useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);
  
  return (
    <div 
      ref={ref}
      id={id}
      style={{ 
        display: 'flex', 
        marginBottom: '1em',
        marginLeft: '2.5em',
        lineHeight: '1.6',
        color: '#444',
        padding: isHighlighted ? '0.5rem' : '0',
        borderRadius: isHighlighted ? '6px' : '0',
        background: isHighlighted ? '#fff3cd' : 'transparent',
        border: isHighlighted ? '2px solid #ffc107' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ 
        width: '3em', 
        fontWeight: '500',
        fontSize: '0.9rem',
        color: '#666',
        flexShrink: 0
      }}>
        {number}
      </div>
      <div style={{ 
        flex: 1,
        fontSize: '0.9rem'
      }}>
        <ReactMarkdown>{children}</ReactMarkdown>
      </div>
    </div>
  );
};

// DocumentTitle component
export const DocumentTitle = ({ children, id, isHighlighted }) => {
  const ref = React.useRef(null);
  
  React.useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);
  
  return (
    <h1 
      ref={ref}
      id={id}
      style={{
        fontSize: '1.8rem',
        fontWeight: 'bold',
        color: '#222',
        marginBottom: '2rem',
        textAlign: 'center',
        borderBottom: '2px solid #007bff',
        paddingBottom: '1rem',
        padding: isHighlighted ? '0.5rem' : '0',
        borderRadius: isHighlighted ? '6px' : '0',
        background: isHighlighted ? '#fff3cd' : 'transparent',
        border: isHighlighted ? '2px solid #ffc107' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {children}
    </h1>
  );
};

// Parties component for employer/employee info
export const Parties = ({ employer, employee, position, effectiveDate, id, isHighlighted }) => {
  const ref = React.useRef(null);
  
  React.useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);
  
  return (
    <div 
      ref={ref}
      id={id}
      style={{
        background: '#f8f9fa',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        marginBottom: '2rem',
        padding: isHighlighted ? '1.5rem' : '1.5rem',
        borderRadius: isHighlighted ? '8px' : '8px',
        background: isHighlighted ? '#fff3cd' : '#f8f9fa',
        border: isHighlighted ? '2px solid #ffc107' : '1px solid #e9ecef',
        transition: 'all 0.3s ease'
      }}
    >
      <h3 style={{
        fontSize: '1.2rem',
        fontWeight: '600',
        marginBottom: '1rem',
        color: '#333'
      }}>
        Parties and Position
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        fontSize: '0.95rem',
        lineHeight: '1.5'
      }}>
        <div>
          <strong>Employer:</strong> {employer}
        </div>
        <div>
          <strong>Employee:</strong> {employee}
        </div>
        <div>
          <strong>Position:</strong> {position}
        </div>
        <div>
          <strong>Effective Date:</strong> {effectiveDate}
        </div>
      </div>
    </div>
  );
};

// Notice component for important notices
export const Notice = ({ children, id, isHighlighted }) => {
  const ref = React.useRef(null);
  
  React.useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);
  
  return (
    <div 
      ref={ref}
      id={id}
      style={{
        background: isHighlighted ? '#fff8e1' : '#fff3cd',
        border: isHighlighted ? '2px solid #ffc107' : '1px solid #ffeaa7',
        borderRadius: '6px',
        padding: '1rem',
        margin: '1.5rem 0',
        fontSize: '0.9rem',
        color: '#856404',
        transition: 'all 0.3s ease'
      }}
    >
      <strong>Notice:</strong> {children}
    </div>
  );
}; 