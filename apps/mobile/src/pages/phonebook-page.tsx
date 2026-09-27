import { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TextField,
  Typography,
} from '@mui/material';
import { FiDownload, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import { useFeedback } from '../components/feedback-provider';
import { MobileAppBar } from '../components/mobile-app-bar';
import { VirtualList } from '../components/virtual-list';
import { useContacts } from '../hooks/use-contacts';
import { getErrorMessage } from '../lib/get-error-message';
import { trpc } from '../lib/trpc';
import { useContactsStore } from '../stores/contacts-store';

const PHONEBOOK_ROW_HEIGHT = 72;

type PhonebookRowProps = {
  id: string;
  name: string;
  phoneNumber: string;
  email: string | null;
  showDivider: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
};

const PhonebookRow = memo(function PhonebookRow({
  id,
  name,
  phoneNumber,
  email,
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
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14 }}>
            {name.charAt(0).toUpperCase()}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={name}
          secondary={
            <>
              +{phoneNumber}
              {email ? ` · ${email}` : ''}
            </>
          }
          sx={{ '& .MuiListItemText-primary': { fontWeight: 600 } }}
        />
      </ListItemButton>
    </ListItem>
  );
});

export function PhonebookPage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useFeedback();
  const [search, setSearch] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const { contacts, isLoading, error, refresh } = useContacts(search);
  const removeContact = useContactsStore((state) => state.removeContact);
  const deleteContact = trpc.deleteContact.useMutation({
    onSuccess: async (_result, variables) => {
      removeContact(variables.id);
      await utils.getContactStats.invalidate();
      setDeleteTargetId(null);
      showSuccess('Contact deleted.');
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to delete contact.'));
    },
  });

  const emptyMessage = useMemo(() => {
    if (search.trim()) {
      return 'No contacts match your search.';
    }

    return 'Your phonebook is empty. Add a contact or import from your device.';
  }, [search]);

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
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar
        title="Phonebook"
        onBack={() => navigate('/home')}
        rightAction={
          <IconButton onClick={() => navigate('/phonebook/import')} aria-label="import contacts">
            <FiDownload />
          </IconButton>
        }
      />

      <Container maxWidth="sm" sx={{ py: 3, pb: 12 }}>
        <Stack spacing={2}>
          <TextField
            placeholder="Search contacts"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
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

          {!isLoading && !error && contacts.length === 0 && (
            <Stack spacing={2} sx={{ py: 4 }}>
              <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
                {emptyMessage}
              </Typography>
              <Button variant="contained" onClick={() => navigate('/phonebook/new')}>
                Add contact
              </Button>
              <Button variant="outlined" onClick={() => navigate('/phonebook/import')}>
                Import from device
              </Button>
            </Stack>
          )}

          {!isLoading && !error && contacts.length > 0 && (
            <VirtualList
              items={contacts}
              estimateSize={PHONEBOOK_ROW_HEIGHT}
              maxHeight="calc(100dvh - 220px)"
              getItemKey={(contact) => contact.id}
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
              renderItem={(contact, index) => (
                <PhonebookRow
                  id={contact.id}
                  name={contact.name}
                  phoneNumber={contact.phoneNumber}
                  email={contact.email}
                  showDivider={index < contacts.length - 1}
                  onOpen={(id) => navigate(`/phonebook/${id}/edit`)}
                  onDelete={setDeleteTargetId}
                />
              )}
            />
          )}
        </Stack>
      </Container>

      <Fab
        color="primary"
        aria-label="add contact"
        onClick={() => navigate('/phonebook/new')}
        sx={{
          position: 'fixed',
          bottom: 'calc(24px + env(safe-area-inset-bottom))',
          right: 'calc(24px + env(safe-area-inset-right))',
        }}
      >
        <FiPlus size={24} />
      </Fab>

      <Dialog open={Boolean(deleteTargetId)} onClose={() => setDeleteTargetId(null)}>
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
            onClick={handleConfirmDelete}
            disabled={deleteContact.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
