// Minimal shape for the `window.Clerk` global Clerk's SDK attaches at runtime, used for
// imperative token access outside React components (see src/lib/backend.ts).
export {};

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      } | null;
    };
  }
}
