import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { UiPrefsProvider } from './services/uiPrefs';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UiPrefsProvider>
      <App />
    </UiPrefsProvider>
  </React.StrictMode>
);
