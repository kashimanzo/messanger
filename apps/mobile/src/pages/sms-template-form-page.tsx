import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  TextField,
} from '@mui/material';
import { useFeedback } from '../components/feedback-provider';
import { MobileAppBar } from '../components/mobile-app-bar';
import { getErrorMessage } from '../lib/get-error-message';
import { trpc } from '../lib/trpc';

export function SmsTemplateFormPage() {
  const navigate = useNavigate();
  const { showError } = useFeedback();
  const { templateId } = useParams();
  const editingId = templateId ? Number(templateId) : null;
  const isEditing = Number.isFinite(editingId) && (editingId as number) > 0;

  const [templateName, setTemplateName] = useState('');
  const [body, setBody] = useState('');

  const utils = trpc.useUtils();
  const existing = trpc.getClickSendTemplate.useQuery(
    { templateId: editingId as number },
    { enabled: Boolean(isEditing) },
  );

  useEffect(() => {
    if (existing.data) {
      setTemplateName(existing.data.templateName);
      setBody(existing.data.body);
    }
  }, [existing.data]);

  const createTemplate = trpc.createClickSendTemplate.useMutation({
    onSuccess: async () => {
      await utils.listClickSendTemplates.invalidate();
      navigate('/templates');
    },
  });
  const updateTemplate = trpc.updateClickSendTemplate.useMutation({
    onSuccess: async () => {
      await utils.listClickSendTemplates.invalidate();
      navigate('/templates');
    },
  });

  const isPending = createTemplate.isPending || updateTemplate.isPending;


  const handleSave = async () => {
    if (!templateName.trim() || !body.trim()) {
      showError('Name and message body are required.');
      return;
    }

    try {
      if (isEditing && editingId) {
        await updateTemplate.mutateAsync({
          templateId: editingId,
          templateName: templateName.trim(),
          body: body.trim(),
        });
      } else {
        await createTemplate.mutateAsync({
          templateName: templateName.trim(),
          body: body.trim(),
        });
      }
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to save template.'));
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar
        title={isEditing ? 'Edit SMS template' : 'New SMS template'}
        onBack={() => navigate('/templates')}
      />

      <Container maxWidth="sm" sx={{ py: 3, pb: 12 }}>
        <Stack spacing={3}>
          {isEditing && existing.isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {existing.error && <Alert severity="error">{existing.error.message}</Alert>}

          <TextField
            label="Template name"
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            fullWidth
          />

          <TextField
            label="Message body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            multiline
            minRows={6}
            fullWidth
            helperText={`${body.length}/1600`}
            inputProps={{ maxLength: 1600 }}
          />

          <Button
            variant="contained"
            size="large"
            onClick={() => void handleSave()}
            disabled={isPending || (isEditing && existing.isLoading)}
          >
            {isPending ? <CircularProgress size={24} color="inherit" /> : 'Save template'}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
