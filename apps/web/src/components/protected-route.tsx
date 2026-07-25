import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { authClient } from '../lib/auth';
import { useAuthStore } from '../stores/auth-store';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  const { data: session, isPending: sessionLoading } = authClient.useSession();

  useEffect(() => {
    if (sessionLoading) return;

    if (session?.user) {
      setUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      });
    }

    setLoading(false);
  }, [session, sessionLoading, setUser, setLoading]);

  if (isLoading || sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  if (!user && !session?.user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
