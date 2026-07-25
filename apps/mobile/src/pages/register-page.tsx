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
import { FiUser, FiMail, FiLock } from 'react-icons/fi';
import { authClient } from '../lib/auth';
import { useAuthStore } from '../stores/auth-store';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);

    const result = await authClient.signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
    });

    if (result.error) {
      setError(result.error.message ?? 'Failed to create account');
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
              <Typography variant="h5" fontWeight={700}>
                Create account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Register to start using Bulk Messanger
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2}>
                <TextField
                  label="Name"
                  fullWidth
                  InputProps={{
                    startAdornment: <FiUser style={{ marginRight: 8, opacity: 0.6 }} />,
                  }}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  {...register('name')}
                />
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
                <TextField
                  label="Confirm password"
                  type="password"
                  fullWidth
                  InputProps={{
                    startAdornment: <FiLock style={{ marginRight: 8, opacity: 0.6 }} />,
                  }}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />

                {error && <Alert severity="error">{error}</Alert>}

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isSubmitting}
                  fullWidth
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Create account'
                  )}
                </Button>
              </Stack>
            </Box>

            <Typography variant="body2" textAlign="center">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" underline="hover">
                Sign in
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
