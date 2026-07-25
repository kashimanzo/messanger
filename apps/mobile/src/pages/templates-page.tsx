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
import { MobileAppBar } from '../components/mobile-app-bar';
import { useMessagingFeatures } from '../hooks/use-messaging-features';
import { useTemplates } from '../hooks/use-templates';
import { trpc } from '../lib/trpc';

function WhatsAppTemplatesView() {
  const navigate = useNavigate();
  const { templates, isLoading, isRefreshing, error, refresh } = useTemplates({
    enabled: true,
  });

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar title="WhatsApp templates" onBack={() => navigate('/home')} />

      <Container maxWidth="sm" sx={{ py: 3, pb: 12 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Approved templates from your WhatsApp Business dashboard.
          </Typography>

          <Card sx={{ borderColor: 'primary.main', borderWidth: 1, borderStyle: 'solid' }}>
            <CardActionArea onClick={() => navigate('/templates/custom')}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FiEdit3 size={20} />
                  </Box>
                  <Box>
                    <Typography variant="h6">Custom WhatsApp message</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Send free-form text within the 24-hour session window
                    </Typography>
                  </Box>
                </Stack>
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
                <Button color="inherit" size="small" onClick={() => void refresh()}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {!isLoading && !error && templates.length === 0 && (
            <Alert severity="info">
              No approved templates found. Create and approve templates in Meta Business
              Manager first.
            </Alert>
          )}

          {templates.map((template) => (
            <Card key={`${template.name}:${template.language}`}>
              <CardActionArea
                onClick={() =>
                  navigate('/templates/send', {
                    state: { template },
                  })
                }
              >
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Typography variant="h6">{template.name}</Typography>
                      <Chip label={template.language} size="small" />
                      {template.category && (
                        <Chip label={template.category} size="small" variant="outlined" />
                      )}
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: 'pre-wrap' }}
                    >
                      {template.preview}
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}

          {isRefreshing && (
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Refreshing templates...
            </Typography>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

function SmsTemplatesView() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch } = trpc.listClickSendTemplates.useQuery();
  const deleteTemplate = trpc.deleteClickSendTemplate.useMutation({
    onSuccess: async () => {
      await utils.listClickSendTemplates.invalidate();
      setDeleteTarget(null);
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
            onClick={() =>
              deleteTarget != null &&
              void deleteTemplate.mutateAsync({ templateId: deleteTarget })
            }
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export function TemplatesPage() {
  const navigate = useNavigate();
  const { whatsappEnabled, smsEnabled, isLoading: featuresLoading } =
    useMessagingFeatures();

  if (featuresLoading) {
    return (
      <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
        <MobileAppBar title="Messaging" onBack={() => navigate('/home')} />
        <Container maxWidth="sm" sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  if (smsEnabled) {
    return <SmsTemplatesView />;
  }

  if (whatsappEnabled) {
    return <WhatsAppTemplatesView />;
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar title="Messaging" onBack={() => navigate('/home')} />
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Alert severity="info">No messaging channels are enabled.</Alert>
      </Container>
    </Box>
  );
}
