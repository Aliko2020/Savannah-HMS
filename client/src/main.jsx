import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext.jsx';
import { SettingsProvider } from './SettingsContext.jsx';
import { LicenceProvider } from './LicenceContext.jsx';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <LicenceProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </LicenceProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
