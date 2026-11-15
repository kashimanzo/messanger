import { memo, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Fab,
  IconButton,
  InputAdornment,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { FiDownload, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import { useFeedback } from '../components/feedback-provider';
import { MobileAppBar } from '../components/mobile-app-bar';
import { VirtualList } from '../components/virtual-list';
import {
  formatGroupMembershipLabel,
  useContactGroupMemberships,
} from '../hooks/use-contact-group-memberships';
import { useContacts } from '../hooks/use-contacts';
import { getErrorMessage } from '../lib/get-error-message';
import { trpc } from '../lib/trpc';
import { useContactsStore } from '../stores/contacts-store';

const PHONEBOOK_ROW_HEIGHT = 76;

type MembershipFilter = 'all' | 'grouped' | 'ungrouped';

type PhonebookRowProps = {
  id: string;
  name: string;
  phoneNumber: string;
  email: string | null;
  groupLabel: string | null;
  showDivider: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
};

const PhonebookRow = memo(function PhonebookRow({
  id,
  name,
  phoneNumber,
  email,
  groupLabel,
  showDivider,
  onOpen,
  onDelete,
}: PhonebookRowProps) {
  return (
    <ListItem
      disablePadding
      divider={showDivider}
      secondaryAction={
        <IconButton
          edge="end"
          aria-label={`delete ${name}`}
          onClick={() => onDelete(id)}
          sx={{ mr: 0.5 }}
        >
          <FiTrash2 />
        </IconButton>
      }
      sx={{ alignItems: 'stretch' }}
    >
      <ListItemButton
        onClick={() => onOpen(id)}
        sx={{ py: 1.25, pr: 7, minHeight: PHONEBOOK_ROW_HEIGHT }}
      >
        <ListItemAvatar>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 36,
              height: 36,
              fontSize: 14,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={name}
          secondary={
            <>
              +{phoneNumber}
              {email ? ` · ${email}` : ''}
              <Box
                component="span"
                sx={{
                  display: 'block',
                  color: groupLabel ? 'text.secondary' : 'warning.main',
                  fontSize: '0.75rem',
                }}
              >
                {groupLabel ? `In: ${groupLabel}` : 'Not in any group'}
              </Box>
            </>
          }
          sx={{ '& .MuiListItemText-primary': { fontWeight: 600 } }}
        />
      </ListItemButton>
    </ListItem>
  );
});

function parseFilter(value: string | null): MembershipFilter {
  if (value === 'grouped' || value === 'ungrouped') return value;
  return 'all';
}

export function PhonebookPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess } = useFeedback();
  const [search, setSearch] = useState('');
  const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>(
    () => parseFilter(searchParams.get('filter')),
  );
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const { contacts, isLoading, error, refresh } = useContacts(search);
  const memberships = useContactGroupMemberships();
  const removeContact = useContactsStore((state) => state.removeContact);
  const deleteContact = trpc.deleteContact.useMutation({
    onSuccess: async (_result, variables) => {
      removeContact(variables.id);
      await Promise.all([
        utils.getContactStats.invalidate(),
        utils.listContactGroupMemberships.invalidate(),
      ]);
      setDeleteTargetId(null);
      showSuccess('Contact deleted.');
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to delete contact.'));
    },
  });

  useEffect(() => {
    const next = parseFilter(searchParams.get('filter'));
    setMembershipFilter(next);
  }, [searchParams]);

  const filteredContacts = useMemo(() => {
    if (membershipFilter === 'all') return contacts;
    if (membershipFilter === 'ungrouped') {
      return contacts.filter((contact) => memberships.ungroupedIdSet.has(contact.id));
    }
    return contacts.filter((contact) => memberships.isInAnyGroup(contact.id));
  }, [contacts, membershipFilter, memberships.ungroupedIdSet, memberships.isInAnyGroup]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) {
      return 'No contacts match your search.';
    }
    if (membershipFilter === 'ungrouped') {
      return 'Every contact is already in a group.';
    }
    if (membershipFilter === 'grouped') {
      return 'No contacts are in a group yet.';
    }
    return 'Your phonebook is empty. Add a contact or import from your device.';
  }, [search, membershipFilter]);

  const handleFilterChange = (_: unknown, value: MembershipFilter) => {
    if (!value) return;
    setMembershipFilter(value);
    if (value === 'all') {
      searchParams.delete('filter');
      setSearchParams(searchParams, { replace: true });
      return;
    }
    setSearchParams({ filter: value }, { replace: true });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {
      return;
    }

    try {
      await deleteContact.mutateAsync({ id: deleteTargetId });
    } catch {
      // onError already surfaces the message
    }
  };

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
        title="Phonebook"
        onBack={() => navigate('/home')}
        rightAction={
          <IconButton
            onClick={() => navigate('/phonebook/import')}
            aria-label="import contacts"
          >
            <FiDownload />
          </IconButton>
        }
      />

      <Container
        maxWidth="sm"
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          py: 2,
          pb: 'calc(88px + max(20px, env(safe-area-inset-bottom, 0px)))',
        }}
      >
        <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
          <TextField
            placeholder="Search contacts"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <FiSearch />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Tabs
            value={membershipFilter}
            onChange={handleFilterChange}
            variant="fullWidth"
            sx={{
              minHeight: 40,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 40,
                py: 0.75,
                fontSize: '0.75rem',
                textTransform: 'none',
              },
            }}
          >
            <Tab
              label={`All (${memberships.totalContacts || contacts.length})`}
              value="all"
            />
            <Tab
              label={`In a group (${memberships.groupedCount})`}
              value="grouped"
            />
            <Tab
              label={`Ungrouped (${memberships.ungroupedCount})`}
              value="ungrouped"
            />
          </Tabs>

          {membershipFilter === 'ungrouped' && memberships.ungroupedCount > 0 ? (
            <Alert severity="info" sx={{ py: 0.25 }}>
              These contacts are not in any contact group yet.
            </Alert>
          ) : null}

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => void refresh()}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {!isLoading && !error && filteredContacts.length === 0 && (
            <Stack spacing={2} sx={{ py: 4 }}>
              <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
                {emptyMessage}
              </Typography>
              {membershipFilter === 'all' ? (
                <>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/phonebook/new')}
                  >
                    Add contact
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/phonebook/import')}
                  >
                    Import from device
                  </Button>
                </>
              ) : null}
              {membershipFilter === 'ungrouped' ? (
                <Button
                  variant="contained"
                  onClick={() => navigate('/groups/new')}
                >
                  Create group
                </Button>
              ) : null}
            </Stack>
          )}

          {!isLoading && !error && filteredContacts.length > 0 && (
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <VirtualList
                items={filteredContacts}
                estimateSize={PHONEBOOK_ROW_HEIGHT}
                height="100%"
                maxHeight="100%"
                getItemKey={(contact) => contact.id}
                sx={{
                  height: '100%',
                  bgcolor: 'background.paper',
                  borderRadius: 0,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
                renderItem={(contact, index) => (
                  <PhonebookRow
                    id={contact.id}
                    name={contact.name}
                    phoneNumber={contact.phoneNumber}
                    email={contact.email}
                    groupLabel={formatGroupMembershipLabel(
                      memberships.byContactId[contact.id],
                    )}
                    showDivider={index < filteredContacts.length - 1}
                    onOpen={(contactId) =>
                      navigate(`/phonebook/${contactId}/edit`)
                    }
                    onDelete={setDeleteTargetId}
                  />
                )}
              />
            </Box>
          )}
        </Stack>
      </Container>

      <Fab
        color="primary"
        aria-label="add contact"
        onClick={() => navigate('/phonebook/new')}
        sx={{
          position: 'fixed',
          bottom: 'calc(24px + max(20px, env(safe-area-inset-bottom, 0px)))',
          right: 'calc(24px + env(safe-area-inset-right, 0px))',
        }}
      >
        <FiPlus size={24} />
      </Fab>

      <Dialog
        open={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
      >
        <DialogTitle>Delete contact?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This contact will be removed from your phonebook.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTargetId(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => void handleConfirmDelete()}
            disabled={deleteContact.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
