import React from 'react';
import ReactDOM from 'react-dom/client';
import { SidePanelApp } from './SidePanelApp';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { installGlobalErrorHandlers } from '../shared/errors/reporter';

installGlobalErrorHandlers('sidepanel');

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary componentName="SidePanel">
        <SidePanelApp />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
