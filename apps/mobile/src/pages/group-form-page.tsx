import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  ContactPicker,
  SelectAllContactsControl,
} from '../components/contact-picker';
import { useFeedback } from '../components/feedback-provider';
import { MobileAppBar } from '../components/mobile-app-bar';
import {
  formatGroupMembershipLabel,
  useContactGroupMemberships,
} from '../hooks/use-contact-group-memberships';
import { useContacts } from '../hooks/use-contacts';
import { getErrorMessage } from '../lib/get-error-message';
import { trpc } from '../lib/trpc';

export function GroupFormPage() {
  const navigate = useNavigate();
  const { showError } = useFeedback();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const utils = trpc.useUtils();

  const { data: group, isLoading } = trpc.getContactGroup.useQuery(
    { id: id ?? '' },
    { enabled: isEditing },
  );
  const { allContacts: contacts } = useContacts();
  const memberships = useContactGroupMemberships();
  const createGroup = trpc.createContactGroup.useMutation();
  const updateGroup = trpc.updateContactGroup.useMutation();

  const [name, setName] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(
    new Set(),
  );
  const [skipGrouped, setSkipGrouped] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setSelectedContactIds(new Set(group.members.map((member) => member.id)));
    }
  }, [group]);

  const isVisibleContact = useMemo(() => {
    return (contactId: string) => {
      if (!skipGrouped) return true;
      const groups = memberships.byContactId[contactId] ?? [];
      if (groups.length === 0) return true;
      if (id) {
        return groups.some((entry) => entry.id === id);
      }
      return false;
    };
  }, [skipGrouped, memberships.byContactId, id]);

  const visibleContacts = useMemo(
    () => (contacts ?? []).filter((contact) => isVisibleContact(contact.id)),
    [contacts, isVisibleContact],
  );

  const groupLabelsById = useMemo(() => {
    const labels: Record<string, string | null> = {};
    for (const contact of contacts ?? []) {
      labels[contact.id] = formatGroupMembershipLabel(
        memberships.byContactId[contact.id],
      );
    }
    return labels;
  }, [contacts, memberships.byContactId]);

  const skippedCount = useMemo(() => {
    if (!skipGrouped || !contacts) return 0;
    return contacts.length - visibleContacts.length;
  }, [skipGrouped, contacts, visibleContacts.length]);

  const handleSkipGroupedChange = (checked: boolean) => {
    setSkipGrouped(checked);
    if (!checked) return;
    setSelectedContactIds((current) => {
      const next = new Set<string>();
      for (const contactId of current) {
        const groups = memberships.byContactId[contactId] ?? [];
        if (groups.length === 0) {
          next.add(contactId);
          continue;
        }
        if (id && groups.some((entry) => entry.id === id)) {
          next.add(contactId);
        }
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!name.trim()) {
      const message = 'Enter a group name.';
      setErrorMessage(message);
      showError(message);
      return;
    }

    if (selectedContactIds.size === 0) {
      const message = 'Select at least one contact for this group.';
      setErrorMessage(message);
      showError(message);
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        contactIds: [...selectedContactIds],
      };

      if (isEditing && id) {
        await updateGroup.mutateAsync({ id, data: payload });
      } else {
        await createGroup.mutateAsync(payload);
      }

      await Promise.all([
        utils.listContactGroups.invalidate(),
        utils.listContactGroupMemberships.invalidate(),
      ]);
      navigate('/groups');
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to save group.');
      setErrorMessage(message);
      showError(message);
    }
  };

  const isPending = createGroup.isPending || updateGroup.isPending;

  return (
    <Box
      sx={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      <MobileAppBar
        title={isEditing ? 'Edit group' : 'New group'}
        onBack={() => navigate('/groups')}
      />

      {isLoading && isEditing ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ px: 2, pt: 2, pb: 1, flexShrink: 0 }}>
            <Stack spacing={1.25}>
              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

              <TextField
                label="Group name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                fullWidth
                size="small"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={skipGrouped}
                    onChange={(event) =>
                      handleSkipGroupedChange(event.target.checked)
                    }
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    {isEditing
                      ? 'Hide contacts already in other groups'
                      : 'Hide contacts already in a group'}
                  </Typography>
                }
                sx={{ m: 0, alignItems: 'center' }}
              />

              {skipGrouped && skippedCount > 0 ? (
                <Typography variant="caption" color="text.secondary">
                  Hiding {skippedCount} contact
                  {skippedCount === 1 ? '' : 's'} already in a group
                  {isEditing ? ' (this group’s members stay visible)' : ''}.
                </Typography>
              ) : null}

              {memberships.ungroupedCount > 0 ? (
                <Typography variant="caption" color="text.secondary">
                  {memberships.ungroupedCount} contact
                  {memberships.ungroupedCount === 1 ? '' : 's'} not in any
                  group.
                </Typography>
              ) : null}

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Contacts
                </Typography>
                {visibleContacts.length > 0 && (
                  <SelectAllContactsControl
                    contacts={visibleContacts}
                    selectedIds={selectedContactIds}
                    onChange={setSelectedContactIds}
                  />
                )}
              </Box>
            </Stack>
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              px: 2,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <ContactPicker
              items={visibleContacts}
              selectedIds={selectedContactIds}
              onChange={setSelectedContactIds}
              groupLabelsById={groupLabelsById}
              height="100%"
              emptyMessage={
                skipGrouped
                  ? 'No ungrouped contacts left to add.'
                  : 'No contacts found. Add contacts to your phonebook first.'
              }
            />
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              px: 2,
              pt: 1.5,
              pb: 'calc(12px + max(16px, env(safe-area-inset-bottom, 0px)))',
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => void handleSubmit()}
              disabled={isPending}
              fullWidth
              sx={{ borderRadius: 0 }}
            >
              {isPending ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                `${isEditing ? 'Update' : 'Create'} group (${selectedContactIds.size})`
              )}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
