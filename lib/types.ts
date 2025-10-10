export interface CombinedTranscription {
  role: 'assistant' | 'user';
  receivedAtMediaTimestamp: number;
  receivedAt: number;
  text: string;
  startTime: number;
  endTime: number;
}
export type ThemeMode = 'dark' | 'light' | 'system';

export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;
  debug?: boolean; // Enable debug features like test buttons

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;
  hideCanvasInitially?: boolean;
  canvasTitle?: string;
  hideFormHeader?: boolean; // Hide form headers globally

  // Admin authentication
  adminUsers?: Array<{
    username: string;
    passwordHash: string;
    permissions: {
      canExport: boolean;
      canDelete: boolean;
      canCreate: boolean;
      canEdit: boolean;
      canManageGlobalConfig: boolean;
    };
  }>;
}

export interface SandboxConfig {
  [key: string]:
    | { type: 'string'; value: string }
    | { type: 'number'; value: number }
    | { type: 'boolean'; value: boolean }
    | null;
}
