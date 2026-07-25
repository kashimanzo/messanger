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
      <Container
        maxWidth="sm"
        sx={{ py: 4, display: 'flex', justifyContent: 'center' }}
      >
        <CircularProgress size={28} />
      </Container>
    );
  }

  if (campaignQuery.error || !campaignQuery.data) {
    return (
      <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
        <MobileAppBar title="Campaign" onBack={() => navigate('/campaigns')} />
        <Container maxWidth="sm" sx={{ py: 1.5, px: 2 }}>
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

      <Container maxWidth="sm" sx={{ py: 1.5, px: 2, pb: 3 }}>
        <Stack spacing={1.5}>
          <Card sx={{ borderRadius: 0 }}>
            <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                  {campaign.name}
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={campaign.status}
                    size="small"
                    color="primary"
                    sx={{ borderRadius: 0 }}
                  />
                  <Chip
                    label="ClickSend"
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 0 }}
                  />
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  List: {campaign.listName ?? campaign.listId}
                  {campaign.totalCount != null
                    ? ` · ${campaign.totalCount} recipients`
                    : ''}
                  {campaign.from ? ` · From ${campaign.from}` : ''}
                </Typography>
                {campaign.dateAdded && (
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    Created{' '}
                    {format(new Date(campaign.dateAdded * 1000), 'MMM d, yyyy · h:mm a')}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 0 }}>
            <CardContent sx={{ py: 1.25, px: 1.5, '&:last-child': { pb: 1.25 } }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.5 }}>
                Message
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', color: 'text.primary' }}
              >
                {campaign.body}
              </Typography>
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
              fullWidth
              sx={{ borderRadius: 0 }}
              onClick={() =>
                void cancelCampaign.mutateAsync({
                  smsCampaignId: campaign.smsCampaignId,
                })
              }
            >
              {cancelCampaign.isPending ? (
                <CircularProgress size={20} />
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
