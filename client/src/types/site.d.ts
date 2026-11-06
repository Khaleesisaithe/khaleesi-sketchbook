export {};

declare global {
  interface Window {
    __SITE_CONFIG__?: {
      supabaseUrl: string;
      supabaseAnonKey: string;
      emailConfigured: boolean;
    };
  }
}
