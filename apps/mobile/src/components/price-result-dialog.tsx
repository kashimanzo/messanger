import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';

export type PriceResult = {
  price: number;
  currency?: string;
  recipientCount: number;
  listId?: number;
  mode?: 'local' | 'clicksend';
};

type PriceResultDialogProps = {
  open: boolean;
  result: PriceResult | null;
  onClose: () => void;
  onSend?: () => void;
  sendLabel?: string;
  sendPending?: boolean;
};

export function formatPriceLabel(result: PriceResult | null): string | null {
  if (!result) return null;
  return `${result.currency ? `${result.currency} ` : ''}${result.price.toFixed(4)}`;
}

export function PriceResultDialog({
  open,
  result,
  onClose,
  onSend,
  sendLabel,
  sendPending = false,
}: PriceResultDialogProps) {
  const priceLabel = formatPriceLabel(result);

  return (
    <Dialog
      open={open && Boolean(result)}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle sx={{ pb: 1 }}>Estimated price</DialogTitle>
      <DialogContent>
        {result ? (
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}
            >
              {priceLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {result.recipientCount} recipient
              {result.recipientCount === 1 ? '' : 's'}
              {result.listId
                ? ` · ClickSend list #${result.listId}`
                : result.mode === 'local'
                  ? ' · Direct SMS'
                  : ' · ClickSend campaign'}
            </Typography>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ borderRadius: 0 }}>
          Close
        </Button>
        {onSend ? (
          <Button
            variant="contained"
            onClick={onSend}
            disabled={sendPending}
            sx={{ borderRadius: 0 }}
          >
            {sendPending ? 'Sending…' : sendLabel ?? `Send for ${priceLabel}`}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
