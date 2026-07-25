import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { authClient } from '../lib/auth';
import { useAuthStore } from '../stores/auth-store';

const SESSION_TIMEOUT_MS = 12_000;

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const [timedOut, setTimedOut] = useState(false);

  const {
    data: session,
    isPending: sessionLoading,
    error: sessionError,
  } = authClient.useSession();

  useEffect(() => {
    if (sessionLoading && !timedOut && !sessionError) return;

    if (session?.user) {
      setUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      });
    } else {
      setUser(null);
    }

    setLoading(false);
  }, [session, sessionLoading, sessionError, timedOut, setUser, setLoading]);

  // Never leave the splash spinner hanging if the API is unreachable.
  useEffect(() => {
    if (!sessionLoading) return;

    const timer = window.setTimeout(() => {
      setTimedOut(true);
      setLoading(false);
    }, SESSION_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [sessionLoading, setLoading]);

  const waitingForSession =
    (isLoading || sessionLoading) && !sessionError && !timedOut;

  if (waitingForSession) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user && !session?.user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
