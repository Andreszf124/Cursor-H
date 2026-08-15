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

createRoot(rootElement).render(
  <StrictMode>
    {missingPublicEnvKeys.length > 0 ? (
      <MissingPublicEnvScreen missingKeys={missingPublicEnvKeys} />
    ) : (
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    )}
  </StrictMode>,
);
