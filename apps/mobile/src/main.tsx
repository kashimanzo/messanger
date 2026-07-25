import { StrictMode } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import { TRPCProvider } from './lib/trpc-provider';
import { theme } from './theme/theme';
import './styles.css';

if (Capacitor.isNativePlatform()) {
  void StatusBar.setOverlaysWebView({ overlay: true });
  void StatusBar.setStyle({ style: Style.Dark });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TRPCProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </TRPCProvider>
    </ThemeProvider>
  </StrictMode>,
);
