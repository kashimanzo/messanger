import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { MobileAppBar } from '../components/mobile-app-bar';
import { useFeedback } from '../components/feedback-provider';
import { getErrorMessage } from '../lib/get-error-message';
import { trpc } from '../lib/trpc';

const cancellableStatuses = new Set([
  'Scheduled',
  'Draft',
  'WaitApproval',
  'Queued',
  'Approved',
]);

export function ClickSendCampaignDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showError, showSuccess } = useFeedback();
  const smsCampaignId = Number(id);
  const utils = trpc.useUtils();

  const campaignQuery = trpc.getClickSendCampaign.useQuery(
    { smsCampaignId },
    { enabled: Number.isFinite(smsCampaignId) && smsCampaignId > 0 },
  );

  const cancelCampaign = trpc.cancelClickSendCampaign.useMutation({
    onSuccess: async () => {
      await utils.getClickSendCampaign.invalidate({ smsCampaignId });
      await utils.listClickSendCampaigns.invalidate();
      showSuccess('Campaign cancelled.');
    },
    onError: (mutationError) => {
      showError(getErrorMessage(mutationError, 'Failed to cancel campaign.'));
    },
  });

  if (campaignQuery.isLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (campaignQuery.error || !campaignQuery.data) {
    return (
      <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
        <MobileAppBar title="Campaign" onBack={() => navigate('/campaigns')} />
        <Container maxWidth="sm" sx={{ py: 3 }}>
          <Alert severity="error">
            {campaignQuery.error?.message ?? 'Campaign not found.'}
          </Alert>
        </Container>
      </Box>
    );
  }

  const campaign = campaignQuery.data;
  const canCancel = cancellableStatuses.has(campaign.status);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar title="ClickSend campaign" onBack={() => navigate('/campaigns')} />

      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {campaign.name}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={campaign.status} color="primary" />
                  <Chip label="ClickSend" variant="outlined" />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  List: {campaign.listName ?? campaign.listId}
                  {campaign.totalCount != null
                    ? ` · ${campaign.totalCount} recipients`
                    : ''}
                </Typography>
                {campaign.from && (
                  <Typography variant="body2" color="text.secondary">
                    From: {campaign.from}
                  </Typography>
                )}
                {campaign.dateAdded && (
                  <Typography variant="caption" color="text.secondary">
                    Created {format(new Date(campaign.dateAdded * 1000), 'PPpp')}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Message
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{campaign.body}</Typography>
            </CardContent>
          </Card>

          {cancelCampaign.error && (
            <Alert severity="error">{cancelCampaign.error.message}</Alert>
          )}

          {canCancel && (
            <Button
              color="error"
              variant="outlined"
              disabled={cancelCampaign.isPending}
              onClick={() =>
                void cancelCampaign.mutateAsync({ smsCampaignId: campaign.smsCampaignId })
              }
            >
              {cancelCampaign.isPending ? (
                <CircularProgress size={22} />
              ) : (
                'Cancel campaign'
              )}
            </Button>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
