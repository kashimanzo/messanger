import { useMemo, useState } from 'react';
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
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FiDownload, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import { MobileAppBar } from '../components/mobile-app-bar';
import { useContacts } from '../hooks/use-contacts';
import { trpc } from '../lib/trpc';
import { useContactsStore } from '../stores/contacts-store';

export function PhonebookPage() {
  const navigate = useNavigate();
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

    await deleteContact.mutateAsync({ id: deleteTargetId });
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
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FiSearch />
                </InputAdornment>
              ),
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
              <Typography color="text.secondary" textAlign="center">
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
            <List
              disablePadding
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              {contacts.map((contact, index) => (
                <ListItem
                  key={contact.id}
                  disablePadding
                  divider={index < contacts.length - 1}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label={`delete ${contact.name}`}
                      onClick={() => setDeleteTargetId(contact.id)}
                      sx={{ mr: 0.5 }}
                    >
                      <FiTrash2 />
                    </IconButton>
                  }
                  sx={{ alignItems: 'stretch' }}
                >
                  <ListItemButton
                    onClick={() => navigate(`/phonebook/${contact.id}/edit`)}
                    sx={{ py: 1.5, pr: 7 }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {contact.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={contact.name}
                      secondary={
                        <>
                          +{contact.phoneNumber}
                          {contact.email ? ` · ${contact.email}` : ''}
                        </>
                      }
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
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
