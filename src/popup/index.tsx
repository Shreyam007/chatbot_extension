import React from 'react';
import ReactDOM from 'react-dom/client';
import { PopupApp } from './PopupApp';
import { ErrorBoundary } from '../ui/ErrorBoundary';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary componentName="Popup">
        <PopupApp />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
