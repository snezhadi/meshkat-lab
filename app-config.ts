import type { AppConfig } from './lib/types';

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'MeshkatAI',
  pageTitle: 'MeshkatAI Law Firm 2.0',
  pageDescription: 'A full-stack AI law firm specialized in Employment and Workplace Law',

  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: true,
  isPreConnectBufferEnabled: true,
  debug: false, // Enable debug features like test buttons

  logo: '/lk-logo.svg',
  accent: '#002cf2',
  logoDark: '/lk-logo-dark.svg',
  accentDark: '#1fd5f9',
  startButtonText: 'START',
  hideCanvasInitially: true, // or false to show right pane at 60%
  canvasTitle: 'Termination Clause',
  hideFormHeader: true, // Set to true to hide form headers globally

  // Admin authentication
  adminUsers: [
    {
      username: 'admin',
      passwordHash: '$2b$10$KCgR59BGPhAW01lIAqqFOudgQLMN856G05/jRqoskr0t6X4ZTtksS', // admin123
      permissions: {
        canExport: true,
        canDelete: true,
        canCreate: true,
        canEdit: true
      }
    },
    {
      username: 'admin2',
      passwordHash: '$2b$10$ViMYWlgLOsQen2/QEzOKy.44nAxgB.LPdsfN6/LHt0GB1.ubzca6a', // MeshkatLab2025!
      permissions: {
        canExport: false,
        canDelete: true,
        canCreate: true,
        canEdit: true
      }
    }
  ]
};
