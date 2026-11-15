import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FiLock, FiLogOut, FiUser } from 'react-icons/fi';
import { useFeedback } from '../components/feedback-provider';
import { MobileAppBar } from '../components/mobile-app-bar';
import { authClient, clearMobileAuthSession } from '../lib/auth';
import { getErrorMessage } from '../lib/get-error-message';
import { trpc } from '../lib/trpc';
import { useAuthStore } from '../stores/auth-store';
import { useContactsStore } from '../stores/contacts-store';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useFeedback();
  const utils = trpc.useUtils();
  const setUser = useAuthStore((state) => state.setUser);
  const storeUser = useAuthStore((state) => state.user);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { data: profile, isLoading } = trpc.getProfile.useQuery(undefined, {
    retry: false,
  });
  const updateProfile = trpc.updateProfile.useMutation({
    onSuccess: async (user) => {
      setUser({
        id: user.id,
        name: user.name,
        email: user.email,
        image: storeUser?.image,
      });
      await utils.getProfile.invalidate();
      showSuccess('Profile updated.');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Failed to update profile.'));
    },
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '' },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (profile?.name) {
      profileForm.reset({ name: profile.name });
    }
  }, [profile?.name, profileForm]);

  const handleSignOut = async () => {
    await authClient.signOut();
    clearMobileAuthSession();
    setUser(null);
    useContactsStore.getState().reset();
    navigate('/login');
  };

  const onSaveProfile = profileForm.handleSubmit(async (values) => {
    await updateProfile.mutateAsync({ name: values.name.trim() });
  });

  const onChangePassword = passwordForm.handleSubmit(async (values) => {
    setPasswordError(null);

    try {
      const result = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        const message =
          result.error.message?.trim() || 'Failed to update password.';
        setPasswordError(message);
        showError(message);
        return;
      }

      passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      showSuccess('Password updated. Other sessions were signed out.');
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update password.');
      setPasswordError(message);
      showError(message);
    }
  });

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar title="Profile" onBack={() => navigate('/home')} />

      <Container
        maxWidth="sm"
        sx={{
          py: 2.5,
          pb: 'calc(24px + max(20px, env(safe-area-inset-bottom, 0px)))',
        }}
      >
        {isLoading && !profile ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Stack spacing={2}>
            <Card>
              <CardContent sx={{ py: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center', mb: 2 }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 0,
                      bgcolor: 'primary.light',
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FiUser size={22} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap>
                      {profile?.name || storeUser?.name || 'Your profile'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {profile?.email || storeUser?.email}
                    </Typography>
                  </Box>
                </Stack>

                <Box component="form" onSubmit={onSaveProfile}>
                  <Stack spacing={1.5}>
                    <TextField
                      label="Name"
                      fullWidth
                      error={!!profileForm.formState.errors.name}
                      helperText={profileForm.formState.errors.name?.message}
                      {...profileForm.register('name')}
                    />
                    <TextField
                      label="Email"
                      fullWidth
                      value={profile?.email || storeUser?.email || ''}
                      disabled
                      helperText="Email cannot be changed here"
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={
                        updateProfile.isPending ||
                        profileForm.formState.isSubmitting
                      }
                    >
                      {updateProfile.isPending ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        'Save profile'
                      )}
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ py: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', mb: 1.5 }}
                >
                  <FiLock size={18} color="#5f6368" />
                  <Typography variant="subtitle1">Change password</Typography>
                </Stack>

                {passwordError ? (
                  <Alert severity="error" sx={{ mb: 1.5 }}>
                    {passwordError}
                  </Alert>
                ) : null}

                <Box component="form" onSubmit={onChangePassword}>
                  <Stack spacing={1.5}>
                    <TextField
                      label="Current password"
                      type="password"
                      fullWidth
                      autoComplete="current-password"
                      error={!!passwordForm.formState.errors.currentPassword}
                      helperText={
                        passwordForm.formState.errors.currentPassword?.message
                      }
                      {...passwordForm.register('currentPassword')}
                    />
                    <TextField
                      label="New password"
                      type="password"
                      fullWidth
                      autoComplete="new-password"
                      error={!!passwordForm.formState.errors.newPassword}
                      helperText={
                        passwordForm.formState.errors.newPassword?.message
                      }
                      {...passwordForm.register('newPassword')}
                    />
                    <TextField
                      label="Confirm new password"
                      type="password"
                      fullWidth
                      autoComplete="new-password"
                      error={!!passwordForm.formState.errors.confirmPassword}
                      helperText={
                        passwordForm.formState.errors.confirmPassword?.message
                      }
                      {...passwordForm.register('confirmPassword')}
                    />
                    <Button
                      type="submit"
                      variant="outlined"
                      disabled={passwordForm.formState.isSubmitting}
                    >
                      {passwordForm.formState.isSubmitting ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        'Update password'
                      )}
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>

            <Divider />

            <Button
              color="error"
              variant="outlined"
              startIcon={<FiLogOut size={18} />}
              onClick={handleSignOut}
            >
              Sign out
            </Button>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
