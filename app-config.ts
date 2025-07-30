import type { AppConfig } from './lib/types';

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'MeshkatAI',
  pageTitle: 'MeshkatAI Voice Agent',
  pageDescription: 'Contracting voice agent',

  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: true,
  isPreConnectBufferEnabled: true,
  debug: true, // Enable debug features like test buttons

  logo: '/lk-logo.svg',
  accent: '#002cf2',
  logoDark: '/lk-logo-dark.svg',
  accentDark: '#1fd5f9',
  startButtonText: 'START',
  hideCanvasInitially: false, // or false to show right pane at 60%
  canvasTitle: 'Termination Clause'
};
