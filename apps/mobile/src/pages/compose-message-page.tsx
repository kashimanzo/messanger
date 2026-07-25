import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { MobileAppBar } from '../components/mobile-app-bar';
import { TEST_RECIPIENTS } from '@bulk-messanger/whatsapp';
import { isValidPhoneNumber, normalizePhoneNumber } from '../lib/phone-numbers';
import { trpc } from '../lib/trpc';

export function ComposeMessagePage() {
  const navigate = useNavigate();
  const sendMessage = trpc.sendWhatsAppMessage.useMutation();
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<string[]>([...TEST_RECIPIENTS]);
  const [newNumber, setNewNumber] = useState('');
  const [numberError, setNumberError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleAddNumber = () => {
    const normalized = normalizePhoneNumber(newNumber);

    if (!isValidPhoneNumber(newNumber)) {
      setNumberError('Enter a valid number (10–15 digits, E.164 without +).');
      return;
    }

    if (recipients.includes(normalized)) {
      setNumberError('This number is already in the list.');
      return;
    }

    setRecipients((current) => [...current, normalized]);
    setNewNumber('');
    setNumberError(null);
  };

  const handleRemoveNumber = (number: string) => {
    setRecipients((current) => current.filter((item) => item !== number));
  };

  const handleSend = async () => {
    setStatusMessage(null);

    if (!message.trim()) {
      setStatusMessage('Write a message before sending.');
      return;
    }

    if (recipients.length === 0) {
      setStatusMessage('Add at least one recipient.');
      return;
    }

    try {
      const result = await sendMessage.mutateAsync({
        message: message.trim(),
        recipients,
      });

      navigate(`/campaigns/${result.id}`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to send messages.',
      );
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar title="New message" onBack={() => navigate('/home')} />

      <Container maxWidth="sm" sx={{ py: 3, pb: 12 }}>
        <Stack spacing={3}>
          <TextField
            label="Message"
            placeholder="Type your WhatsApp message..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            multiline
            minRows={6}
            fullWidth
          />

          <Box>
            <Typography variant="h6" gutterBottom>
              Recipients
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Numbers are sent in E.164 format without the + prefix.
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                label="Phone number"
                placeholder="447424958361"
                value={newNumber}
                onChange={(event) => {
                  setNewNumber(event.target.value);
                  setNumberError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddNumber();
                  }
                }}
                error={Boolean(numberError)}
                helperText={numberError}
                fullWidth
              />
              <Button
                variant="outlined"
                onClick={handleAddNumber}
                sx={{ minWidth: 96, alignSelf: 'flex-start', mt: 1 }}
                startIcon={<FiPlus />}
              >
                Add
              </Button>
            </Stack>

            <List
              dense
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {recipients.map((number) => (
                <ListItem key={number} divider>
                  <ListItemText primary={`+${number}`} secondary={number} />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label={`remove ${number}`}
                      onClick={() => handleRemoveNumber(number)}
                    >
                      <FiTrash2 />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={handleSend}
            disabled={sendMessage.isPending}
            fullWidth
          >
            {sendMessage.isPending ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              `Send to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}`
            )}
          </Button>

          {statusMessage && (
            <Alert
              severity={
                sendMessage.isError || statusMessage.includes('Failed') || statusMessage.includes('before')
                  ? 'error'
                  : 'success'
              }
            >
              {statusMessage}
            </Alert>
          )}

          {sendMessage.data?.results.map((result) => (
            <Typography key={result.to} variant="caption" display="block">
              {result.success ? '✅' : '❌'} +{result.to}
              {result.error ? ` — ${result.error}` : ''}
            </Typography>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
