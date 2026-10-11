import React from 'react';
import ReactDOM from 'react-dom/client';
import { OptionsApp } from './OptionsApp';
import { ErrorBoundary } from '../ui/ErrorBoundary';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary componentName="Options">
        <OptionsApp />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
