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

      <Container maxWidth="sm" sx={{ py: 3 }}>
        {!campaign ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                {campaign.templateName ?? 'Text message'}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {campaign.groupName ?? 'Custom recipients'}
              </Typography>
            </Box>

            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label="SMS" variant="outlined" />
                <Chip label={campaign.status} color="primary" />
                <Typography variant="body2" color="text.secondary">
                  {campaign.messagesPerSecond} msgs/sec limit
                </Typography>
              </Stack>

              <Typography variant="body1">
                {campaign.sentCount} of {campaign.totalCount} sent
                {campaign.pendingCount > 0 ? ` · ${campaign.pendingCount} remaining` : ''}
                {campaign.failedCount > 0 ? ` · ${campaign.failedCount} failed` : ''}
              </Typography>

              <LinearProgress
                variant="determinate"
                value={campaign.progress}
                sx={{ height: 10, borderRadius: 5 }}
              />

              <Typography variant="caption" color="text.secondary">
                Started {format(new Date(campaign.createdAt), 'PPpp')}
                {campaign.completedAt
                  ? ` · Completed ${format(new Date(campaign.completedAt), 'PPpp')}`
                  : ''}
              </Typography>
            </Stack>

            {isPolling && (
              <Alert severity="info">
                Sending messages in the background with provider rate limits applied.
              </Alert>
            )}

            {isStalled && (
              <Alert severity="warning">
                Sending appears stalled. Restart the API server (`pnpm dev:api`). If you use
                Redis, make sure it is running on port 6379.
              </Alert>
            )}

            <Box>
              <Typography variant="h6" gutterBottom>
                Messages
              </Typography>
              <List
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {messages?.map((message) => (
                  <ListItem key={message.id} divider>
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
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
