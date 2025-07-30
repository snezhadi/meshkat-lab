'use client';

import React, { useEffect, useState } from 'react';
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
import type { AppConfig } from '@/lib/types';
import { cn } from '@/lib/utils';
import CanvasForm from './canvas-form';
import { RoomEvent } from 'livekit-client';

function isAgentAvailable(agentState: AgentState) {
  return agentState == 'listening' || agentState == 'thinking' || agentState == 'speaking';
}

interface SessionViewProps {
  appConfig: AppConfig;
  disabled: boolean;
  sessionStarted: boolean;
  onFormStateChange?: (form: { id: string; fields: any[] } | null) => void;
}

export const SessionView = ({
  appConfig,
  disabled,
  sessionStarted,
  onFormStateChange,
  ref,
}: React.ComponentProps<'div'> & SessionViewProps) => {
  const { state: agentState } = useVoiceAssistant();
  const [chatOpen, setChatOpen] = useState(false);
  const { messages, send } = useChatAndTranscription();
  const room = useRoomContext();
  const [activeForm, setActiveForm] = useState<null | { id: string; fields: any[] }>(null);

  useDebugMode();

  useEffect(() => {
    if (!room) return;
    
    // Handle data messages (for backward compatibility)
    function handleDataReceived(payload: Uint8Array, participant: any, kind: any) {
      try {
        const receiveTime = Date.now();
        console.log('Received data message at:', receiveTime, { payload, participant, kind });
        // Decode Uint8Array to string
        const decoder = new TextDecoder();
        const strData = decoder.decode(payload);
        console.log('Decoded data:', strData);
        
        const data = JSON.parse(strData);
        console.log('Parsed data:', data);
        
        if (data && data.type === 'form' && data.id && Array.isArray(data.fields)) {
          console.log('Setting active form at:', receiveTime, 'data:', data);
          setActiveForm({ id: data.id, fields: data.fields });
          onFormStateChange?.({ id: data.id, fields: data.fields });
        } else if (data && data.type === 'form_field_updates' && data.form_id && Array.isArray(data.updates)) {
          console.log('Agent updating form fields:', data);
          handleAgentFormUpdate(data.updates);
        } else if (data && data.type === 'form_values_request' && data.form_id) {
          console.log('Agent requesting current form values');
          // Agent wants to see current form values - this will be handled by the form component
        }
      } catch (e) {
        console.error('Error handling data message:', e);
      }
    }

    // Handle RPC methods for real-time interactions
    
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, onFormStateChange]);

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
    onFormStateChange?.(null);
  }

  function handleFormCancel() {
    setActiveForm(null);
    onFormStateChange?.(null);
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

  // Function to handle agent's form field updates
  function handleAgentFormUpdate(updates: { field_name: string; value: string; reason?: string }[]) {
    if (!activeForm) return;
    
    setActiveForm(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map(field => {
          const update = updates.find(u => u.field_name === field.name);
          return update ? { ...field, value: update.value, agent_update: update.reason } : field;
        })
      };
    });
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

  return (
    <>
      <main
        ref={ref}
        inert={disabled}
        className={cn('flex flex-col flex-1 h-full w-full bg-background', !chatOpen && 'max-h-svh overflow-hidden')}
        style={{ minHeight: 0 }}
      >
        {/* Header/avatar section */}
        <div style={{ flex: '0 0 auto', minHeight: 96, paddingTop: 24, paddingBottom: 8 }}>
          <MediaTiles chatOpen={chatOpen} />
        </div>
        {/* Chat area */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflowY: 'auto' }}>
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
                  className={cn(
                    'absolute inset-x-0 -top-12 text-center',
                    sessionStarted && messages.length === 0 && 'pointer-events-none'
                  )}
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
      {/* TEMP: Test button to trigger form overlay */}
      {sessionStarted && (
        <button
          style={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            zIndex: 2000,
            padding: '0.75rem 1.5rem',
            background: '#222',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
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
            onFormStateChange?.(testForm);
          }}
        >
          Show Test Form
        </button>
      )}
    </>
  );
};
