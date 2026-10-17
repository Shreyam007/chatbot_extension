import React from 'react';
import ReactDOM from 'react-dom/client';
import { OptionsApp } from './OptionsApp';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { installGlobalErrorHandlers } from '../shared/errors/reporter';

installGlobalErrorHandlers('options');

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
