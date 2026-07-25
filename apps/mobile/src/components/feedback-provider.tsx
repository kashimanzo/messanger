import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Snackbar } from '@mui/material';

type FeedbackSeverity = 'error' | 'success' | 'info' | 'warning';

type FeedbackState = {
  open: boolean;
  message: string;
  severity: FeedbackSeverity;
};

type FeedbackContextValue = {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
  showFeedback: (message: string, severity?: FeedbackSeverity) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const AUTO_HIDE_MS: Record<FeedbackSeverity, number> = {
  error: 8000,
  warning: 6000,
  info: 5000,
  success: 4000,
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    message: '',
    severity: 'error',
  });

  const showFeedback = useCallback(
    (message: string, severity: FeedbackSeverity = 'error') => {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }

      setFeedback({
        open: true,
        message: trimmed,
        severity,
      });
    },
    [],
  );

  const value = useMemo<FeedbackContextValue>(
    () => ({
      showFeedback,
      showError: (message) => showFeedback(message, 'error'),
      showSuccess: (message) => showFeedback(message, 'success'),
      showInfo: (message) => showFeedback(message, 'info'),
      showWarning: (message) => showFeedback(message, 'warning'),
    }),
    [showFeedback],
  );

  const handleClose = (_event?: unknown, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setFeedback((current) => ({ ...current, open: false }));
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        open={feedback.open}
        autoHideDuration={AUTO_HIDE_MS[feedback.severity]}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          top: {
            xs: 'calc(12px + env(safe-area-inset-top))',
            sm: 'calc(16px + env(safe-area-inset-top))',
          },
          left: 12,
          right: 12,
          transform: 'none',
          width: 'auto',
          maxWidth: 480,
          mx: 'auto',
          zIndex: (theme) => theme.zIndex.snackbar + 10,
        }}
      >
        <Alert
          severity={feedback.severity}
          variant="filled"
          onClose={handleClose}
          sx={{
            width: '100%',
            alignItems: 'center',
            boxShadow: 4,
            '& .MuiAlert-message': {
              wordBreak: 'break-word',
            },
          }}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }

  return context;
}
