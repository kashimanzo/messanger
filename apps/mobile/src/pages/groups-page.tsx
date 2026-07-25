import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
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
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { MobileAppBar } from '../components/mobile-app-bar';
import { trpc } from '../lib/trpc';

export function GroupsPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: groups, isLoading, error } = trpc.listContactGroups.useQuery();
  const deleteGroup = trpc.deleteContactGroup.useMutation({
    onSuccess: async () => {
      await utils.listContactGroups.invalidate();
      setDeleteTargetId(null);
    },
  });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteTargetId) {
      return;
    }

    await deleteGroup.mutateAsync({ id: deleteTargetId });
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar title="Contact groups" onBack={() => navigate('/home')} />

      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error.message}</Alert>}

        {!isLoading && !error && groups?.length === 0 && (
          <Stack spacing={2} sx={{ py: 4 }}>
            <Typography color="text.secondary" textAlign="center">
              Create a group to send templates to multiple contacts at once.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/groups/new')}>
              Create group
            </Button>
          </Stack>
        )}

        {groups && groups.length > 0 && (
          <List
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {groups.map((group) => (
              <ListItem
                key={group.id}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label={`delete ${group.name}`}
                    onClick={() => setDeleteTargetId(group.id)}
                  >
                    <FiTrash2 />
                  </IconButton>
                }
              >
                <ListItemButton onClick={() => navigate(`/groups/${group.id}/edit`)}>
                  <ListItemText
                    primary={group.name}
                    secondary={`${group.memberCount} contact${group.memberCount === 1 ? '' : 's'}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Container>

      <Fab
        color="primary"
        aria-label="create group"
        onClick={() => navigate('/groups/new')}
        sx={{
          position: 'fixed',
          bottom: 'calc(24px + env(safe-area-inset-bottom))',
          right: 'calc(24px + env(safe-area-inset-right))',
        }}
      >
        <FiPlus size={24} />
      </Fab>

      <Dialog open={Boolean(deleteTargetId)} onClose={() => setDeleteTargetId(null)}>
        <DialogTitle>Delete group?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Contacts in this group will not be deleted, only the group itself.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTargetId(null)}>Cancel</Button>
          <Button color="error" onClick={handleDelete} disabled={deleteGroup.isPending}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
