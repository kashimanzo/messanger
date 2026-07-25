import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Fab,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { FiEdit3, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useFeedback } from '../components/feedback-provider';
import { MobileAppBar } from '../components/mobile-app-bar';
import { getErrorMessage } from '../lib/get-error-message';
import { trpc } from '../lib/trpc';

function SmsTemplatesView() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useFeedback();
  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch } = trpc.listClickSendTemplates.useQuery();
  const deleteTemplate = trpc.deleteClickSendTemplate.useMutation({
    onSuccess: async () => {
      await utils.listClickSendTemplates.invalidate();
      setDeleteTarget(null);
      showSuccess('Template deleted.');
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to delete template.'));
    },
  });
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar title="SMS templates" onBack={() => navigate('/home')} />

      <Container maxWidth="sm" sx={{ py: 3, pb: 12 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            ClickSend SMS templates you can reuse in campaigns.
          </Typography>

          <Card sx={{ borderColor: 'primary.main', borderWidth: 1, borderStyle: 'solid' }}>
            <CardActionArea onClick={() => navigate('/campaigns/clicksend/new')}>
              <CardContent>
                <Typography variant="h6">Send SMS campaign</Typography>
                <Typography variant="body2" color="text.secondary">
                  Price and send via ClickSend campaign APIs
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void refetch()}>
                  Retry
                </Button>
              }
            >
              {error.message}
            </Alert>
          )}

          {!isLoading && !error && (data?.length ?? 0) === 0 && (
            <Alert severity="info">No SMS templates yet. Create one to get started.</Alert>
          )}

          {data?.map((template) => (
            <Card key={template.templateId}>
              <CardContent>
                <Stack spacing={1}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="flex-start"
                    justifyContent="space-between"
                  >
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">{template.templateName}</Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ whiteSpace: 'pre-wrap' }}
                      >
                        {template.body}
                      </Typography>
                    </Box>
                    <Stack direction="row">
                      <IconButton
                        aria-label={`edit ${template.templateName}`}
                        onClick={() =>
                          navigate(`/templates/sms/${template.templateId}/edit`)
                        }
                      >
                        <FiEdit3 />
                      </IconButton>
                      <IconButton
                        aria-label={`delete ${template.templateName}`}
                        onClick={() => setDeleteTarget(template.templateId)}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Container>

      <Fab
        color="primary"
        aria-label="create template"
        onClick={() => navigate('/templates/sms/new')}
        sx={{
          position: 'fixed',
          bottom: 'calc(24px + env(safe-area-inset-bottom))',
          right: 'calc(24px + env(safe-area-inset-right))',
        }}
      >
        <FiPlus size={24} />
      </Fab>

      <Dialog open={deleteTarget != null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete template?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes the template from your ClickSend account.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            disabled={deleteTemplate.isPending || deleteTarget == null}
            onClick={() => {
              if (deleteTarget == null) {
                return;
              }

              void deleteTemplate.mutateAsync({ templateId: deleteTarget }).catch(() => {
                // onError already surfaces the message
              });
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export function TemplatesPage() {
  return <SmsTemplatesView />;
}
