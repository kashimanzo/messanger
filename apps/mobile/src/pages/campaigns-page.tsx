import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Fab,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { FiPlus } from 'react-icons/fi';
import { MobileAppBar } from '../components/mobile-app-bar';
import { trpc } from '../lib/trpc';

const statusColor = {
  QUEUED: 'default',
  PROCESSING: 'primary',
  COMPLETED: 'success',
  FAILED: 'error',
  PARTIAL: 'warning',
} as const;

function LocalCampaignsList() {
  const navigate = useNavigate();
  const { data: campaigns, isLoading, error } = trpc.listCampaigns.useQuery({
    limit: 50,
  });

  const visibleCampaigns = useMemo(() => campaigns ?? [], [campaigns]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error.message}</Alert>;

  if (visibleCampaigns.length === 0) {
    return (
      <Alert severity="info">
        No local queue campaigns yet. Older per-message SMS sends appear here.
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      {visibleCampaigns.map((campaign) => (
        <Card key={campaign.id}>
          <CardActionArea onClick={() => navigate(`/campaigns/${campaign.id}`)}>
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="h6">
                    {campaign.templateName ?? 'Text message'}
                  </Typography>
                  <Chip
                    label="SMS"
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={campaign.status}
                    size="small"
                    color={statusColor[campaign.status]}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {campaign.sentCount}/{campaign.totalCount} sent
                  {campaign.failedCount > 0 ? ` · ${campaign.failedCount} failed` : ''}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={campaign.progress}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(campaign.createdAt), 'PPpp')}
                </Typography>
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Stack>
  );
}

function ClickSendCampaignsList() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = trpc.listClickSendCampaigns.useQuery({
    limit: 50,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void refetch()}>
            Retry
          </Button>
        }
      >
        {error.message}
      </Alert>
    );
  }

  if ((data?.length ?? 0) === 0) {
    return (
      <Alert severity="info">
        No ClickSend campaigns yet. Tap + to price and send one.
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      {data?.map((campaign) => (
        <Card key={campaign.smsCampaignId}>
          <CardActionArea
            onClick={() =>
              navigate(`/campaigns/clicksend/${campaign.smsCampaignId}`)
            }
          >
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="h6">{campaign.name}</Typography>
                  <Chip label="ClickSend" size="small" variant="outlined" />
                  <Chip label={campaign.status} size="small" color="primary" />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {campaign.listName ?? `List #${campaign.listId}`}
                  {campaign.totalCount != null
                    ? ` · ${campaign.totalCount} recipients`
                    : ''}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {campaign.body}
                </Typography>
                {campaign.dateAdded && (
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(campaign.dateAdded * 1000), 'PPpp')}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Stack>
  );
}

export function CampaignsPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar title="SMS campaigns" onBack={() => navigate('/home')} />

      <Container maxWidth="sm" sx={{ py: 3, pb: 12 }}>
        <Stack spacing={3}>
          <ClickSendCampaignsList />
          <Typography variant="subtitle2" color="text.secondary">
            Local queue history
          </Typography>
          <LocalCampaignsList />
        </Stack>
      </Container>

      <Fab
        color="primary"
        aria-label="new campaign"
        onClick={() => navigate('/campaigns/clicksend/new')}
        sx={{
          position: 'fixed',
          bottom: 'calc(24px + env(safe-area-inset-bottom))',
          right: 'calc(24px + env(safe-area-inset-right))',
        }}
      >
        <FiPlus size={24} />
      </Fab>
    </Box>
  );
}
