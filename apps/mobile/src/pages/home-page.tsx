import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  Container,
  Fab,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { MobileAppBar } from '../components/mobile-app-bar';
import {
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

type HomeTile = {
  title: string;
  description: string;
  icon: ReactNode;
  path: string;
  chip?: string;
  tone: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'red';
};

const toneStyles = {
  blue: { bg: '#e8f0fe', fg: '#1a73e8' },
  green: { bg: '#e6f4ea', fg: '#188038' },
  orange: { bg: '#fef7e0', fg: '#e37400' },
  purple: { bg: '#f3e8fd', fg: '#9334e6' },
  teal: { bg: '#e0f7f5', fg: '#007b83' },
  red: { bg: '#fce8e6', fg: '#d93025' },
} as const;

function HomeActionTile({
  tile,
  onOpen,
}: {
  tile: HomeTile;
  onOpen: (path: string) => void;
}) {
  const tone = toneStyles[tile.tone];

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 1px 3px rgba(60,64,67,.2), 0 4px 8px rgba(60,64,67,.1)',
        },
      }}
    >
      <CardActionArea
        onClick={() => onOpen(tile.path)}
        sx={{
          height: '100%',
          alignItems: 'stretch',
          p: 2,
        }}
      >
        <Stack spacing={1.5} sx={{ height: '100%' }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                bgcolor: tone.bg,
                color: tone.fg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {tile.icon}
            </Box>
            {tile.chip ? (
              <Chip
                label={tile.chip}
                size="small"
                sx={{
                  bgcolor: 'secondary.light',
                  color: 'text.secondary',
                  border: 'none',
                }}
              />
            ) : null}
          </Stack>

          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{ color: 'text.primary', lineHeight: 1.3, mb: 0.5 }}
            >
              {tile.title}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: 'text.disabled',
                lineHeight: 1.35,
              }}
            >
              {tile.description}
            </Typography>
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

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

  const messagingTiles: HomeTile[] = useMemo(
    () => [
      {
        title: 'Send SMS',
        description: 'Price and send a campaign',
        icon: <FiSend size={22} />,
        path: '/campaigns/clicksend/new',
        tone: 'blue',
      },
      {
        title: 'Check price',
        description: 'Estimate ClickSend cost',
        icon: <FiDollarSign size={22} />,
        path: '/campaigns/clicksend/price',
        tone: 'orange',
      },
      {
        title: 'Templates',
        description: 'Reusable SMS messages',
        icon: <FiMessageSquare size={22} />,
        path: '/templates',
        chip: 'ClickSend',
        tone: 'purple',
      },
      {
        title: 'Campaigns',
        description: 'View send history',
        icon: <FiList size={22} />,
        path: '/campaigns',
        chip: recentCampaignCount,
        tone: 'teal',
      },
    ],
    [recentCampaignCount],
  );

  const contactTiles: HomeTile[] = useMemo(
    () => [
      {
        title: 'Phonebook',
        description: 'Browse saved contacts',
        icon: <FiUsers size={22} />,
        path: '/phonebook',
        chip: contactStats ? `${contactStats.total}` : undefined,
        tone: 'green',
      },
      {
        title: 'Groups',
        description: 'Organize for bulk send',
        icon: <FiLayers size={22} />,
        path: '/groups',
        chip: groups ? `${groups.length}` : undefined,
        tone: 'blue',
      },
      {
        title: 'Add contact',
        description: 'Create a new contact',
        icon: <FiUserPlus size={22} />,
        path: '/phonebook/new',
        tone: 'teal',
      },
      {
        title: 'Import',
        description: 'From device contacts',
        icon: <FiDownload size={22} />,
        path: '/phonebook/import',
        chip: contactStats ? `${contactStats.imported}` : undefined,
        tone: 'orange',
      },
    ],
    [contactStats, groups],
  );

  const sendMenuActions: Array<{ name: string; icon: ReactNode; path: string }> =
    [
      {
        name: 'Send SMS campaign',
        icon: <FiSend size={18} />,
        path: '/campaigns/clicksend/new',
      },
      {
        name: 'Check campaign price',
        icon: <FiDollarSign size={18} />,
        path: '/campaigns/clicksend/price',
      },
      {
        name: 'SMS templates',
        icon: <FiMessageSquare size={18} />,
        path: '/templates',
      },
      {
        name: 'Campaign history',
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
          <IconButton
            aria-label="Sign out"
            onClick={handleSignOut}
            sx={{ color: 'text.secondary' }}
          >
            <FiLogOut size={20} />
          </IconButton>
        }
      />

      <Container maxWidth="sm" sx={{ py: 2.5, pb: 12 }}>
        <Stack spacing={3}>
          <Box>
            <Typography
              variant="body2"
              sx={{ color: 'text.disabled', mb: 0.25 }}
            >
              Welcome back
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 400, color: 'text.primary', lineHeight: 1.3 }}
            >
              {displayUser?.name || 'Home'}
            </Typography>
          </Box>

          {contactStats ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${contactStats.total} contacts`}
                size="small"
                sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}
              />
              <Chip
                label={`${contactStats.manual} manual`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`${contactStats.imported} imported`}
                size="small"
                variant="outlined"
              />
            </Stack>
          ) : null}

          <Box>
            <Typography
              variant="subtitle2"
              sx={{ color: 'text.secondary', mb: 1.5, px: 0.25 }}
            >
              Messaging
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1.5,
              }}
            >
              {messagingTiles.map((tile) => (
                <HomeActionTile
                  key={tile.path}
                  tile={tile}
                  onOpen={navigate}
                />
              ))}
            </Box>
          </Box>

          <Box>
            <Typography
              variant="subtitle2"
              sx={{ color: 'text.secondary', mb: 1.5, px: 0.25 }}
            >
              Contacts
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1.5,
              }}
            >
              {contactTiles.map((tile) => (
                <HomeActionTile
                  key={tile.path}
                  tile={tile}
                  onOpen={navigate}
                />
              ))}
            </Box>
          </Box>
        </Stack>
      </Container>

      <Fab
        color="primary"
        aria-label="Quick actions"
        aria-controls={fabAnchor ? 'send-message-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={fabAnchor ? 'true' : undefined}
        onClick={handleFabClick}
        sx={{
          position: 'fixed',
          bottom: 'calc(20px + env(safe-area-inset-bottom))',
          right: 'calc(20px + env(safe-area-inset-right))',
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
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              minWidth: 220,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow:
                '0 1px 3px rgba(60,64,67,.2), 0 4px 8px rgba(60,64,67,.15)',
            },
          },
        }}
      >
        {sendMenuActions.map((action) => (
          <MenuItem
            key={`${action.path}:${action.name}`}
            onClick={() => openSendPath(action.path)}
            sx={{ py: 1.25, borderRadius: 2, mx: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
              {action.icon}
            </ListItemIcon>
            <ListItemText
              primary={action.name}
              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
