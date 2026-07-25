import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  Fab,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { MobileAppBar } from '../components/mobile-app-bar';
import {
  FiBook,
  FiDollarSign,
  FiDownload,
  FiLayers,
  FiList,
  FiLogOut,
  FiMessageSquare,
  FiPlus,
  FiSend,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';
import { authClient, clearMobileAuthSession } from '../lib/auth';
import { trpc } from '../lib/trpc';
import { useAuthStore } from '../stores/auth-store';
import { useContactsStore } from '../stores/contacts-store';

export function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [fabAnchor, setFabAnchor] = useState<HTMLElement | null>(null);
  const { data: profile } = trpc.getProfile.useQuery(undefined, {
    retry: false,
  });
  const { data: contactStats } = trpc.getContactStats.useQuery();
  const { data: groups } = trpc.listContactGroups.useQuery();
  const { data: campaigns } = trpc.listCampaigns.useQuery({ limit: 5 });

  const handleSignOut = async () => {
    await authClient.signOut();
    clearMobileAuthSession();
    setUser(null);
    useContactsStore.getState().reset();
    navigate('/login');
  };

  const displayUser = profile ?? user;

  const recentCampaignCount = useMemo(() => {
    if (!campaigns?.length) return undefined;
    return `${campaigns.length} recent`;
  }, [campaigns]);

  const phonebookActions = useMemo(
    () => [
      {
        title: 'Sent campaigns',
        description: 'Track queued SMS campaigns and delivery progress',
        icon: <FiList size={22} />,
        path: '/campaigns',
        chip: recentCampaignCount,
      },
      {
        title: 'SMS templates',
        description: 'Create and manage ClickSend SMS templates',
        icon: <FiMessageSquare size={22} />,
        path: '/templates',
        chip: 'ClickSend',
      },
      {
        title: 'Check campaign price',
        description: 'See what ClickSend will charge before you send',
        icon: <FiDollarSign size={22} />,
        path: '/campaigns/clicksend/price',
        chip: undefined as string | undefined,
      },
      {
        title: 'Send SMS campaign',
        description: 'Price and send bulk SMS via ClickSend campaigns',
        icon: <FiSend size={22} />,
        path: '/campaigns/clicksend/new',
        chip: undefined as string | undefined,
      },
      {
        title: 'Contact groups',
        description: 'Organize contacts into groups for bulk sending',
        icon: <FiLayers size={22} />,
        path: '/groups',
        chip: groups ? `${groups.length} groups` : undefined,
      },
      {
        title: 'View phonebook',
        description: 'Browse, search, and manage saved contacts',
        icon: <FiUsers size={22} />,
        path: '/phonebook',
        chip: contactStats ? `${contactStats.total} saved` : undefined,
      },
      {
        title: 'Add contact',
        description: 'Create a new contact in your app phonebook',
        icon: <FiUserPlus size={22} />,
        path: '/phonebook/new',
        chip: undefined as string | undefined,
      },
      {
        title: 'Import from device',
        description: 'Pull contacts from your phone and save them here',
        icon: <FiDownload size={22} />,
        path: '/phonebook/import',
        chip: contactStats ? `${contactStats.imported} imported` : undefined,
      },
    ],
    [contactStats, groups, recentCampaignCount],
  );

  const sendMenuActions: Array<{ name: string; icon: ReactNode; path: string }> = [
    {
      name: 'Check campaign price',
      icon: <FiDollarSign size={18} />,
      path: '/campaigns/clicksend/price',
    },
    {
      name: 'Send SMS campaign',
      icon: <FiSend size={18} />,
      path: '/campaigns/clicksend/new',
    },
    {
      name: 'SMS templates',
      icon: <FiMessageSquare size={18} />,
      path: '/templates',
    },
    {
      name: 'Sent campaigns',
      icon: <FiList size={18} />,
      path: '/campaigns',
    },
  ];

  const openSendPath = (path: string) => {
    setFabAnchor(null);
    navigate(path);
  };

  const handleFabClick = (event: MouseEvent<HTMLElement>) => {
    setFabAnchor(event.currentTarget);
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar
        title="Bulk Messanger"
        rightAction={
          <Button
            variant="outlined"
            size="small"
            startIcon={<FiLogOut />}
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        }
      />

      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {displayUser?.name}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Phonebook & SMS campaigns
            </Typography>
          </Box>

          <Stack spacing={2}>
            {phonebookActions.map((action, index) => (
              <Card key={`${action.path}:${action.title}:${index}`}>
                <CardActionArea onClick={() => navigate(action.path)}>
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {action.icon}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="h6">{action.title}</Typography>
                          {action.chip && (
                            <Chip
                              label={action.chip}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {action.description}
                        </Typography>
                      </Box>
                      <ListItemIcon sx={{ minWidth: 0, color: 'text.secondary' }}>
                        <FiBook />
                      </ListItemIcon>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>

          {contactStats && (
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`${contactStats.total} total`} />
                  <Chip label={`${contactStats.manual} manual`} variant="outlined" />
                  <Chip label={`${contactStats.imported} imported`} variant="outlined" />
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Container>

      <Fab
        color="primary"
        aria-label="Send message"
        aria-controls={fabAnchor ? 'send-message-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={fabAnchor ? 'true' : undefined}
        onClick={handleFabClick}
        sx={{
          position: 'fixed',
          bottom: 'calc(24px + env(safe-area-inset-bottom))',
          right: 'calc(24px + env(safe-area-inset-right))',
          zIndex: (theme) => theme.zIndex.speedDial,
        }}
      >
        <FiPlus size={24} />
      </Fab>

      <Menu
        id="send-message-menu"
        anchorEl={fabAnchor}
        open={Boolean(fabAnchor)}
        onClose={() => setFabAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {sendMenuActions.map((action) => (
          <MenuItem
            key={`${action.path}:${action.name}`}
            onClick={() => openSendPath(action.path)}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
              {action.icon}
            </ListItemIcon>
            <ListItemText>{action.name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
