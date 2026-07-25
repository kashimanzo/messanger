import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FiMail, FiLock } from 'react-icons/fi';
import { useFeedback } from '../components/feedback-provider';
import { authClient } from '../lib/auth';
import { getErrorMessage } from '../lib/get-error-message';
import { useAuthStore } from '../stores/auth-store';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { showError } = useFeedback();
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);

    try {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        const message =
          result.error.message?.trim() || 'Failed to sign in';
        setError(message);
        showError(message);
        return;
      }

      if (result.data?.user) {
        setUser({
          id: result.data.user.id,
          name: result.data.user.name,
          email: result.data.user.email,
          image: result.data.user.image,
        });
        setLoading(false);
      }

      await authClient.getSession({ fetchOptions: { credentials: 'include' } });

      navigate('/home', { replace: true });
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to sign in');
      setError(message);
      showError(message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        pt: 'calc(16px + env(safe-area-inset-top))',
        pb: 'calc(16px + env(safe-area-inset-bottom))',
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 400, mb: 0.5 }}>
                Sign in
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Access your Bulk Messanger account
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  InputProps={{
                    startAdornment: <FiMail style={{ marginRight: 8, opacity: 0.6 }} />,
                  }}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  {...register('email')}
                />
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  InputProps={{
                    startAdornment: <FiLock style={{ marginRight: 8, opacity: 0.6 }} />,
                  }}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  {...register('password')}
                />

                {error && <Alert severity="error">{error}</Alert>}

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isSubmitting}
                  fullWidth
                >
                  {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
                </Button>
              </Stack>
            </Box>

            <Typography variant="body2" textAlign="center">
              Don&apos;t have an account?{' '}
              <Link component={RouterLink} to="/register" underline="hover">
                Create one
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
