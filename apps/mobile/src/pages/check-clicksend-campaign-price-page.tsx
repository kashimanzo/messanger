import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
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

export function CheckClickSendCampaignPricePage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useFeedback();
  const {
    smsEnabled,
    clickSendFrom,
    isLoading: featuresLoading,
  } = useMessagingFeatures();
  const { data: groups } = trpc.listContactGroups.useQuery(undefined, {
    enabled: smsEnabled,
  });
  const { allContacts: contacts } = useContacts();
  const templatesQuery = trpc.listClickSendTemplates.useQuery(undefined, {
    enabled: smsEnabled,
  });

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [from, setFrom] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(
    new Set(),
  );
  const [pricePreview, setPricePreview] = useState<{
    price: number;
    currency?: string;
    recipientCount: number;
    listId?: number;
    mode: 'local' | 'clicksend';
  } | null>(null);

  useEffect(() => {
    if (clickSendFrom && !from) {
      setFrom(clickSendFrom);
    }
  }, [clickSendFrom, from]);

  const calculatePrice = trpc.calculateClickSendCampaignPrice.useMutation();
  const sendCampaign = trpc.sendClickSendCampaign.useMutation();

  const recipientCount = useMemo(() => {
    const phones = new Set<string>();

    if (groupId) {
      const group = groups?.find((entry) => entry.id === groupId);
      for (const member of group?.members ?? []) {
        phones.add(member.phoneNumber);
      }
    }

    for (const contactId of selectedContactIds) {
      const contact = contacts?.find((entry) => entry.id === contactId);
      if (contact) phones.add(contact.phoneNumber);
    }

    return phones.size;
  }, [groupId, groups, selectedContactIds, contacts]);

  const sendMode =
    recipientCount > 0 && recipientCount < 1000
      ? 'local'
      : recipientCount >= 1000
        ? 'clicksend'
        : null;

  const navigateAfterSend = (result: {
    mode: 'local' | 'clicksend';
    campaignId?: string;
    smsCampaignId?: number;
  }) => {
    if (result.mode === 'local' && result.campaignId) {
      navigate(`/campaigns/${result.campaignId}`);
      return;
    }
    if (result.mode === 'clicksend' && result.smsCampaignId) {
      navigate(`/campaigns/clicksend/${result.smsCampaignId}`);
      return;
    }
    throw new Error('Campaign was created but no detail route was returned.');
  };

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((current) => {
      const next = new Set(current);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  };

  const buildPayload = () => ({
    name: name.trim() || `SMS ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
    message: message.trim(),
    from: from.trim() || undefined,
    groupId: groupId || undefined,
    contactIds: [...selectedContactIds],
  });

  const handleApplyTemplate = (id: string) => {
    setTemplateId(id);
    const template = templatesQuery.data?.find(
      (entry) => String(entry.templateId) === id,
    );
    if (template) {
      setMessage(template.body);
      if (!name.trim()) {
        setName(template.templateName);
      }
    }
    setPricePreview(null);
  };

  const handlePrice = async () => {
    setPricePreview(null);

    if (!from.trim()) {
      showError(
        'Enter a sender (e.g. BulkMsg or +4477...) or set CLICKSEND_FROM on the API.',
      );
      return;
    }
    if (!message.trim()) {
      showError('Write a message before calculating price.');
      return;
    }
    if (!groupId && selectedContactIds.size === 0) {
      showError('Select a group or at least one contact.');
      return;
    }

    try {
      const result = await calculatePrice.mutateAsync(buildPayload());
      setPricePreview({
        price: result.price,
        currency: result.currency,
        recipientCount: result.recipientCount,
        listId: result.listId ?? undefined,
        mode: result.mode,
      });
      showSuccess('Price calculated.');
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to calculate price.'));
    }
  };

  const handleSend = async () => {
    if (!pricePreview) {
      showError('Calculate the price before sending.');
      return;
    }
    if (!from.trim()) {
      showError('Enter a sender before sending.');
      return;
    }
    if (!message.trim()) {
      showError('Write a message before sending.');
      return;
    }

    try {
      const result = await sendCampaign.mutateAsync({
        ...buildPayload(),
        listId:
          pricePreview.mode === 'clicksend' ? pricePreview.listId : undefined,
      });
      navigateAfterSend(result);
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to send campaign.'));
    }
  };

  if (featuresLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!smsEnabled) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="warning">SMS mode is disabled.</Alert>
      </Container>
    );
  }

  const busy = calculatePrice.isPending || sendCampaign.isPending;
  const priceLabel = pricePreview
    ? `${pricePreview.currency ? `${pricePreview.currency} ` : ''}${pricePreview.price.toFixed(4)}`
    : null;

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar
        title="Check campaign price"
        onBack={() => navigate('/home')}
      />

      <Container
        maxWidth="sm"
        sx={{ py: 3, pb: 'calc(120px + env(safe-area-inset-bottom))' }}
      >
        <Stack spacing={3}>
          <Alert severity="info">
            Under 1,000 recipients: priced and sent with ClickSend&apos;s SMS
            API and tracked in this app. 1,000–20,000: ClickSend native
            campaign (include an opt-out such as reply STOP).
          </Alert>

          <TextField
            label="Campaign name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            fullWidth
          />

          <TextField
            label="Sender"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPricePreview(null);
            }}
            placeholder="BulkMsg or +4477..."
            required
            fullWidth
            helperText="Required for ClickSend campaigns (alphanumeric brand or phone number)."
          />

          {(templatesQuery.data?.length ?? 0) > 0 && (
            <FormControl fullWidth>
              <InputLabel id="price-template-select">Use template</InputLabel>
              <Select
                labelId="price-template-select"
                label="Use template"
                value={templateId}
                onChange={(event) => handleApplyTemplate(event.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {templatesQuery.data?.map((template) => (
                  <MenuItem
                    key={template.templateId}
                    value={String(template.templateId)}
                  >
                    {template.templateName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label="Message"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setPricePreview(null);
            }}
            multiline
            minRows={5}
            fullWidth
            helperText={`${message.length}/1600`}
            inputProps={{ maxLength: 1600 }}
          />

          {sendMode && (
            <Alert severity={sendMode === 'local' ? 'success' : 'warning'}>
              {sendMode === 'local'
                ? `Local app campaign via SMS Send API (${recipientCount} recipient${recipientCount === 1 ? '' : 's'}).`
                : `ClickSend native campaign (${recipientCount.toLocaleString()} recipients). Max 20,000.`}
            </Alert>
          )}

          <Box>
            <Typography variant="h6" gutterBottom>
              Recipients ({recipientCount})
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="price-group-select">Contact group</InputLabel>
              <Select
                labelId="price-group-select"
                label="Contact group"
                value={groupId}
                onChange={(event) => {
                  setGroupId(event.target.value);
                  setPricePreview(null);
                }}
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

            {contacts && contacts.length > 0 && (
              <SelectAllContactsControl
                contacts={contacts}
                selectedIds={selectedContactIds}
                onChange={(ids) => {
                  setSelectedContactIds(ids);
                  setPricePreview(null);
                }}
              />
            )}
            <ContactPicker
              selectedIds={selectedContactIds}
              onToggle={(id) => {
                toggleContact(id);
                setPricePreview(null);
              }}
            />
          </Box>

          {pricePreview && (
            <Card
              variant="outlined"
              sx={{ borderColor: 'primary.main', borderWidth: 2 }}
            >
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Estimated charge
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {priceLabel}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {pricePreview.recipientCount} recipient
                  {pricePreview.recipientCount === 1 ? '' : 's'}
                  {pricePreview.mode === 'local'
                    ? ' · SMS Send API (tracked in app)'
                    : pricePreview.listId
                      ? ` · ClickSend list #${pricePreview.listId}`
                      : ' · ClickSend campaign'}
                </Typography>
              </CardContent>
            </Card>
          )}

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
          <Stack spacing={1}>
            <Button
              variant="contained"
              size="large"
              onClick={() => void handlePrice()}
              disabled={
                busy || recipientCount === 0 || !message.trim() || !from.trim()
              }
              fullWidth
            >
              {calculatePrice.isPending ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                'Calculate price'
              )}
            </Button>
            {pricePreview && (
              <Button
                variant="outlined"
                size="large"
                onClick={() => void handleSend()}
                disabled={busy}
                fullWidth
              >
                {sendCampaign.isPending ? (
                  <CircularProgress size={22} />
                ) : (
                  `Send for ${priceLabel}`
                )}
              </Button>
            )}
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
