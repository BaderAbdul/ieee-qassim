/** Configuration presence only. Never returns variable values or contacts providers. */
export function configurationReadiness(env: Record<string, string | undefined> = process.env) {
  const present = (...names: string[]) => names.every(name => !!env[name]?.trim());
  const localDemo = env.NODE_ENV === 'development' && !!env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith('demo-')
    && /^(127\.0\.0\.1|localhost):\d+$/.test(env.FIRESTORE_EMULATOR_HOST || '')
    && /^(127\.0\.0\.1|localhost):\d+$/.test(env.FIREBASE_AUTH_EMULATOR_HOST || '');
  return {
    platformConfigured: localDemo || present('FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'),
    mediaConfigured: present('CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'),
    email: env.EMAIL_NOTIFICATIONS_ENABLED !== 'true' ? 'disabled' : present('RESEND_API_KEY', 'SENDER_EMAIL') ? 'configured' : 'incomplete',
    configurationOnly: true,
  };
}
