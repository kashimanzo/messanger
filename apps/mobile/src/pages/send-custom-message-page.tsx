import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  ContactPicker,
  SelectAllContactsControl,
} from '../components/contact-picker';
import { useFeedback } from '../components/feedback-provider';
import { MobileAppBar } from '../components/mobile-app-bar';
import { useContacts } from '../hooks/use-contacts';
import { useMessagingFeatures } from '../hooks/use-messaging-features';
import { getErrorMessage } from '../lib/get-error-message';
import { trpc } from '../lib/trpc';

type Channel = 'WHATSAPP' | 'SMS';

export function SendCustomMessagePage() {
  const navigate = useNavigate();
  const { showError } = useFeedback();
  const { whatsappEnabled, smsEnabled, defaultChannel } = useMessagingFeatures();
  const { data: groups } = trpc.listContactGroups.useQuery();
  const { allContacts: contacts } = useContacts();
  const sendMessage = trpc.sendWhatsAppMessage.useMutation();
  const sendSms = trpc.sendSmsCampaign.useMutation();

  const availableChannels = useMemo(() => {
    const channels: Channel[] = [];
    if (smsEnabled) channels.push('SMS');
    if (whatsappEnabled) channels.push('WHATSAPP');
    return channels;
  }, [smsEnabled, whatsappEnabled]);

  const [channel, setChannel] = useState<Channel>(
    (defaultChannel as Channel | null) ?? (smsEnabled ? 'SMS' : 'WHATSAPP'),
  );
  const [message, setMessage] = useState('');
  const [groupId, setGroupId] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (availableChannels.length === 0) {
      return;
    }

    if (!availableChannels.includes(channel)) {
      setChannel(availableChannels[0]);
    }
  }, [availableChannels, channel]);

  const isSms = channel === 'SMS';
  const isPending = sendMessage.isPending || sendSms.isPending;
  const maxLength = isSms ? 1600 : 4096;

  const recipientCount = useMemo(() => {
    const phoneNumbers = new Set<string>();

    if (groupId) {
      const group = groups?.find((entry) => entry.id === groupId);
      for (const member of group?.members ?? []) {
        phoneNumbers.add(member.phoneNumber);
      }
    }

    for (const contactId of selectedContactIds) {
      const contact = contacts?.find((entry) => entry.id === contactId);
      if (contact) {
        phoneNumbers.add(contact.phoneNumber);
      }
    }

    return phoneNumbers.size;
  }, [groupId, groups, selectedContactIds, contacts]);

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((current) => {
      const next = new Set(current);

      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }

      return next;
    });
  };

  const handleSend = async () => {
    if (!message.trim()) {
      showError('Write a message before sending.');
      return;
    }

    if (!groupId && selectedContactIds.size === 0) {
      showError('Select a group or at least one contact.');
      return;
    }

    try {
      const payload = {
        message: message.trim(),
        groupId: groupId || undefined,
        contactIds: [...selectedContactIds],
      };

      const result = isSms
        ? await sendSms.mutateAsync(payload)
        : await sendMessage.mutateAsync({ ...payload, channel: 'WHATSAPP' });

      navigate(`/campaigns/${result.id}`);
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to send messages.'));
    }
  };

  if (availableChannels.length === 0) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="warning">No messaging channels are enabled.</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/home')}>
          Back home
        </Button>
      </Container>
    );
  }

  const backPath = whatsappEnabled ? '/templates' : '/home';

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar
        title={isSms ? 'Send SMS' : 'Custom message'}
        onBack={() => navigate(backPath)}
      />

      <Container
        maxWidth="sm"
        sx={{ py: 3, pb: 'calc(96px + env(safe-area-inset-bottom))' }}
      >
        <Stack spacing={3}>
          {availableChannels.length > 1 && (
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={channel}
              onChange={(_event, value: Channel | null) => {
                if (value) setChannel(value);
              }}
            >
              {smsEnabled && <ToggleButton value="SMS">SMS</ToggleButton>}
              {whatsappEnabled && (
                <ToggleButton value="WHATSAPP">WhatsApp text</ToggleButton>
              )}
            </ToggleButtonGroup>
          )}

          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {isSms
                  ? 'Send SMS via ClickSend to groups or contacts from your phonebook.'
                  : 'Send a free-form WhatsApp text. Recipients must have an open session with your business number (24-hour window).'}
              </Typography>
            </CardContent>
          </Card>

          <TextField
            label="Message"
            placeholder={isSms ? 'Type your SMS...' : 'Type your WhatsApp message...'}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            multiline
            minRows={6}
            fullWidth
            inputProps={{ maxLength }}
            helperText={`${message.length}/${maxLength}`}
          />

          <Box>
            <Typography variant="h6" gutterBottom>
              Recipients
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="group-select-label">Contact group</InputLabel>
              <Select
                labelId="group-select-label"
                label="Contact group"
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
              >
                <MenuItem value="">
                  <em>No group selected</em>
                </MenuItem>
                {groups?.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name} ({group.memberCount})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {!groups?.length && (
              <Alert severity="info" sx={{ mb: 2 }}>
                No groups yet.{' '}
                <Typography
                  component="button"
                  sx={{
                    cursor: 'pointer',
                    border: 0,
                    bgcolor: 'transparent',
                    color: 'primary.main',
                  }}
                  onClick={() => navigate('/groups/new')}
                >
                  Create a group
                </Typography>
              </Alert>
            )}

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Or select individual contacts
            </Typography>

            {contacts && contacts.length > 0 && (
              <SelectAllContactsControl
                contacts={contacts}
                selectedIds={selectedContactIds}
                onChange={setSelectedContactIds}
              />
            )}

            <ContactPicker selectedIds={selectedContactIds} onToggle={toggleContact} />
          </Box>
        </Stack>
      </Container>

      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          p: 2,
          pb: 'calc(16px + env(safe-area-inset-bottom))',
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="sm" disableGutters>
          <Button
            variant="contained"
            size="large"
            onClick={handleSend}
            disabled={isPending || recipientCount === 0 || !message.trim()}
            fullWidth
          >
            {isPending ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              `Send ${isSms ? 'SMS' : 'WhatsApp'} to ${recipientCount} recipient${
                recipientCount === 1 ? '' : 's'
              }`
            )}
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
