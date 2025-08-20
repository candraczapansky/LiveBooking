/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HELCIM_ACCOUNT_ID: string
  readonly VITE_HELCIM_TERMINAL_ID: string
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Extend Window interface to include Helcim Pay.js
interface Window {
  helcimPay?: {
    initialize: (config: {
      accountId: string;
      terminalId: string;
      token: string;
      test?: boolean;
    }) => Promise<void>;
    createToken: () => Promise<{
      token: string;
      error?: string;
    }>;
    mount: (elementId: string) => void;
    unmount: () => void;
  }
}