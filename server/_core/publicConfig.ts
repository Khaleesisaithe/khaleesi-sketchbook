// Only explicitly public values may reach the browser. Never serialize process.env.
export function publicPlatformConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    projectId: env.MANUS_PROJECT_ID ?? "",
  };
}

export function publicPlatformScript(env: NodeJS.ProcessEnv = process.env): string {
  const json = JSON.stringify(publicPlatformConfig(env)).replaceAll("<", "\\u003c");
  return `window.__MANUS_CONFIG__=${json};`;
}

export function publicSiteConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    supabaseUrl: env.SUPABASE_URL ?? "",
    supabaseAnonKey: env.SUPABASE_ANON_KEY ?? "",
    emailConfigured: Boolean(env.RESEND_API_KEY && env.RESEND_FROM && env.BOOKING_NOTIFICATION_EMAIL),
  };
}

export function publicSiteScript(env: NodeJS.ProcessEnv = process.env): string {
  const json = JSON.stringify(publicSiteConfig(env)).replaceAll("<", "\\u003c");
  return `window.__SITE_CONFIG__=${json};`;
}
