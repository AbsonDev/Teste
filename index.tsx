import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App';
import './services/i18n';

Sentry.init({
  dsn: "https://92b90686f07aad82a51b73925e6cd402@o4510572337168384.ingest.us.sentry.io/4510710065856512",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, 
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/], 
  // Session Replay
  replaysSessionSampleRate: 0.1, 
  replaysOnErrorSampleRate: 1.0, 
  // Logs
  enableLogs: true,
  // PII
  sendDefaultPii: true
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div className="flex items-center justify-center min-h-screen p-6 text-center text-red-600 bg-red-50 dark:bg-red-900/10"><p>Ocorreu um erro inesperado. Por favor, recarregue a página.</p></div>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);