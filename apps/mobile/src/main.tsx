import { StrictMode } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import { FeedbackProvider } from './components/feedback-provider';
import { TRPCProvider } from './lib/trpc-provider';
import { theme } from './theme/theme';
import './styles.css';

if (Capacitor.isNativePlatform()) {
  // Keep content below the system status bar so headers don't collide with
  // clock / battery / notch icons (Android often reports safe-area inset as 0).
  void StatusBar.setOverlaysWebView({ overlay: false });
  void StatusBar.setStyle({ style: Style.Light });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <FeedbackProvider>
        <TRPCProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </TRPCProvider>
      </FeedbackProvider>
    </ThemeProvider>
  </StrictMode>,
);
