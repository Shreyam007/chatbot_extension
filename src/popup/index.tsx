import React from 'react';
import ReactDOM from 'react-dom/client';
import { PopupApp } from './PopupApp';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <PopupApp />
    </React.StrictMode>
  );
}
