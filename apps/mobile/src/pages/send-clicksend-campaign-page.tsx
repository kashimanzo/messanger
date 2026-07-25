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
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FiSearch } from 'react-icons/fi';
import {
  ContactPicker,
  SelectAllContactsControl,
} from '../components/contact-picker';
import { useFeedback } from '../components/feedback-provider';
import { MobileAppBar } from '../components/mobile-app-bar';
import { useContacts } from '../hooks/use-contacts';
import { getErrorMessage } from '../lib/get-error-message';
import { trpc } from '../lib/trpc';

export function SendClickSendCampaignPage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useFeedback();
  const clickSendFrom = import.meta.env.VITE_CLICKSEND_FROM?.trim() || null;
  const { data: groups } = trpc.listContactGroups.useQuery(undefined, {
    enabled: true,
  });
  const [recipientSearch, setRecipientSearch] = useState('');
  const { allContacts, contacts: filteredContacts } = useContacts(recipientSearch);
  const templatesQuery = trpc.listClickSendTemplates.useQuery(undefined, {
    enabled: true,
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
      const contact = allContacts?.find((entry) => entry.id === contactId);
      if (contact) phones.add(contact.phoneNumber);
    }

    return phones.size;
  }, [groupId, groups, selectedContactIds, allContacts]);

  const navigateAfterSend = (result: {
    mode?: 'local' | 'clicksend';
    campaignId?: string;
    smsCampaignId?: number;
  }) => {
    if (result.mode === 'local' && result.campaignId) {
      navigate(`/campaigns/${result.campaignId}`, { replace: true });
      return;
    }

    if (result.smsCampaignId) {
      navigate(`/campaigns/clicksend/${result.smsCampaignId}`, { replace: true });
      return;
    }

    if (result.campaignId) {
      navigate(`/campaigns/${result.campaignId}`, { replace: true });
      return;
    }

    // Send succeeded but no detail id — still leave the form.
    navigate('/campaigns', { replace: true });
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
    if (!from.trim()) {
      showError('Enter a sender before sending.');
      return;
    }
    if (!message.trim()) {
      showError('Write a message before sending.');
      return;
    }
    if (!groupId && selectedContactIds.size === 0) {
      showError('Select a group or at least one contact.');
      return;
    }

    try {
      const result = await sendCampaign.mutateAsync({
        ...buildPayload(),
        listId: pricePreview?.listId,
      });
      showSuccess('Campaign sent.');
      navigateAfterSend(result);
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to send campaign.'));
    }
  };

  const busy = calculatePrice.isPending || sendCampaign.isPending;

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar
        title="Send SMS campaign"
        onBack={() => navigate('/campaigns')}
      />

      <Container
        maxWidth="sm"
        sx={{ py: 1.5, px: 2, pb: 'calc(168px + env(safe-area-inset-bottom))' }}
      >
        <Stack spacing={1.5}>
          <Alert severity="info" sx={{ py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}>
            Recipients are messaged through ClickSend. After sending, you&apos;ll
            see delivery details for this campaign.
          </Alert>

          <TextField
            label="Campaign name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            fullWidth
            size="small"
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
            size="small"
            helperText="Alphanumeric brand or phone number"
          />

          {(templatesQuery.data?.length ?? 0) > 0 && (
            <FormControl fullWidth size="small">
              <InputLabel id="template-select">Use template</InputLabel>
              <Select
                labelId="template-select"
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
                    dense
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
            minRows={3}
            fullWidth
            size="small"
            helperText={`${message.length}/1600`}
            inputProps={{ maxLength: 1600 }}
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
              Recipients ({recipientCount})
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
              <InputLabel id="group-select">Contact group</InputLabel>
              <Select
                labelId="group-select"
                label="Contact group"
                value={groupId}
                onChange={(event) => {
                  setGroupId(event.target.value);
                  setPricePreview(null);
                }}
              >
                <MenuItem value="" dense>
                  <em>No group selected</em>
                </MenuItem>
                {groups?.map((group) => (
                  <MenuItem key={group.id} value={group.id} dense>
                    {group.name} ({group.memberCount})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              fullWidth
              placeholder="Search name or phone"
              value={recipientSearch}
              onChange={(event) => setRecipientSearch(event.target.value)}
              sx={{ mb: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FiSearch size={16} color="#9aa0a6" />
                  </InputAdornment>
                ),
              }}
            />

            {filteredContacts.length > 0 && (
              <SelectAllContactsControl
                contacts={filteredContacts}
                selectedIds={selectedContactIds}
                onChange={(nextVisible) => {
                  setSelectedContactIds((current) => {
                    const visibleIds = new Set(
                      filteredContacts.map((contact) => contact.id),
                    );
                    const merged = new Set(current);
                    for (const id of visibleIds) {
                      merged.delete(id);
                    }
                    for (const id of nextVisible) {
                      merged.add(id);
                    }
                    return merged;
                  });
                  setPricePreview(null);
                }}
              />
            )}
            <ContactPicker
              search={recipientSearch}
              selectedIds={selectedContactIds}
              onToggle={(id) => {
                toggleContact(id);
                setPricePreview(null);
              }}
            />
          </Box>

          {pricePreview && (
            <Card variant="outlined" sx={{ borderRadius: 0 }}>
              <CardContent sx={{ py: 1.25, px: 1.5, '&:last-child': { pb: 1.25 } }}>
                <Typography variant="subtitle2">
                  Estimated price:{' '}
                  {pricePreview.currency ? `${pricePreview.currency} ` : ''}
                  {pricePreview.price.toFixed(4)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {pricePreview.recipientCount} recipients
                  {pricePreview.listId
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
          p: 1.5,
          pb: 'calc(12px + env(safe-area-inset-bottom))',
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="sm" disableGutters>
          <Stack spacing={0.75}>
            <Button
              variant="outlined"
              onClick={() => void handlePrice()}
              disabled={busy || recipientCount === 0 || !from.trim()}
              fullWidth
              sx={{ borderRadius: 0 }}
            >
              {calculatePrice.isPending ? (
                <CircularProgress size={20} />
              ) : (
                'Calculate price'
              )}
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleSend()}
              disabled={
                busy || recipientCount === 0 || !message.trim() || !from.trim()
              }
              fullWidth
              sx={{ borderRadius: 0 }}
            >
              {sendCampaign.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                `Send to ${recipientCount} recipient${
                  recipientCount === 1 ? '' : 's'
                }`
              )}
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
