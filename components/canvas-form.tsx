import React, { useState, useRef, useEffect } from 'react';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'date' | 'email' | 'phone' | 'address';
  required?: boolean;
}

interface CanvasFormProps {
  formId: string;
  fields: any[];
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
  isCanvasMode?: boolean;
  onFormValuesChange?: (values: Record<string, string>) => void;
  onSendChatMessage?: (msg: string) => void;
  firstForm?: boolean;
}

// Validation functions
const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

const validatePhone = (phone: string): string | null => {
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    return 'Please enter a valid phone number (at least 10 digits)';
  }
  return null;
};

const validateAddress = (address: string): string | null => {
  if (address.length < 5) {
    return 'Please enter a complete address';
  }
  return null;
};

// Address autocomplete component
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic25lemhhZGkiLCJhIjoiY21kajJkM29hMGh4YTJwcHo4Nzl6cHdxNCJ9.T1euYvErK0gitHzrix4WHQ';
const AddressAutocomplete: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string) => void;
  isUserEditing?: boolean;
}> = ({ value, onChange, onSelect, isUserEditing }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const justSelected = useRef(false);

  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    if (!isUserEditing || value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Fetch suggestions from Mapbox
    const fetchSuggestions = async () => {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        value
      )}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.features) {
          setSuggestions(data.features.map((f: any) => f.place_name));
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [value, isUserEditing]);

  const handleSelect = (suggestion: string) => {
    justSelected.current = true;
    setShowSuggestions(false);
    onSelect(suggestion);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '0.5rem',
          border: '1px solid #ccc',
          borderRadius: 6,
          fontSize: 16,
          width: '100%',
        }}
        placeholder="Enter your address"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: 6,
          maxHeight: 200,
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSelect(suggestion)}
              style={{
                padding: '0.5rem',
                cursor: 'pointer',
                borderBottom: '1px solid #eee',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function CanvasForm({
  formId,
  fields,
  onSubmit,
  onCancel,
  isCanvasMode = false,
  onFormValuesChange,
  room, // <-- add this prop
  onSendChatMessage,
  firstForm = false,
}: CanvasFormProps & { room?: any }) {
  console.log('[CanvasForm] fields prop:', fields);
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (!fields || !Array.isArray(fields)) return {};
    return Object.fromEntries(fields.map(f => [f.name, f.value ?? '']));
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Track agent-initiated updates to prevent cycles
  const lastAgentUpdate = useRef<{ [field: string]: number }>({});
  // Track which field is being edited by the user
  const [userEditingField, setUserEditingField] = useState<string | null>(null);

  // Sync local values state with fields prop when fields change (for agent updates)
  useEffect(() => {
    if (!fields || !Array.isArray(fields)) return;
    setValues(prev => {
      const newValues = { ...prev };
      let changed = false;
      fields.forEach(f => {
        if (f.value !== undefined && f.value !== prev[f.name]) {
          newValues[f.name] = f.value;
          changed = true;
          // Mark this field as agent-updated
          lastAgentUpdate.current[f.name] = Date.now();
          // If agent updated, clear user editing state for this field
          setUserEditingField(field => (field === f.name ? null : field));
        }
      });
      return changed ? newValues : prev;
    });
  }, [fields]);

  // Movable overlay state
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; mouseX: number; mouseY: number } | null>(null);

  // Only enable dragging in overlay mode
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCanvasMode) return;
    setDragging(true);
    dragStart.current = {
      x: pos.x,
      y: pos.y,
      mouseX: e.clientX,
      mouseY: e.clientY,
    };
    document.body.style.userSelect = 'none';
  };
  const handleMouseUp = () => {
    if (isCanvasMode) return;
    setDragging(false);
    dragStart.current = null;
    document.body.style.userSelect = '';
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (isCanvasMode || !dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.mouseX;
    const dy = e.clientY - dragStart.current.mouseY;
    setPos({ x: dragStart.current.x + dx, y: dragStart.current.y + dy });
  };
  React.useEffect(() => {
    if (isCanvasMode) return;
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, isCanvasMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate all fields on submit
    const newErrors: Record<string, string> = {};
    fields.forEach(field => {
      const value = values[field.name] || '';
      const error = validateField(field.name, value, field);
      if (error) {
        newErrors[field.name] = error;
      }
    });
    setErrors(newErrors);

    console.log('Form submit attempt:', { errors: newErrors, values });
    if (Object.keys(newErrors).length === 0) {
      // Previous logic:
      // const fieldMap = fields.reduce((acc, f) => { acc[f.name] = f.label; return acc; }, {});
      // const formatted = Object.entries(values)
      //   .map(([k, v]) => `${fieldMap[k] || k}=${v}`)
      //   .join('\n');
      // onSendChatMessage && onSendChatMessage(formatted);
      // New logic: send 'Move to next step' message in chat
      onSendChatMessage && onSendChatMessage('I have filled the form and ready to go to the next step');
    } else {
      console.log('Form has errors, not submitting:', newErrors);
    }
  };

  // Handle form value changes and notify agent
  const handleValueChange = (fieldName: string, value: string) => {
    setUserEditingField(fieldName); // Mark this field as being edited by the user
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    // Validate field on frontend
    const field = fields.find(f => f.name === fieldName);
    const fieldError = validateField(fieldName, value, field);
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: fieldError
    }));
    
    // Only send update if not just updated by agent (cycle prevention)
    const now = Date.now();
    if (!lastAgentUpdate.current[fieldName] || now - lastAgentUpdate.current[fieldName] > 500) {
      const payload = { form_id: formId, values: { ...values, [fieldName]: value }, type: 'form_values_update' };
      // Log the outgoing form_values_update and room state
      console.log('[Frontend] About to publishData. Room state:', room?.state || 'unknown');
      console.log('[Frontend] Sending form_values_update:', payload);
      if (room && room.localParticipant) {
        room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify(payload)),
          { reliable: true }
        );
        console.log('[Frontend] publishData called');
      } else {
        onFormValuesChange?.({ ...values, [fieldName]: value });
      }
    }
  };

  // Frontend validation
  const validateField = (fieldName: string, value: string, field: any): string => {
    if (field.required && !value.trim()) {
      return `${field.label} is required`;
    }

    // Special case for address: show error if not empty but too short
    if (field.type === 'address' && value.trim() && value.length < 10) {
      return 'Please enter a complete address';
    }

    if (value.trim()) {
      switch (field.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
          }
          break;
        case 'phone':
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
            return 'Please enter a valid phone number';
          }
          break;
      }
    }

    return '';
  };

  const renderField = (field: any) => {
    const commonProps = {
      id: field.name,
      name: field.name,
      value: values[field.name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleValueChange(field.name, e.target.value),
      required: field.required,
      style: {
        width: '100%',
        padding: '0.75rem',
        border: `1px solid ${errors[field.name] ? '#ff4444' : '#ddd'}`,
        borderRadius: 6,
        fontSize: 16,
        background: '#fff',
      },
    };

    // Don't render if fields is not properly defined
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          color: '#666',
          fontSize: '1.1rem'
        }}>
          No form fields defined
        </div>
      );
    }

    switch (field.type) {
      case 'email':
        return <input {...commonProps} type="email" placeholder="Enter your email" />;
      case 'phone':
        return <input {...commonProps} type="tel" placeholder="Enter your phone number" />;
      case 'address':
        return (
          <AddressAutocomplete
            value={values[field.name]}
            onChange={(value) => handleValueChange(field.name, value)}
            onSelect={(address) => handleValueChange(field.name, address)}
            isUserEditing={userEditingField === field.name}
          />
        );
      case 'date':
        return <input {...commonProps} type="date" />;
      case 'selectable_table':
        return (
          <div style={{ width: '100%' }}>
            <h3 style={{ 
              textAlign: 'center', 
              marginBottom: '1rem', 
              fontSize: '1.25rem', 
              fontWeight: 600,
              color: '#333'
            }}>
              {field.title || 'Select an Option'}
            </h3>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #e0e0e0',
              borderRadius: 6,
              overflow: 'hidden',
            }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid #e0e0e0', fontWeight: 600, width: '40px' }}>
                    Select
                  </th>
                  {field.columns?.map((column: any, index: number) => (
                    <th key={index} style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid #e0e0e0', fontWeight: 600 }}>
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {field.options?.map((option: any, index: number) => (
                  <tr 
                    key={option.value}
                    style={{
                      background: selectedOptions[field.name] === option.value ? '#e3f2fd' : '#fff',
                      cursor: option.disabled ? 'not-allowed' : 'pointer',
                      opacity: option.disabled ? 0.5 : 1,
                    }}
                    onClick={() => {
                      if (!option.disabled) {
                        const newSelected = { ...selectedOptions, [field.name]: option.value };
                        setSelectedOptions(newSelected);
                        handleValueChange(field.name, option.value);
                      }
                    }}
                  >
                    <td style={{ padding: '0.75rem', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                      <input
                        type="radio"
                        name={field.name}
                        value={option.value}
                        checked={selectedOptions[field.name] === option.value}
                        disabled={option.disabled}
                        onChange={() => {
                          if (!option.disabled) {
                            const newSelected = { ...selectedOptions, [field.name]: option.value };
                            setSelectedOptions(newSelected);
                            handleValueChange(field.name, option.value);
                          }
                        }}
                        style={{
                          cursor: option.disabled ? 'not-allowed' : 'pointer',
                        }}
                      />
                    </td>
                    {field.columns?.map((column: any, colIndex: number) => (
                      <td key={colIndex} style={{ 
                        padding: '0.75rem', 
                        border: '1px solid #e0e0e0',
                        fontWeight: column.key === 'label' ? 500 : 'normal',
                        textAlign: column.align || 'left'
                      }}>
                        {option[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return <input {...commonProps} type="text" placeholder={`Enter your ${field.label.toLowerCase()}`} />;
    }
  };

  const formContent = (
    <form
      id={formId}
      onSubmit={handleSubmit}
      style={{
        ...(isCanvasMode ? {
          width: '100%',
          maxWidth: fields.some(f => f.type === 'selectable_table') ? 'none' : '500px',
          margin: '0 auto',
          padding: '1rem',
        } : {
          background: '#fff',
          borderRadius: 12,
          minWidth: 320,
          maxWidth: 400,
          padding: '2rem',
          boxShadow: '0 4px 32px rgba(0,0,0,0.15)',
        }),
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        position: 'relative',
        ...(isCanvasMode ? {} : { left: pos.x, top: pos.y }),
        cursor: dragging ? 'move' : 'default',
      }}
    >
      {!isCanvasMode && (
        <div
          style={{
            margin: '-2rem -2rem 1.5rem -2rem',
            padding: '1rem 2rem',
            background: '#f5f5f5',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            cursor: 'move',
            fontWeight: 600,
            fontSize: 18,
            userSelect: 'none',
          }}
          onMouseDown={handleMouseDown}
        >
          Please fill out this form
        </div>
      )}
      {fields.map(field => (
        <div key={field.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {field.type !== 'selectable_table' && (
            <label htmlFor={field.name} style={{ 
              fontWeight: 500,
              fontSize: isCanvasMode ? '0.875rem' : '0.875rem',
              color: isCanvasMode ? '#333' : '#000',
            }}>
              {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
            </label>
          )}
          {renderField(field)}
          {errors[field.name] && (
            <span style={{ 
              color: '#ff4444', 
              fontSize: isCanvasMode ? '0.75rem' : '13px',
              marginTop: '0.25rem',
            }}>{errors[field.name]}</span>
          )}
        </div>
      ))}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        marginTop: isCanvasMode ? '1.5rem' : '12px',
        justifyContent: 'space-between',
      }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={firstForm}
          style={{
            padding: isCanvasMode ? '0.5rem 1rem' : '0.5rem 1rem',
            minWidth: isCanvasMode ? '80px' : '80px',
            background: firstForm ? '#f0f0f0' : '#fff',
            color: firstForm ? '#888' : '#222',
            border: '1px solid #ccc',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: isCanvasMode ? '0.875rem' : '14px',
            cursor: firstForm ? 'not-allowed' : 'pointer',
            textAlign: 'center',
            height: '36px',
            boxSizing: 'border-box',
          }}
        >
          {'<Back'}
        </button>
        <button
          type="submit"
          style={{
            padding: isCanvasMode ? '0.5rem 1rem' : '0.5rem 1rem',
            minWidth: isCanvasMode ? '80px' : '80px',
            background: '#222',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: isCanvasMode ? '0.875rem' : '14px',
            cursor: 'pointer',
            textAlign: 'center',
            height: '36px',
            boxSizing: 'border-box',
          }}
        >
          Next &gt;
        </button>
      </div>
    </form>
  );

  return (
    isCanvasMode ? (
      formContent
    ) : (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.3)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}>
        {formContent}
      </div>
    )
  );
}; 