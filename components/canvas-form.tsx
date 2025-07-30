import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FormFieldEditor } from './form-field-editor';
import { cn } from '@/lib/utils';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'date' | 'email' | 'phone' | 'address' | 'textarea';
  width?: 'full' | 'half' | 'third' | 'quarter' | 'two-thirds' | 'three-quarters';
  rows?: number;
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
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full dark:!bg-[#161616] rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring focus-visible:ring-gray-500 transition-all delay-150 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Enter your address"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md max-h-48 overflow-y-auto z-[1000] shadow-lg">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSelect(suggestion)}
              className="px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
  const [showEditor, setShowEditor] = useState(false);
  const [editableFields, setEditableFields] = useState<FormField[]>(fields || []);

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

  // Update editable fields when fields prop changes
  useEffect(() => {
    if (fields && Array.isArray(fields)) {
      setEditableFields(fields);
    }
  }, [fields]);

  // Editor functions
  const handleFieldsChange = (newFields: FormField[]) => {
    setEditableFields(newFields);
    // Update values state to match new fields
    const newValues: Record<string, string> = {};
    newFields.forEach(field => {
      newValues[field.name] = values[field.name] || '';
    });
    setValues(newValues);
  };

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
      value: values[field.name] || "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        handleValueChange(field.name, e.target.value),
      required: field.required,
      className: `flex h-10 w-full dark:!bg-[#161616] rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring focus-visible:ring-gray-500 transition-all delay-150 disabled:cursor-not-allowed disabled:opacity-50 ${
        errors[field.name] ? "border-red-500 dark:border-red-400 focus-visible:ring-red-500" : ""
      }`,
    };

    switch (field.type) {
      case 'email':
        return <input {...commonProps} type="email" placeholder="Enter your email" />;
      case 'phone':
        return <input {...commonProps} type="tel" placeholder="Enter your phone number" />;
      case 'textarea':
        const textareaRows = field.rows || 3;
        return (
          <textarea
            {...commonProps}
            rows={textareaRows}
            placeholder={`Enter your ${field.label.toLowerCase()}`}
            className={`${commonProps.className} resize-none`}
            style={{ minHeight: `${textareaRows * 2.5}rem` }}
          />
        );
      case 'text':
        return <input {...commonProps} type="text" placeholder={`Enter your ${field.label.toLowerCase()}`} />;
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
        return (
          <div className="relative">
            <input
              {...commonProps}
              type="date"
              className={`${commonProps.className} pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 dark:[&::-webkit-calendar-picker-indicator]:invert`}
            />
          </div>
        );
      case 'selectable_table':
        return (
          <div className="w-full">
            <h3 className="text-center mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
              {field.title || 'Select an Option'}
            </h3>
            <table className="selectable-table w-full border-collapse border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="p-3 text-center border border-gray-300 dark:border-gray-600 font-semibold text-gray-800 dark:text-gray-200 w-10">
                    Select
                  </th>
                  {field.columns?.map((column: any, index: number) => (
                    <th key={index} className="p-3 text-center border border-gray-300 dark:border-gray-600 font-semibold text-gray-800 dark:text-gray-200">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {field.options?.map((option: any, index: number) => (
                  <tr
                    key={option.value}
                    className={cn(
                      "transition-colors duration-200",
                      selectedOptions[field.name] === option.value
                        ? "bg-blue-50 dark:bg-blue-900/30"
                        : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700",
                      option.disabled
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                    )}
                    onClick={() => {
                      if (!option.disabled) {
                        const newSelected = { ...selectedOptions, [field.name]: option.value };
                        setSelectedOptions(newSelected);
                        handleValueChange(field.name, option.value);
                      }
                    }}
                  >
                    <td className="p-3 border border-gray-300 dark:border-gray-600 text-center">
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
                        className={cn(
                          "w-4 h-4",
                          option.disabled ? "cursor-not-allowed" : "cursor-pointer"
                        )}
                      />
                    </td>
                    {field.columns?.map((column: any, colIndex: number) => (
                      <td
                        key={colIndex}
                        className={cn(
                          "p-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200",
                          column.key === 'label' ? "font-medium" : "font-normal",
                          column.align === 'center' ? "text-center" :
                          column.align === 'right' ? "text-right" : "text-left"
                        )}
                      >
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

  const formContent = (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="w-full max-w-full h-full"
    >
      {/* Form element for submission */}
      <div
        className={`relative z-10 overflow-hidden border h-full dark:border-[#3d3d3e] border-gray-300
     backdrop-blur-lg bg-white dark:bg-[#262626f0]
         rounded-md shadow-lg p-6 space-y-6
          ${isCanvasMode ? "mx-auto" : ""}
        `}
        style={isCanvasMode ? {} : { transform: `translate(${pos.x}px, ${pos.y}px)` }}
      >

        <div className="absolute right-[-25px] dark:right-0 bottom-[-30px] z-10 dark:opacity-40 opacity-90 w-[30rem] h-[20rem]">
          <img src="/1.svg" className="dark:block hidden" />
          <img src="/2.svg" className="block dark:hidden" />
        </div>
        <div className="absolute right-0 bottom-[-20px] z-10 w-full h-[20rem]">
          <div className="absolute w-full h-[30rem] bg-gradient-to-br
        dark:from-[#262626] dark:via-[#262626] dark:to-[#262626]/10 from-white via-white to-white/30 z-40">
          </div>
        </div>

        <div className="bg-gradient-to-br
        from-[#dadada] via-white to-white h-48
        dark:from-[#e43b3b36] dark:via-[#262626f0] dark:to-[#262626f0]
         dark:bg-gray-800/20 absolute inset-0 z-1"></div>
        <div className="flex mb-6 border-b pb-6 dark:border-gray-300/30 items-center justify-between relative z-[60]">
          <div className="flex items-center gap-x-5">
            <div className="dark:bg-[#3e3f40] bg-[#3c3c3c] w-12 h-12 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 text-white" viewBox="0 0 20 20">
                <path fill="currentColor" d="M5.75 3h8.5A2.75 2.75 0 0 1 17 5.75v3.651a3 3 0 0 0-1-.36V5.75A1.75 1.75 0 0 0 14.25 4h-8.5A1.75 1.75 0 0 0 4 5.75v8.5c0 .966.784 1.75 1.75 1.75h5.3q-.05.243-.05.5q0 .25.038.5H5.75A2.75 2.75 0 0 1 3 14.25v-8.5A2.75 2.75 0 0 1 5.75 3m3.75 7h3.764a3 3 0 0 0-.593 1H9.5a.5.5 0 0 1 0-1m0 3h3.17c.132.373.336.711.594 1H9.5a.5.5 0 0 1 0-1m-2-5.75a.75.75 0 1 1-1.5 0a.75.75 0 0 1 1.5 0M6.75 11a.75.75 0 1 0 0-1.5a.75.75 0 0 0 0 1.5m0 3a.75.75 0 1 0 0-1.5a.75.75 0 0 0 0 1.5M9.5 7a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1zm8 5a2 2 0 1 1-4 0a2 2 0 0 1 4 0m1.5 4.5c0 1.245-1 2.5-3.5 2.5S12 17.75 12 16.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5"/>
                </svg>
            </div>
            <div>
              <div className="font-bold dark:text-gray-200 text-gray-700 text-lg">Personal Information</div>
              <div className="dark:text-gray-400 text-gray-600">Enter the personal information here</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditor(true)}
            className="text-xs"
          >
            ⚙️ Edit Form
          </Button>
        </div>
        {!isCanvasMode && (
          <div
            className="absolute -top-0 -left-0 -right-0 bg-gray-100 dark:bg-gray-700/50 rounded-t-xl py-4 px-8 cursor-move font-semibold text-lg text-gray-800 dark:text-gray-200"
            onMouseDown={handleMouseDown}
          >
            <h2 className="text-center text-lg font-semibold">Please fill out this form</h2>
          </div>
        )}
        <div className={`form-grid grid grid-cols-12 relative z-[60] gap-6 ${!isCanvasMode ? "mt-16" : ""}`}>
          {/* Add margin-top when not in canvas mode to account for header */}
          {editableFields.map((field) => {
            // Calculate column span based on field width property
            const getColSpan = (width: string | number | undefined) => {
              if (!width) return 'col-span-6'; // default half width
              if (typeof width === 'number') return `col-span-${Math.min(12, Math.max(1, width))}`;
              switch (width) {
                case 'full': return 'col-span-12';
                case 'half': return 'col-span-6';
                case 'third': return 'col-span-4';
                case 'quarter': return 'col-span-3';
                case 'two-thirds': return 'col-span-8';
                case 'three-quarters': return 'col-span-9';
                default: return 'col-span-6';
              }
            };

            // Calculate row span for textarea-style inputs
            const getRowSpan = (rows: number | undefined) => {
              if (!rows || rows <= 1) return '';
              return `row-span-${Math.min(6, Math.max(1, rows))}`;
            };

            const colSpan = getColSpan(field.width);
            const rowSpan = getRowSpan(field.rows);

            // For selectable_table, default to full width if no width specified
            const finalColSpan = field.type === 'selectable_table' && !field.width ? 'col-span-12' : colSpan;

            return (
              <div key={field.name} className={`${finalColSpan} ${rowSpan}`}>
                {field.type !== 'selectable_table' && (
                  <label htmlFor={field.name} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {field.label} {field.required && <span className="text-red-500 dark:text-red-400">*</span>}
                  </label>
                )}
                {renderField(field)}
                {errors[field.name] && <span className="dark:text-red-400 text-red-500 text-sm mt-1">{errors[field.name]}</span>}
              </div>
            );
          })}
        </div>
        <div className="flex w-full gap-4 pt-0 relative justify-between z-[60] mt-5">
          <div className="flex justify-end space-x-2 w-full">
            <Button
              type="button"
              onClick={onCancel}
              disabled={firstForm}
              variant="outline"
              size="lg"
              className="px-8 rounded-md"
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="px-8  rounded-md"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </form>
  );

  return isCanvasMode ? (
    <>
      {formContent}
      {showEditor && (
        <FormFieldEditor
          fields={editableFields}
          onFieldsChange={handleFieldsChange}
          onClose={() => setShowEditor(false)}
        />
      )}
    </>
  ) : (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 overflow-hidden
        bg-gradient-to-br from-gray-900 to-black dark:from-gray-950 dark:to-black
        before:content-[''] before:absolute before:inset-0 before:bg-[url('/noise.svg')] before:bg-repeat before:opacity-[0.03] before:pointer-events-none
      "
    >
      {/* Blurred circles */}
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="animate-blob animation-delay-2000 absolute -top-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 opacity-50 mix-blend-multiply blur-3xl filter"></div>
      <div className="animate-blob animation-delay-4000 absolute -right-10 -bottom-10 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500 to-green-500 opacity-50 mix-blend-multiply blur-3xl filter"></div>
      {formContent}
      {showEditor && (
        <FormFieldEditor
          fields={editableFields}
          onFieldsChange={handleFieldsChange}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
};