import React, { useRef, useState, useEffect } from 'react';
import type { AppConfig } from '@/lib/types';
import CanvasForm from './canvas-form';
import { CanvasContent } from './canvas-content';
import { AnimatePresence, motion } from 'motion/react';
import {
  type AgentState,
  type ReceivedChatMessage,
  useRoomContext,
  useVoiceAssistant,
} from '@livekit/components-react';
import { toastAlert } from '@/components/alert-toast';
import { AgentControlBar } from '@/components/livekit/agent-control-bar/agent-control-bar';
import { ChatEntry } from '@/components/livekit/chat/chat-entry';
import { ChatMessageView } from '@/components/livekit/chat/chat-message-view';
import { MediaTiles } from '@/components/livekit/media-tiles';
import useChatAndTranscription from '@/hooks/useChatAndTranscription';
import { useDebugMode } from '@/hooks/useDebug';
import { RoomEvent } from 'livekit-client';
import { cn } from '@/lib/utils';

interface CanvasViewProps {
  appConfig: AppConfig;
  disabled: boolean;
  sessionStarted: boolean;
}

function isAgentAvailable(agentState: AgentState) {
  return agentState == 'listening' || agentState == 'thinking' || agentState == 'speaking';
}

const CanvasView: React.FC<CanvasViewProps> = ({ 
  appConfig, 
  disabled, 
  sessionStarted, 
}) => {
  const [divider, setDivider] = useState(appConfig.hideCanvasInitially ? 1 : 0.4); // 1 = hidden, 0.4 = 60% right pane
  const dragging = useRef(false);
  const [testPanelOpen, setTestPanelOpen] = useState(false);

  // Calculate actual left section width in pixels (assuming 100vw container)
  const containerWidth = typeof window !== 'undefined' ? window.innerWidth : 1200; // fallback for SSR
  const leftSectionWidth = containerWidth * divider;

  // SessionView state and hooks
  const { state: agentState } = useVoiceAssistant();
  const [chatOpen, setChatOpen] = useState(false);
  const { messages, send } = useChatAndTranscription();
  const room = useRoomContext();
  const [activeForm, setActiveForm] = useState<null | { id: string; fields: any[] }>(null);
  const [canvasContent, setCanvasContent] = useState<{
    type: 'form' | 'table' | 'bullet_points' | 'image' | 'contract_section' | 'markdown';
    data: any;
  } | null>(null);



  useDebugMode();

  // Function to handle agent's form field updates
  function handleAgentFormUpdate(updates: { field_name: string; value: string; reason?: string }[]) {
    setActiveForm(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        fields: prev.fields.map(field => {
          const update = updates.find(u => u.field_name === field.name);
          // Only update if value is different
          if (update && update.value !== field.value) {
            return { ...field, value: update.value, agent_update: update.reason };
          }
          return field;
        })
      };
      return updated;
    });
  }

  // Handle form data received from agent
  useEffect(() => {
    if (!room) return;
    function handleDataReceived(payload: Uint8Array, participant: any, kind: any) {
      try {
        console.log('Received data message:', { payload, participant, kind });
        // Decode Uint8Array to string
        const decoder = new TextDecoder();
        const strData = decoder.decode(payload);
        console.log('Decoded data:', strData);
        
        const data = JSON.parse(strData);
        console.log('Parsed data:', data);
        
        // Debug: Log all data types received
        console.log('Data type received:', data?.type);
        
        if (data && data.type === 'form' && data.id && Array.isArray(data.fields)) {
          console.log('Setting active form:', data);
          setActiveForm({ id: data.id, fields: data.fields });
          if (divider === 1) {
            setDivider(0.4);
            console.log(`[Frontend] Clearing canvas content for form (divider was 1)`);
            setCanvasContent(null);
            setTimeout(() => {
              setCanvasContent({ type: 'form', data: { id: data.id, fields: data.fields } });
            }, 100);
          } else {
            setCanvasContent({ type: 'form', data: { id: data.id, fields: data.fields } });
          }
        } else if (data && data.type === 'canvas_content') {
          console.log('Setting canvas content:', data);
          console.log(`[Frontend] Canvas content type: ${data.content_type}`);
          console.log(`[Frontend] Current divider: ${divider}`);
          
          if (divider === 1) {
            setDivider(0.4);
            console.log(`[Frontend] Clearing canvas content for canvas_content (divider was 1)`);
            setCanvasContent(null);
            setTimeout(() => {
              console.log(`[Frontend] Setting canvas content after timeout:`, { type: data.content_type, data: data.content });
              setCanvasContent({ type: data.content_type, data: data.content });
              // If it's a form, also set the active form
              if (data.content_type === 'form') {
                setActiveForm({ id: data.content.id, fields: data.content.fields });
              }
            }, 100);
          } else {
            console.log(`[Frontend] Setting canvas content immediately:`, { type: data.content_type, data: data.content });
            setCanvasContent({ type: data.content_type, data: data.content });
            if (data.content_type === 'form') {
              setActiveForm({ id: data.content.id, fields: data.content.fields });
            }
          }
        } else if (data && data.type === 'form_field_updates' && data.form_id && Array.isArray(data.updates)) {
          // Update the form fields if the form_id matches the active form
          if (activeForm && activeForm.id === data.form_id) {
            handleAgentFormUpdate(data.updates);
          }
        } else if (data && data.type === 'form_values_request' && data.form_id) {
          // Agent requests current form values
          if (activeForm && activeForm.id === data.form_id) {
            // Gather current values from the form fields
            const values: Record<string, string> = {};
            activeForm.fields.forEach((field: any) => {
              values[field.name] = field.value || '';
            });
            const response = {
              type: 'form_values_update',
              form_id: activeForm.id,
              values
            };
            const payload = new TextEncoder().encode(JSON.stringify(response));
            room.localParticipant?.publishData(payload, { reliable: true });
          }
        } else if (data && data.type === 'highlight_update' && data.highlightId !== undefined) {
          // Agent wants to highlight a specific component
          console.log(`[Frontend] Received highlight_update: ${data.highlightId}`);
          console.log(`[Frontend] Current canvasContent:`, canvasContent);
          console.log(`[Frontend] All canvas content types:`, ['form', 'table', 'bullet_points', 'image', 'contract_section', 'markdown']);
          
          if (canvasContent && canvasContent.type === 'markdown') {
            const newData = {
              ...canvasContent.data,
              highlightId: data.highlightId
            };
            setCanvasContent({ ...canvasContent, data: newData });
            console.log(`[Frontend] Updated canvasContent with highlightId: ${data.highlightId}`);
          } else {
            console.log(`[Frontend] Cannot highlight - no markdown content or wrong type:`, canvasContent);
            // Let's check if there's any content at all
            console.log(`[Frontend] Available content types:`, Object.keys(data || {}));
            
            // If no markdown content is loaded, we might need to request it from the agent
            // For now, let's just log that we need the content to be loaded first
            console.log(`[Frontend] Need markdown content to be loaded before highlighting can work`);
          }
        }
      } catch (e) {
        console.error('Error handling data message:', e);
      }
    }
    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, divider, canvasContent]);

  function handleFormSubmit(values: Record<string, string>, fields?: any[]) {
    if (!room || !activeForm) return;
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'form_submission', id: activeForm.id, values })
    );
    room.localParticipant?.publishData(
      payload,
      { reliable: true }
    );
    // Add a chat message with the form results in label=value format
    const fieldMap = (fields || activeForm.fields).reduce((acc, f) => { acc[f.name] = f.label; return acc; }, {});
    const formatted = Object.entries(values)
      .map(([k, v]) => `${fieldMap[k] || k}=${v}`)
      .join('\n');
    send(formatted);
    setActiveForm(null);
    // Show summary table in right pane after submit
    setCanvasContent({
      type: 'table',
      data: {
        title: 'Form Submission Summary',
        headers: ['Field', 'Value'],
        rows: Object.entries(values).map(([k, v]) => [fieldMap[k] || k, v])
      }
    });
  }

  function handleFormCancel() {
    setActiveForm(null);
  }

  // Function to send form values to agent (for observation)
  function sendFormValuesToAgent(values: Record<string, string>) {
    if (!room || !activeForm) return;
    
    const payload = new TextEncoder().encode(
      JSON.stringify({ 
        type: 'form_values_update', 
        form_id: activeForm.id, 
        values 
      })
    );
    room.localParticipant?.publishData(payload, { reliable: true });
  }

  async function handleSendMessage(message: string) {
    await send(message);
  }

  useEffect(() => {
    if (sessionStarted) {
      const timeout = setTimeout(() => {
        if (!isAgentAvailable(agentState)) {
          const reason =
            agentState === 'connecting'
              ? 'Agent did not join the room. '
              : 'Agent connected but did not complete initializing. ';

          toastAlert({
            title: 'Session ended',
            description: (
              <p className="w-full">
                {reason}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://docs.livekit.io/agents/start/voice-ai/"
                  className="whitespace-nowrap underline"
                >
                  See quickstart guide
                </a>
                .
              </p>
            ),
          });
          room.disconnect();
        }
      }, 10_000);

      return () => clearTimeout(timeout);
    }
  }, [agentState, sessionStarted, room]);

  const { supportsChatInput, supportsVideoInput, supportsScreenShare } = appConfig;
  const capabilities = {
    supportsChatInput,
    supportsVideoInput,
    supportsScreenShare,
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseUp = () => {
    dragging.current = false;
    document.body.style.cursor = '';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return;
    const container = document.getElementById('canvas-view-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    setDivider(Math.max(0.15, Math.min(1, percent)));
  };

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => handleMouseMove(e);
    const handleMouseUpGlobal = () => handleMouseUp();

    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUpGlobal);

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, []);

  // Add this function to send a chat message
  const sendChatMessage = (msg: string) => {
    send(msg);
  };

  return (
    <div
      id="canvas-view-container"
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        paddingTop: '45px',
      }}
    >
      <div style={{ 
        width: `${divider * 100}%`, 
        minWidth: 200, 
        height: '100%', 
        overflow: 'hidden', 
        position: 'relative', 
        display: 'flex', 
        flexDirection: 'column',
        minHeight: 0,
        zIndex: 1
      }}>
        {/* Left pane - SessionView content */}
        <main
          inert={disabled}
          className="flex flex-col flex-1 h-full w-full bg-background px-6"
          style={{ minHeight: 0 }}
        >
          {/* Header/avatar section */}
          <div style={{ flex: '0 0 auto', minHeight: 96, paddingTop: 24, paddingBottom: 8 }}>
            <MediaTiles chatOpen={chatOpen} leftSectionWidth={leftSectionWidth} />
          </div>
          {/* Chat area */}
          <div className="scrollbar_fix" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflowY: 'auto' }}>
            <ChatMessageView
              className={cn(
                'mx-auto w-full max-w-2xl px-6 py-8 md:px-12 md:py-12 transition-[opacity,translate] duration-300 ease-out',
                chatOpen ? 'translate-y-0 opacity-100 delay-200' : 'translate-y-20 opacity-0'
              )}
            >
              <div className="space-y-3 whitespace-pre-wrap">
                <AnimatePresence>
                  {messages.map((message: ReceivedChatMessage) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 1, height: 'auto', translateY: 0.001 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                      <ChatEntry hideName key={message.id} entry={message} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ChatMessageView>
          </div>
          {/* Control bar */}
          <div style={{ flex: '0 0 auto', padding: '0.5rem 0 1.5rem 0' }}>
            <motion.div
              key="control-bar"
              initial={{ opacity: 0, translateY: '100%' }}
              animate={{
                opacity: sessionStarted ? 1 : 0,
                translateY: sessionStarted ? '0%' : '100%',
              }}
              transition={{ duration: 0.3, delay: sessionStarted ? 0.5 : 0, ease: 'easeOut' }}
            >
              <div className="relative z-10 mx-auto w-full max-w-2xl">
                {appConfig.isPreConnectBufferEnabled && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: sessionStarted && messages.length === 0 ? 1 : 0,
                      transition: {
                        ease: 'easeIn',
                        delay: messages.length > 0 ? 0 : 0.8,
                        duration: messages.length > 0 ? 0.2 : 0.5,
                      },
                    }}
                    aria-hidden={messages.length > 0}
                    className="absolute inset-x-0 -top-12 text-center pointer-events-none"
                  >
                    <p className="animate-text-shimmer inline-block !bg-clip-text text-sm font-semibold text-transparent">
                      Agent is listening, ask it a question
                    </p>
                  </motion.div>
                )}
                <AgentControlBar
                  capabilities={capabilities}
                  onChatOpenChange={setChatOpen}
                  onSendMessage={handleSendMessage}
                />
              </div>
            </motion.div>
          </div>
        </main>
      </div>
      <div className="dark:bg-transparent relative bg-[#f3f3f3]" style={{
        flex: 1,
        height: '100%',
        minWidth: 0,
        userSelect: dragging.current ? 'none' : 'auto'
      }}>
        {/* Canvas content or title */}
        {canvasContent ? (
          <CanvasContent
            type={canvasContent?.type || 'default'}
            data={{
              ...(canvasContent?.data || {}),
              ...(canvasContent?.type === 'form' && activeForm ? { fields: activeForm.fields } : {})
            }}
            onFormSubmit={handleFormSubmit}
            onFormCancel={handleFormCancel}
            onFormValuesChange={sendFormValuesToAgent}
            room={room}
            onSendChatMessage={sendChatMessage}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <h2 className="text-foreground" style={{ fontSize: '2rem', textAlign: 'center' }}>
              {appConfig.canvasTitle || ''}
            </h2>
          </div>
        )}
      </div>
      {/* Divider as overlay */}
      <div
        style={{
          position: 'absolute',
          left: `${divider * 100}%`,
          top: 0,
          width: 4,
          height: '100%',
          cursor: 'col-resize',
          background: 'transparent',
          zIndex: 1,
          transform: 'translateX(-50%)',
        }}
        onMouseDown={handleMouseDown}
      />
      {/* Visual divider line */}
      <div
        style={{
          position: 'absolute',
          left: `${divider * 100}%`,
          top: 0,
          width: dragging.current ? 3 : 1,
          height: '100%',
          zIndex: 5,
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          transition: 'width 0.2s ease, background-color 0.2s ease',
          backgroundColor: dragging.current ? '#ef4444' : undefined,
        }}
        className={!dragging.current ? 'bg-[#7c7c7c] dark:!bg-[#6f7b8d]' : ''}
      >
        {/* Three dots in the middle - always visible */}
        <div className="absolute top-[47%] left-1/2 flex translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
          <div
            className={`h-1 w-1 ml-0.5 rounded-full transition-colors duration-200 ease-in ${
              dragging.current ? 'bg-[#7c7c7c]' : 'bg-gray-400 dark:bg-gray-600'
            }`}
          />
          <div
            className={`h-1 w-1 ml-0.5 rounded-full transition-colors duration-200 ease-in ${
              dragging.current ? 'bg-[#7c7c7c]' : 'bg-gray-400 dark:bg-gray-600'
            }`}
          />
          <div
            className={`h-1 w-1 ml-0.5 rounded-full transition-colors duration-200 ease-in ${
              dragging.current ? 'bg-[#7c7c7c]' : 'bg-gray-400 dark:bg-gray-600'
            }`}
          />
        </div>
      </div>
      {/* Test buttons for different content types */}
      {sessionStarted && appConfig.debug && (
        <div style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 2000,
        }}>
          {/* Collapsible test panel */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '0.5rem',
          }}>
            {/* Test buttons - only show when expanded */}
            {testPanelOpen && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}>
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#222',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const testForm = {
                      id: 'test-form',
                      fields: [
                        { name: 'fullName', label: 'Full Name', type: 'text', required: true },
                        { name: 'email', label: 'Email', type: 'email', required: true },
                        { name: 'phone', label: 'Phone Number', type: 'phone', required: true },
                        { name: 'birthday', label: 'Birthday', type: 'date' },
                        { name: 'address', label: 'Address', type: 'address', required: true }
                      ]
                    };
                    setActiveForm(testForm);
                    if (divider === 1) {
                      setDivider(0.4);
                      setCanvasContent(null);
                      setTimeout(() => {
                        setCanvasContent({ type: 'form', data: testForm });
                      }, 100);
                    } else {
                      setCanvasContent({ type: 'form', data: testForm });
                    }
                  }}
                >
                  Test Form
                </button>
                
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const testTable = {
                      title: 'Contract Terms Comparison',
                      headers: ['Term', 'Current', 'Proposed', 'Status'],
                      rows: [
                        ['Payment Terms', 'Net 30', 'Net 45', 'Pending'],
                        ['Delivery Time', '2 weeks', '1 week', 'Approved'],
                        ['Warranty', '1 year', '2 years', 'Under Review'],
                        ['Price', '$10,000', '$9,500', 'Negotiated']
                      ]
                    };
                    if (divider === 1) {
                      setDivider(0.4);
                      setCanvasContent(null);
                      setTimeout(() => {
                        setCanvasContent({ type: 'table', data: testTable });
                      }, 100);
                    } else {
                      setCanvasContent({ type: 'table', data: testTable });
                    }
                  }}
                >
                  Test Table
                </button>
                
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const testBulletPoints = {
                      title: 'Key Contract Requirements',
                      points: [
                        'All deliverables must be completed within 30 days of project start',
                        'Payment schedule: 50% upfront, 50% upon completion',
                        'Intellectual property rights transfer to client upon final payment',
                        'Confidentiality clause applies to all project communications',
                        'Force majeure clause covers natural disasters and government actions'
                      ]
                    };
                    if (divider === 1) {
                      setDivider(0.4);
                      setCanvasContent(null);
                      setTimeout(() => {
                        setCanvasContent({ type: 'bullet_points', data: testBulletPoints });
                      }, 100);
                    } else {
                      setCanvasContent({ type: 'bullet_points', data: testBulletPoints });
                    }
                  }}
                >
                  Test Bullet Points
                </button>
                
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#ffc107',
                    color: '#000',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const testImage = {
                      url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop',
                      alt: 'Contract signing ceremony',
                      caption: 'Sample contract signing ceremony - for demonstration purposes only'
                    };
                    if (divider === 1) {
                      setDivider(0.4);
                      setCanvasContent(null);
                      setTimeout(() => {
                        setCanvasContent({ type: 'image', data: testImage });
                      }, 100);
                    } else {
                      setCanvasContent({ type: 'image', data: testImage });
                    }
                  }}
                >
                  Test Image
                </button>
                
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const testContractSection = {
                      title: 'Section 3: Payment Terms',
                      content: `3.1 Payment Schedule
 The Client shall pay the Contractor according to the following schedule:
 - 40% of the total contract value upon signing this agreement
 - 30% upon completion of Phase 1 deliverables
 - 30% upon final project completion and acceptance
 
 3.2 Payment Method
 All payments shall be made via bank transfer to the account specified in Schedule A. Payments are due within 15 days of invoice date.
 
 3.3 Late Payment
 Any payment not received within the specified timeframe shall incur a late fee of 1.5% per month on the outstanding balance.`,
                      highlights: [
                        'Payment schedule is clearly defined with specific percentages',
                        'Late payment penalties are explicitly stated',
                        'Payment method is specified as bank transfer'
                      ]
                    };
                    if (divider === 1) {
                      setDivider(0.4);
                      setCanvasContent(null);
                      setTimeout(() => {
                        setCanvasContent({ type: 'contract_section', data: testContractSection });
                      }, 100);
                    } else {
                      setCanvasContent({ type: 'contract_section', data: testContractSection });
                    }
                  }}
                >
                  Test Contract Section
                </button>
                
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#17a2b8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const testMarkdown = {
                      title: 'Contract Overview',
                      markdown: `# Contract Drafting Session

## Welcome to your contract drafting session!

### What we'll cover today:
1. **Contract Structure** - We'll outline the key sections
2. **Payment Terms** - Define how and when payments are made
3. **Deliverables** - Specify what will be delivered
4. **Timeline** - Set clear deadlines and milestones
5. **Legal Protections** - Include necessary clauses and protections

### Next Steps:
- Fill out the information form
- Review the contract terms
- Discuss any modifications needed
- Finalize the agreement

---
*This session is designed to help you create a comprehensive and legally sound contract.*`
                    };
                    if (divider === 1) {
                      setDivider(0.4);
                      setCanvasContent(null);
                      setTimeout(() => {
                        setCanvasContent({ type: 'markdown', data: testMarkdown });
                      }, 100);
                    } else {
                      setCanvasContent({ type: 'markdown', data: testMarkdown });
                    }
                  }}
                >
                  Test Markdown
                </button>
                
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    console.log(`[Frontend] Clear Canvas button clicked`);
                    setCanvasContent(null);
                  }}
                >
                  Clear Canvas
                </button>
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#6f42c1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (room && room.localParticipant) {
                      room.localParticipant.publishData(
                        new TextEncoder().encode(JSON.stringify({ type: 'test', hello: 'world' })),
                        { reliable: true }
                      );
                      console.log('[Frontend] Sent test data message');
                    } else {
                      console.log('[Frontend] Room or localParticipant not available');
                    }
                  }}
                >
                  Send Test Data Message
                </button>
                
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#fd7e14',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const testSelectableTable = {
                      id: 'selectable-table-form',
                      fields: [
                        {
                          name: 'selectedOption',
                          label: 'Select an option',
                          type: 'selectable_table',
                          required: true,
                          title: 'Test Selectable Table',
                          columns: [
                            { key: 'label', header: 'Option', align: 'left' },
                            { key: 'description', header: 'Description', align: 'left' },
                            { key: 'price', header: 'Price', align: 'center' }
                          ],
                          options: [
                            { value: 'option1', label: 'Basic Plan', description: 'Essential features for small teams', price: '$99/month', disabled: true },
                            { value: 'option2', label: 'Professional Plan', description: 'Advanced features for growing businesses', price: '$199/month', disabled: false },
                            { value: 'option3', label: 'Enterprise Plan', description: 'Full suite for large organizations', price: '$399/month', disabled: false },
                            { value: 'option4', label: 'Custom Plan', description: 'Tailored solution for specific needs', price: 'Contact sales', disabled: false }
                          ]
                        }
                      ]
                    };
                    setActiveForm(testSelectableTable);
                    if (divider === 1) {
                      setDivider(0.4);
                      setCanvasContent(null);
                      setTimeout(() => {
                        setCanvasContent({ type: 'form', data: testSelectableTable });
                      }, 100);
                    } else {
                      setCanvasContent({ type: 'form', data: testSelectableTable });
                    }
                  }}
                >
                  Test Selectable Table
                </button>
                
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#20c997',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const testMDX = {
                      title: 'Legal Document - MDX Test',
                      markdown: `<DocumentTitle id="employment-agreement">
Employment Agreement - Test Document
</DocumentTitle>

<Parties 
  employer="Test Company Inc."
  employee="John Doe"
  position="Software Engineer"
  effectiveDate="January 1, 2024"
/>

<SectionTitle number="1." id="scope-of-work">
Scope of Work
</SectionTitle>

<Clause number="1.1" id="duties-clause">
The Employee shall perform **software development** duties as assigned by the Employer, including but not limited to:
</Clause>

<SubClause number="1.1.1" id="frontend-dev">
**Frontend development** using React and TypeScript
</SubClause>

<SubClause number="1.1.2" id="backend-dev">
**Backend development** using Node.js and Python
</SubClause>

<SubClause number="1.1.3" id="database-dev">
**Database design** and management
</SubClause>

<SectionTitle number="2." id="compensation">
Compensation
</SectionTitle>

<Clause number="2.1" id="salary-clause">
The Employee shall receive a **base salary** of $85,000 per year, payable bi-weekly.
</Clause>

<Clause number="2.2" id="benefits-clause">
Additional benefits include:
</Clause>

<SubClause number="2.2.1" id="health-insurance">
**Health insurance** coverage for employee and dependents
</SubClause>

<SubClause number="2.2.2" id="retirement-plan">
**401(k) retirement** plan with employer matching
</SubClause>

<Notice id="test-notice">
This is a test document demonstrating MDX rendering capabilities with custom legal document components.
</Notice>`
                    };
                    if (divider === 1) {
                      setDivider(0.4);
                      setCanvasContent(null);
                      setTimeout(() => {
                        setCanvasContent({ type: 'markdown', data: testMDX });
                      }, 100);
                    } else {
                      setCanvasContent({ type: 'markdown', data: testMDX });
                    }
                  }}
                >
                  Test MDX Document
                </button>
                
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#e83e8c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const testHighlightableMDX = {
                      title: 'Component Highlighting Test',
                      markdown: `<DocumentTitle id="main-title">
Test Document with Component Highlighting
</DocumentTitle>

<Parties 
  employer="Test Company Inc."
  employee="John Doe"
  position="Software Engineer"
  effectiveDate="January 1, 2024"
/>

<SectionTitle number="1." id="section-1">
Important Terms
</SectionTitle>

<Clause number="1.1" id="clause-1-1">
This clause contains critical information that must be understood.
</Clause>

<Clause number="1.2" id="clause-1-2">
Another clause with key details that may need attention.
</Clause>

<SubClause number="1.2.1" id="subclause-1-2-1">
This is a subclause with important details.
</SubClause>

<SectionTitle number="2." id="section-2">
Additional Information
</SectionTitle>

<Clause number="2.1" id="clause-2-1">
This section has important notes that should be reviewed carefully.
</Clause>

<Notice id="important-notice">
Click the buttons below to test highlighting different components of this document.
</Notice>`,
                      highlightId: null // Start with no highlight
                    };
                    if (divider === 1) {
                      setDivider(0.4);
                      setCanvasContent(null);
                      setTimeout(() => {
                        setCanvasContent({ type: 'markdown', data: testHighlightableMDX });
                      }, 100);
                    } else {
                      setCanvasContent({ type: 'markdown', data: testHighlightableMDX });
                    }
                  }}
                >
                  Test Component Highlighting
                </button>
                
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#6f42c1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    // Simulate agent highlighting different components
                    const highlightIds = ['main-title', 'section-1', 'clause-1-1', 'clause-1-2', 'subclause-1-2-1', 'section-2', 'clause-2-1', 'important-notice', null];
                    let currentIndex = 0;
                    
                    const highlightNext = () => {
                      if (canvasContent && canvasContent.type === 'markdown') {
                        const newData = {
                          ...canvasContent.data,
                          highlightId: highlightIds[currentIndex]
                        };
                        setCanvasContent({ ...canvasContent, data: newData });
                        currentIndex = (currentIndex + 1) % highlightIds.length;
                      }
                    };
                    
                    highlightNext();
                    const interval = setInterval(() => {
                      highlightNext();
                    }, 2000);
                    
                    // Stop after one cycle
                    setTimeout(() => {
                      clearInterval(interval);
                    }, 20000);
                  }}
                >
                  Test Highlighting
                </button>
                
                <button
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#17a2b8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    // Simulate agent sending highlight_update message
                    if (room && room.localParticipant) {
                      const highlightIds = ['termination-and-notice-period', 'termination-16-1', 'termination-16-2', 'termination-16-3', 'termination-16-4', 'termination-16-5', 'termination-16-6', null];
                      let currentIndex = 0;
                      
                      const sendHighlightUpdate = () => {
                        const highlightData = {
                          type: 'highlight_update',
                          highlightId: highlightIds[currentIndex]
                        };
                        room.localParticipant.publishData(
                          new TextEncoder().encode(JSON.stringify(highlightData)),
                          { reliable: true }
                        );
                        console.log(`[Frontend] Sent highlight_update: ${highlightIds[currentIndex]}`);
                        currentIndex = (currentIndex + 1) % highlightIds.length;
                      };
                      
                      sendHighlightUpdate();
                      const interval = setInterval(() => {
                        sendHighlightUpdate();
                      }, 2000);
                      
                      // Stop after one cycle
                      setTimeout(() => {
                        clearInterval(interval);
                      }, 16000);
                    }
                  }}
                >
                  Test Agent Highlighting
                </button>
              </div>
            )}
            
            {/* Toggle button - always visible */}
            <button
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: testPanelOpen ? '#dc3545' : '#007bff',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.2s ease',
              }}
              onClick={() => setTestPanelOpen(!testPanelOpen)}
              title={testPanelOpen ? 'Hide Test Panel' : 'Show Test Panel'}
            >
              {testPanelOpen ? '×' : '⚡'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CanvasView; 