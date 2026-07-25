import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
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
import { useMessagingFeatures } from '../hooks/use-messaging-features';
import { authClient, clearMobileAuthSession } from '../lib/auth';
import { trpc } from '../lib/trpc';
import { useAuthStore } from '../stores/auth-store';
import { useContactsStore } from '../stores/contacts-store';
import { useFeaturesStore } from '../stores/features-store';
import { useTemplatesStore } from '../stores/templates-store';

export function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [fabAnchor, setFabAnchor] = useState<HTMLElement | null>(null);
  const { whatsappEnabled, smsEnabled, isLoading: featuresLoading } =
    useMessagingFeatures();
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
    useTemplatesStore.getState().reset();
    useFeaturesStore.getState().reset();
    navigate('/login');
  };

  const displayUser = profile ?? user;
  const smsOnly = smsEnabled && !whatsappEnabled;
  const whatsappOnly = whatsappEnabled && !smsEnabled;

  const recentCampaignCount = useMemo(() => {
    if (!campaigns) return undefined;

    const visible = campaigns.filter((campaign) => {
      const channel = campaign.channel ?? 'WHATSAPP';
      if (smsOnly) return channel === 'SMS';
      if (whatsappOnly) return channel === 'WHATSAPP';
      return true;
    });

    return visible.length ? `${visible.length} recent` : undefined;
  }, [campaigns, smsOnly, whatsappOnly]);

  const phonebookActions = useMemo(() => {
    if (featuresLoading) {
      return [];
    }

    const actions = [
      {
        title: 'Sent campaigns',
        description: smsOnly
          ? 'Track queued SMS campaigns and delivery progress'
          : whatsappOnly
            ? 'Track queued WhatsApp campaigns and delivery progress'
            : 'Track queued messages and delivery progress',
        icon: <FiList size={22} />,
        path: '/campaigns',
        chip: recentCampaignCount,
      },
    ];

    if (whatsappEnabled) {
      actions.push({
        title: 'WhatsApp templates',
        description: 'Browse approved templates and send WhatsApp campaigns',
        icon: <FiMessageSquare size={22} />,
        path: '/templates',
        chip: undefined,
      });
      actions.push({
        title: 'Custom WhatsApp message',
        description: 'Send free-form text within the 24-hour session window',
        icon: <FiSend size={22} />,
        path: '/templates/custom',
        chip: undefined,
      });
    }

    if (smsEnabled) {
      actions.push({
        title: 'SMS templates',
        description: 'Create and manage ClickSend SMS templates',
        icon: <FiMessageSquare size={22} />,
        path: '/templates',
        chip: 'ClickSend',
      });
      actions.push({
        title: 'Check campaign price',
        description: 'See what ClickSend will charge before you send',
        icon: <FiDollarSign size={22} />,
        path: '/campaigns/clicksend/price',
        chip: undefined,
      });
      actions.push({
        title: 'Send SMS campaign',
        description: 'Price and send bulk SMS via ClickSend campaigns',
        icon: <FiSend size={22} />,
        path: '/campaigns/clicksend/new',
        chip: undefined,
      });
    }

    actions.push(
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
        chip: undefined,
      },
      {
        title: 'Import from device',
        description: 'Pull contacts from your phone and save them here',
        icon: <FiDownload size={22} />,
        path: '/phonebook/import',
        chip: contactStats ? `${contactStats.imported} imported` : undefined,
      },
    );

    return actions;
  }, [
    contactStats,
    featuresLoading,
    groups,
    recentCampaignCount,
    smsEnabled,
    smsOnly,
    whatsappEnabled,
    whatsappOnly,
  ]);

  const sendMenuActions = useMemo(() => {
    const actions: Array<{
      name: string;
      icon: ReactNode;
      path: string;
    }> = [];

    if (smsEnabled) {
      actions.push({
        name: 'Check campaign price',
        icon: <FiDollarSign size={18} />,
        path: '/campaigns/clicksend/price',
      });
      actions.push({
        name: 'Send SMS campaign',
        icon: <FiSend size={18} />,
        path: '/campaigns/clicksend/new',
      });
      actions.push({
        name: 'SMS templates',
        icon: <FiMessageSquare size={18} />,
        path: '/templates',
      });
    }

    if (whatsappEnabled) {
      actions.push({
        name: 'WhatsApp templates',
        icon: <FiMessageSquare size={18} />,
        path: '/templates',
      });
      actions.push({
        name: 'Custom WhatsApp',
        icon: <FiSend size={18} />,
        path: '/templates/custom',
      });
    }

    if (actions.length > 0) {
      actions.push({
        name: 'Sent campaigns',
        icon: <FiList size={18} />,
        path: '/campaigns',
      });
    }

    return actions;
  }, [smsEnabled, whatsappEnabled]);

  const subtitle = smsOnly
    ? 'SMS campaigns'
    : whatsappOnly
      ? 'WhatsApp campaigns'
      : [whatsappEnabled ? 'WhatsApp' : null, smsEnabled ? 'SMS' : null]
          .filter(Boolean)
          .join(' + ') || 'campaigns';

  const openSendPath = (path: string) => {
    setFabAnchor(null);
    navigate(path);
  };

  const handleFabClick = (event: MouseEvent<HTMLElement>) => {
    if (sendMenuActions.length === 1) {
      openSendPath(sendMenuActions[0].path);
      return;
    }

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
              Phonebook & {subtitle}
            </Typography>
          </Box>

          {featuresLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
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
          )}

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

      {!featuresLoading && sendMenuActions.length > 0 && (
        <>
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
        </>
      )}
    </Box>
  );
}
