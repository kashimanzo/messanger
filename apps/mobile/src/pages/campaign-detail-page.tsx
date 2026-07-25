import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { MobileAppBar } from '../components/mobile-app-bar';
import { trpc } from '../lib/trpc';

const messageStatusLabel = {
  PENDING: 'Pending',
  QUEUED: 'Queued',
  SENT: 'Sent',
  FAILED: 'Failed',
  SKIPPED_OPTOUT: 'Opted out',
} as const;

const MAX_POLL_MS = 3 * 60 * 1000;
const STALL_MS = 45 * 1000;

function shouldPollCampaign(campaign?: {
  status: string;
  createdAt: Date | string;
  sentCount: number;
  failedCount: number;
}) {
  if (!campaign) {
    return false;
  }

  if (campaign.status !== 'PROCESSING' && campaign.status !== 'QUEUED') {
    return false;
  }

  const age = Date.now() - new Date(campaign.createdAt).getTime();
  if (age > MAX_POLL_MS) {
    return false;
  }

  const hasProgress = campaign.sentCount > 0 || campaign.failedCount > 0;
  if (!hasProgress && age > STALL_MS) {
    return false;
  }

  return true;
}

export function CampaignDetailPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams();

  const { data: campaign } = trpc.getCampaign.useQuery(
    { id },
    {
      enabled: Boolean(id),
      refetchInterval: (query) => (shouldPollCampaign(query.state.data) ? 2000 : false),
    },
  );

  const isPolling = shouldPollCampaign(campaign);

  const { data: messages } = trpc.getCampaignMessages.useQuery(
    { campaignId: id },
    {
      enabled: Boolean(id),
      refetchInterval: isPolling ? 2000 : false,
    },
  );

  const isStalled = useMemo(() => {
    if (!campaign) {
      return false;
    }

    if (campaign.status !== 'PROCESSING' && campaign.status !== 'QUEUED') {
      return false;
    }

    const age = Date.now() - new Date(campaign.createdAt).getTime();
    const hasProgress = campaign.sentCount > 0 || campaign.failedCount > 0;

    return (!hasProgress && age > STALL_MS) || age > MAX_POLL_MS;
  }, [campaign]);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar title="Campaign details" onBack={() => navigate('/campaigns')} />

      <Container maxWidth="sm" sx={{ py: 1.5, px: 2, pb: 3 }}>
        {!campaign ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                {campaign.templateName ?? 'Text message'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {campaign.groupName ?? 'Custom recipients'}
              </Typography>
            </Box>

            <Stack spacing={0.75}>
              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip label="SMS" size="small" variant="outlined" sx={{ borderRadius: 0 }} />
                <Chip
                  label={campaign.status}
                  size="small"
                  color="primary"
                  sx={{ borderRadius: 0 }}
                />
              </Stack>

              <Typography variant="body2">
                {campaign.sentCount} of {campaign.totalCount} sent
                {campaign.pendingCount > 0 ? ` · ${campaign.pendingCount} remaining` : ''}
                {campaign.failedCount > 0 ? ` · ${campaign.failedCount} failed` : ''}
              </Typography>

              <LinearProgress
                variant="determinate"
                value={campaign.progress}
                sx={{
                  height: 6,
                  borderRadius: 0,
                  bgcolor: 'secondary.light',
                }}
              />

              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Started {format(new Date(campaign.createdAt), 'MMM d, yyyy · h:mm a')}
                {campaign.completedAt
                  ? ` · Done ${format(new Date(campaign.completedAt), 'h:mm a')}`
                  : ''}
              </Typography>
            </Stack>

            {isPolling && (
              <Alert severity="info">
                Sending in progress…
              </Alert>
            )}

            {isStalled && (
              <Alert severity="warning">
                Sending appears stalled. Check the API server and try again.
              </Alert>
            )}

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                Messages ({messages?.length ?? 0})
              </Typography>
              <List
                dense
                disablePadding
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 0,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                }}
              >
                {messages?.map((message, index) => (
                  <ListItem
                    key={message.id}
                    dense
                    divider={index < (messages?.length ?? 0) - 1}
                    sx={{ py: 0.5, px: 1.5, minHeight: 44 }}
                  >
                    <ListItemText
                      primary={message.contactName ?? `+${message.phoneNumber}`}
                      secondary={
                        <>
                          {messageStatusLabel[message.status]}
                          {message.error ? ` — ${message.error}` : ''}
                          {message.sentAt
                            ? ` · ${format(new Date(message.sentAt), 'p')}`
                            : ''}
                        </>
                      }
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: 500,
                        noWrap: true,
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        sx: { color: 'text.disabled' },
                        noWrap: true,
                      }}
                      sx={{ my: 0 }}
                    />
                  </ListItem>
                ))}
                {(messages?.length ?? 0) === 0 && (
                  <ListItem dense sx={{ py: 1.25, px: 1.5 }}>
                    <ListItemText
                      primary="No messages yet"
                      primaryTypographyProps={{
                        variant: 'body2',
                        color: 'text.secondary',
                      }}
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
