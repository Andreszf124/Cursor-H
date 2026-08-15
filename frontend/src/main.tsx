import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { MissingPublicEnvScreen } from './app/config/MissingPublicEnvScreen';
import { missingPublicEnvKeys } from './app/config/env';
import { AppProviders } from './app/providers/AppProviders';
import { router } from './app/router';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

const envIsMissing = missingPublicEnvKeys.length > 0;

// #region agent log
fetch('http://127.0.0.1:7774/ingest/f4cb5b74-6463-4ea1-9d46-b02c79f9768f', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0b41ed' },
  body: JSON.stringify({
    sessionId: '0b41ed',
    runId: 'post-fix',
    hypothesisId: 'D',
    location: 'frontend/src/main.tsx:render',
    message: envIsMissing ? 'rendering missing env screen' : 'rendering app router',
    data: { envIsMissing, missingCount: missingPublicEnvKeys.length },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

createRoot(rootElement).render(
  <StrictMode>
    {envIsMissing ? (
      <MissingPublicEnvScreen missingKeys={missingPublicEnvKeys} />
    ) : (
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    )}
  </StrictMode>,
);
