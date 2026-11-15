import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { useFeedback } from '../components/feedback-provider';
import { MobileAppBar } from '../components/mobile-app-bar';
import {
  formatPriceLabel,
  PriceResultDialog,
} from '../components/price-result-dialog';
import {
  buildRecipientPayload,
  countRecipients,
  RecipientTargetSection,
  type RecipientMode,
} from '../components/recipient-target-section';
import { useContacts } from '../hooks/use-contacts';
import { getErrorMessage } from '../lib/get-error-message';
import { trpc } from '../lib/trpc';

export function SendClickSendCampaignPage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useFeedback();
  const clickSendFrom = import.meta.env.VITE_CLICKSEND_FROM?.trim() || null;
  const { data: groups } = trpc.listContactGroups.useQuery(
    { includeMembers: true },
    { enabled: true },
  );
  const [recipientSearch, setRecipientSearch] = useState('');
  const { allContacts } = useContacts();
  const templatesQuery = trpc.listClickSendTemplates.useQuery(undefined, {
    enabled: true,
  });

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [from, setFrom] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [recipientMode, setRecipientMode] =
    useState<RecipientMode>('contacts');
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
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);

  useEffect(() => {
    if (clickSendFrom && !from) {
      setFrom(clickSendFrom);
    }
  }, [clickSendFrom, from]);

  const calculatePrice = trpc.calculateClickSendCampaignPrice.useMutation();
  const sendCampaign = trpc.sendClickSendCampaign.useMutation();

  const phonebookContacts = useMemo(
    () =>
      (allContacts ?? []).map((contact) => ({
        id: contact.id,
        name: contact.name,
        phoneNumber: contact.phoneNumber,
      })),
    [allContacts],
  );

  const recipientCount = useMemo(
    () =>
      countRecipients({
        mode: recipientMode,
        groupId,
        groups,
        selectedContactIds,
        phonebookContacts,
      }),
    [recipientMode, groupId, groups, selectedContactIds, phonebookContacts],
  );

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
      navigate(`/campaigns/clicksend/${result.smsCampaignId}`, {
        replace: true,
      });
      return;
    }
    if (result.campaignId) {
      navigate(`/campaigns/${result.campaignId}`, { replace: true });
      return;
    }
    navigate('/campaigns', { replace: true });
  };

  const buildPayload = () => {
    const recipients = buildRecipientPayload({
      mode: recipientMode,
      groupId,
      selectedContactIds,
    });
    return {
      name: name.trim() || `SMS ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
      message: message.trim(),
      from: from.trim() || undefined,
      ...recipients,
    };
  };

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
    setPriceDialogOpen(false);
  };

  const handleModeChange = (mode: RecipientMode) => {
    setRecipientMode(mode);
    setSelectedContactIds(new Set());
    setGroupId('');
    setRecipientSearch('');
    setPricePreview(null);
    setPriceDialogOpen(false);
  };

  const validateRecipients = () => {
    if (recipientMode === 'group_all' && !groupId) {
      showError('Select a contact group.');
      return false;
    }
    if (
      (recipientMode === 'contacts' || recipientMode === 'group_members') &&
      selectedContactIds.size === 0
    ) {
      showError(
        recipientMode === 'group_members'
          ? 'Select at least one person from the group.'
          : 'Select at least one contact.',
      );
      return false;
    }
    if (recipientMode === 'group_members' && !groupId) {
      showError('Select a contact group first.');
      return false;
    }
    if (recipientCount === 0) {
      showError('No recipients selected.');
      return false;
    }
    return true;
  };

  const handlePrice = async () => {
    setPricePreview(null);
    setPriceDialogOpen(false);
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
    if (!validateRecipients()) return;

    try {
      const result = await calculatePrice.mutateAsync(buildPayload());
      setPricePreview({
        price: result.price,
        currency: result.currency,
        recipientCount: result.recipientCount,
        listId: result.listId ?? undefined,
        mode: result.mode,
      });
      setPriceDialogOpen(true);
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
    if (!validateRecipients()) return;

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
  const priceLabel = formatPriceLabel(pricePreview);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar
        title="Send SMS campaign"
        onBack={() => navigate('/campaigns')}
      />

      <Container
        maxWidth="sm"
        sx={{
          py: 1.5,
          px: 2,
          pb: 'calc(168px + max(20px, env(safe-area-inset-bottom, 0px)))',
        }}
      >
        <Stack spacing={1.5}>
          <Alert
            severity="info"
            sx={{ py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}
          >
            Choose who to message: selected contacts, a whole group, or only
            some people from a group.
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
              setPriceDialogOpen(false);
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
              setPriceDialogOpen(false);
            }}
            multiline
            minRows={3}
            fullWidth
            size="small"
            helperText={`${message.length}/1600`}
            slotProps={{ htmlInput: { maxLength: 1600 } }}
          />

          <RecipientTargetSection
            mode={recipientMode}
            onModeChange={handleModeChange}
            groups={groups}
            groupId={groupId}
            onGroupIdChange={(next) => {
              setGroupId(next);
              setSelectedContactIds(new Set());
              setPricePreview(null);
              setPriceDialogOpen(false);
            }}
            selectedContactIds={selectedContactIds}
            onSelectedContactIdsChange={(next) => {
              setSelectedContactIds(next);
              setPricePreview(null);
              setPriceDialogOpen(false);
            }}
            search={recipientSearch}
            onSearchChange={setRecipientSearch}
            phonebookContacts={phonebookContacts}
            recipientCount={recipientCount}
          />
        </Stack>
      </Container>

      <PriceResultDialog
        open={priceDialogOpen}
        result={pricePreview}
        onClose={() => setPriceDialogOpen(false)}
        onSend={() => void handleSend()}
        sendPending={sendCampaign.isPending}
        sendLabel={
          priceLabel
            ? `Send for ${priceLabel}`
            : `Send to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`
        }
      />

      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          p: 1.5,
          pb: 'calc(12px + max(20px, env(safe-area-inset-bottom, 0px)))',
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
