import { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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

type TemplateState = {
  template: {
    name: string;
    language: string;
    preview: string;
    category: string | null;
    variables: Array<{
      component: 'body' | 'header';
      index: number;
      label: string;
    }>;
  };
};

export function SendTemplatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError } = useFeedback();
  const templateState = location.state as TemplateState | null;
  const template = templateState?.template;
  const { whatsappEnabled, smsEnabled, isLoading: featuresLoading } =
    useMessagingFeatures();

  const { data: groups } = trpc.listContactGroups.useQuery();
  const { allContacts: contacts } = useContacts();
  const sendCampaign = trpc.sendWhatsAppTemplateCampaign.useMutation();

  const [groupId, setGroupId] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  const variableFields = useMemo(() => template?.variables ?? [], [template]);

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

  if (featuresLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!whatsappEnabled) {
    return <Navigate to={smsEnabled ? '/templates/custom' : '/home'} replace />;
  }

  const handleSend = async () => {
    if (!template) {
      return;
    }

    if (!groupId && selectedContactIds.size === 0) {
      showError('Select a group or at least one contact.');
      return;
    }

    const missingVariable = variableFields.find((variable) => {
      const key = `${variable.component}:${variable.index}`;
      return !variableValues[key]?.trim();
    });

    if (missingVariable) {
      showError(`Fill in ${missingVariable.label}.`);
      return;
    }

    try {
      const result = await sendCampaign.mutateAsync({
        templateName: template.name,
        language: template.language,
        groupId: groupId || undefined,
        contactIds: [...selectedContactIds],
        variables: variableFields.map((variable) => ({
          component: variable.component,
          index: variable.index,
          value: variableValues[`${variable.component}:${variable.index}`].trim(),
        })),
      });

      navigate(`/campaigns/${result.id}`);
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to send template campaign.'));
    }
  };

  if (!template) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          No template selected. Choose a template first.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/templates')}>
          Browse templates
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar title="Send template" onBack={() => navigate('/templates')} />

      <Container
        maxWidth="sm"
        sx={{ py: 3, pb: 'calc(96px + env(safe-area-inset-bottom))' }}
      >
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Typography variant="h6">{template.name}</Typography>
                  <Chip label={template.language} size="small" />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {template.preview}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          {variableFields.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Template variables
              </Typography>
              <Stack spacing={2}>
                {variableFields.map((variable) => {
                  const key = `${variable.component}:${variable.index}`;

                  return (
                    <TextField
                      key={key}
                      label={variable.label}
                      value={variableValues[key] ?? ''}
                      onChange={(event) =>
                        setVariableValues((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      fullWidth
                    />
                  );
                })}
              </Stack>
            </Box>
          )}

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
                  sx={{ cursor: 'pointer', border: 0, bgcolor: 'transparent', color: 'primary.main' }}
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

            <ContactPicker
              selectedIds={selectedContactIds}
              onToggle={toggleContact}
            />
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
            disabled={sendCampaign.isPending || recipientCount === 0}
            fullWidth
          >
            {sendCampaign.isPending ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              `Send to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`
            )}
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
