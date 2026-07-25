import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  compareDesc,
  endOfWeek,
  format,
  isToday,
  isWithinInterval,
  isYesterday,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Container,
  Fab,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  FiChevronRight,
  FiDollarSign,
  FiInbox,
  FiPlus,
  FiRefreshCw,
  FiSend,
} from 'react-icons/fi';
import { MobileAppBar } from '../components/mobile-app-bar';
import { trpc } from '../lib/trpc';

const localStatusColor = {
  QUEUED: 'default',
  PROCESSING: 'primary',
  COMPLETED: 'success',
  FAILED: 'error',
  PARTIAL: 'warning',
} as const;

type StatusTone = {
  label: string;
  accent: string;
  soft: string;
};

type TimelineBucketId =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'earlier';

const TIMELINE_BUCKETS: Array<{ id: TimelineBucketId; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'thisWeek', label: 'This week' },
  { id: 'lastWeek', label: 'Last week' },
  { id: 'earlier', label: 'Earlier' },
];

type TimelineItem =
  | {
      kind: 'clicksend';
      id: string;
      date: Date;
      name: string;
      status: string;
      subtitle: string;
      preview: string;
      path: string;
    }
  | {
      kind: 'local';
      id: string;
      date: Date;
      name: string;
      status: keyof typeof localStatusColor;
      subtitle: string;
      progress: number;
      path: string;
    };

function getTimelineBucket(date: Date): TimelineBucketId {
  if (isToday(date)) return 'today';
  if (isYesterday(date)) return 'yesterday';

  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

  if (isWithinInterval(date, { start: thisWeekStart, end: thisWeekEnd })) {
    return 'thisWeek';
  }

  const lastWeekAnchor = subWeeks(now, 1);
  const lastWeekStart = startOfWeek(lastWeekAnchor, { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(lastWeekAnchor, { weekStartsOn: 1 });

  if (isWithinInterval(date, { start: lastWeekStart, end: lastWeekEnd })) {
    return 'lastWeek';
  }

  return 'earlier';
}

function formatTimelineTime(date: Date, bucket: TimelineBucketId) {
  if (bucket === 'today') {
    return format(date, 'h:mm a');
  }
  if (bucket === 'yesterday') {
    return format(date, 'h:mm a');
  }
  if (bucket === 'thisWeek' || bucket === 'lastWeek') {
    return format(date, 'EEE · h:mm a');
  }
  return format(date, 'MMM d, yyyy · h:mm a');
}

function clickSendStatusTone(status: string): StatusTone {
  const normalized = status.trim().toLowerCase();

  if (['completed', 'success', 'sent', 'finished'].some((s) => normalized.includes(s))) {
    return { label: status, accent: '#188038', soft: '#e6f4ea' };
  }

  if (
    ['failed', 'cancelled', 'canceled', 'rejected', 'error'].some((s) =>
      normalized.includes(s),
    )
  ) {
    return { label: status, accent: '#d93025', soft: '#fce8e6' };
  }

  if (
    ['scheduled', 'draft', 'wait', 'queued', 'approved', 'pending'].some((s) =>
      normalized.includes(s),
    )
  ) {
    return { label: status, accent: '#e37400', soft: '#fef7e0' };
  }

  return { label: status, accent: '#1a73e8', soft: '#e8f0fe' };
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card sx={{ textAlign: 'center', py: 4, px: 3 }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '16px',
          bgcolor: 'primary.light',
          color: 'primary.main',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        <FiInbox size={26} />
      </Box>
      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography
        variant="caption"
        sx={{ display: 'block', color: 'text.disabled', mb: actionLabel ? 2.5 : 0 }}
      >
        {description}
      </Typography>
      {actionLabel && onAction ? (
        <Button variant="contained" onClick={onAction} startIcon={<FiSend size={16} />}>
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}

function StatusChip({ label, soft, accent }: { label: string; soft: string; accent: string }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        bgcolor: soft,
        color: accent,
        border: 'none',
        maxWidth: 96,
        height: 24,
        flexShrink: 0,
        '& .MuiChip-label': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          px: 1,
          display: 'block',
        },
      }}
    />
  );
}

function TimelineSectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <Stack
      direction="row"
      alignItems="baseline"
      justifyContent="space-between"
      sx={{ px: 0.25, pt: 0.5 }}
    >
      <Typography
        variant="subtitle2"
        sx={{ color: 'text.primary', fontWeight: 500, letterSpacing: 0.2 }}
      >
        {label}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        {count}
      </Typography>
    </Stack>
  );
}

function ClickSendTimelineCard({
  item,
  bucket,
  onOpen,
}: {
  item: Extract<TimelineItem, { kind: 'clicksend' }>;
  bucket: TimelineBucketId;
  onOpen: (path: string) => void;
}) {
  const tone = clickSendStatusTone(item.status);

  return (
    <Card
      sx={{
        overflow: 'hidden',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 1px 3px rgba(60,64,67,.2), 0 4px 8px rgba(60,64,67,.1)',
        },
      }}
    >
      <CardActionArea onClick={() => onOpen(item.path)}>
        <Box sx={{ display: 'flex', minHeight: 108, width: '100%' }}>
          <Box sx={{ width: 4, flexShrink: 0, bgcolor: tone.accent }} />
          <Box sx={{ flex: 1, minWidth: 0, p: 2, pr: 1.75, overflow: 'hidden' }}>
            <Stack spacing={1.1}>
              <Box sx={{ minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 0.5, minWidth: 0 }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ lineHeight: 1.3, flex: 1, minWidth: 0 }}
                    noWrap
                  >
                    {item.name}
                  </Typography>
                  <StatusChip
                    label={tone.label}
                    soft={tone.soft}
                    accent={tone.accent}
                  />
                </Stack>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.disabled', display: 'block' }}
                  noWrap
                >
                  {item.subtitle}
                </Typography>
              </Box>

              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.4,
                  pr: 0.5,
                }}
              >
                {item.preview}
              </Typography>

              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: 'text.disabled' }} noWrap>
                  {formatTimelineTime(item.date, bucket)}
                </Typography>
                <Box sx={{ color: 'text.disabled', display: 'flex' }}>
                  <FiChevronRight size={16} />
                </Box>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}

function LocalTimelineCard({
  item,
  bucket,
  onOpen,
}: {
  item: Extract<TimelineItem, { kind: 'local' }>;
  bucket: TimelineBucketId;
  onOpen: (path: string) => void;
}) {
  return (
    <Card sx={{ overflow: 'hidden' }}>
      <CardActionArea onClick={() => onOpen(item.path)}>
        <Box sx={{ p: 2 }}>
          <Stack spacing={1.1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography
                variant="subtitle1"
                sx={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}
                noWrap
              >
                {item.name}
              </Typography>
              <Chip
                label={item.status}
                size="small"
                color={localStatusColor[item.status]}
                sx={{ maxWidth: 96, flexShrink: 0 }}
              />
            </Stack>

            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {item.subtitle}
            </Typography>

            <LinearProgress
              variant="determinate"
              value={item.progress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'secondary.light',
                '& .MuiLinearProgress-bar': { borderRadius: 3 },
              }}
            />

            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {formatTimelineTime(item.date, bucket)}
              </Typography>
              <FiChevronRight size={16} color="#9aa0a6" />
            </Stack>
          </Stack>
        </Box>
      </CardActionArea>
    </Card>
  );
}

function CampaignsTimeline() {
  const navigate = useNavigate();
  const clickSendQuery = trpc.listClickSendCampaigns.useQuery({ limit: 50 });
  const localQuery = trpc.listCampaigns.useQuery({ limit: 50 });

  const isLoading = clickSendQuery.isLoading || localQuery.isLoading;
  const error = clickSendQuery.error ?? localQuery.error;

  const grouped = useMemo(() => {
    const items: TimelineItem[] = [];

    for (const campaign of clickSendQuery.data ?? []) {
      const date = campaign.dateAdded
        ? new Date(campaign.dateAdded * 1000)
        : new Date(0);
      items.push({
        kind: 'clicksend',
        id: `cs-${campaign.smsCampaignId}`,
        date,
        name: campaign.name,
        status: campaign.status,
        subtitle: [
          campaign.listName ?? `List #${campaign.listId}`,
          campaign.totalCount != null
            ? `${campaign.totalCount.toLocaleString()} recipients`
            : null,
        ]
          .filter(Boolean)
          .join(' · '),
        preview: campaign.body?.trim() || 'No message body',
        path: `/campaigns/clicksend/${campaign.smsCampaignId}`,
      });
    }

    for (const campaign of localQuery.data ?? []) {
      items.push({
        kind: 'local',
        id: `local-${campaign.id}`,
        date: new Date(campaign.createdAt),
        name: campaign.templateName ?? 'Text message',
        status: campaign.status,
        subtitle: [
          `${campaign.sentCount}/${campaign.totalCount} sent`,
          campaign.failedCount > 0 ? `${campaign.failedCount} failed` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        progress: campaign.progress,
        path: `/campaigns/${campaign.id}`,
      });
    }

    items.sort((a, b) => compareDesc(a.date, b.date));

    const buckets: Record<TimelineBucketId, TimelineItem[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      lastWeek: [],
      earlier: [],
    };

    for (const item of items) {
      buckets[getTimelineBucket(item.date)].push(item);
    }

    return {
      total: items.length,
      sections: TIMELINE_BUCKETS.map((bucket) => ({
        ...bucket,
        items: buckets[bucket.id],
      })).filter((section) => section.items.length > 0),
    };
  }, [clickSendQuery.data, localQuery.data]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              void clickSendQuery.refetch();
              void localQuery.refetch();
            }}
          >
            Retry
          </Button>
        }
      >
        {error.message}
      </Alert>
    );
  }

  if (grouped.total === 0) {
    return (
      <EmptyState
        title="No campaigns yet"
        description="Price and send your first SMS campaign with ClickSend."
        actionLabel="Send campaign"
        onAction={() => navigate('/campaigns/clicksend/new')}
      />
    );
  }

  const refreshing = clickSendQuery.isFetching || localQuery.isFetching;

  return (
    <Stack spacing={2.5}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 0.25 }}
      >
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {grouped.total} campaign{grouped.total === 1 ? '' : 's'}
        </Typography>
        <Button
          size="small"
          onClick={() => {
            void clickSendQuery.refetch();
            void localQuery.refetch();
          }}
          disabled={refreshing}
          startIcon={<FiRefreshCw size={14} />}
          sx={{ color: 'text.secondary', minWidth: 0 }}
        >
          Refresh
        </Button>
      </Stack>

      {grouped.sections.map((section) => (
        <Stack key={section.id} spacing={1.25}>
          <TimelineSectionHeader label={section.label} count={section.items.length} />
          {section.items.map((item) =>
            item.kind === 'clicksend' ? (
              <ClickSendTimelineCard
                key={item.id}
                item={item}
                bucket={section.id}
                onOpen={navigate}
              />
            ) : (
              <LocalTimelineCard
                key={item.id}
                item={item}
                bucket={section.id}
                onOpen={navigate}
              />
            ),
          )}
        </Stack>
      ))}
    </Stack>
  );
}

export function CampaignsPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar title="SMS campaigns" onBack={() => navigate('/home')} />

      <Container maxWidth="sm" sx={{ py: 2.5, pb: 12 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="body2" sx={{ color: 'text.disabled', mb: 0.25 }}>
              Timeline
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 400, lineHeight: 1.3 }}>
              Your campaigns
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1.25,
            }}
          >
            <Card>
              <CardActionArea
                onClick={() => navigate('/campaigns/clicksend/new')}
                sx={{ p: 1.75 }}
              >
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      bgcolor: 'primary.light',
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FiSend size={18} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Send SMS</Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.disabled', display: 'block' }}
                    >
                      New campaign
                    </Typography>
                  </Box>
                </Stack>
              </CardActionArea>
            </Card>

            <Card>
              <CardActionArea
                onClick={() => navigate('/campaigns/clicksend/price')}
                sx={{ p: 1.75 }}
              >
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      bgcolor: '#fef7e0',
                      color: '#e37400',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FiDollarSign size={18} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Check price</Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.disabled', display: 'block' }}
                    >
                      Estimate cost
                    </Typography>
                  </Box>
                </Stack>
              </CardActionArea>
            </Card>
          </Box>

          <CampaignsTimeline />
        </Stack>
      </Container>

      <Fab
        color="primary"
        aria-label="new campaign"
        onClick={() => navigate('/campaigns/clicksend/new')}
        sx={{
          position: 'fixed',
          bottom: 'calc(20px + env(safe-area-inset-bottom))',
          right: 'calc(20px + env(safe-area-inset-right))',
        }}
      >
        <FiPlus size={24} />
      </Fab>
    </Box>
  );
}
