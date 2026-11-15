import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { FiCreditCard, FiPlus, FiRefreshCw } from 'react-icons/fi';
import { useFeedback } from '../components/feedback-provider';
import { MobileAppBar } from '../components/mobile-app-bar';
import { getErrorMessage } from '../lib/get-error-message';
import { trpc } from '../lib/trpc';

type PaymentTab = 'packages' | 'cards' | 'history';

function formatMoney(amount: number, currency?: string, prefix?: string) {
  if (prefix) {
    return `${prefix}${amount.toFixed(2)}`;
  }
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }
  return amount.toFixed(2);
}

const cardSchema = z.object({
  number: z
    .string()
    .trim()
    .min(1, 'Card number is required')
    .refine((value) => value.replace(/\D/g, '').length >= 12, {
      message: 'Enter a valid card number',
    }),
  expiryMonth: z
    .string()
    .trim()
    .regex(/^(0?[1-9]|1[0-2])$/, 'Month must be 01-12'),
  expiryYear: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Use 4-digit year')
    .refine((value) => Number(value) >= new Date().getFullYear(), {
      message: 'Card is expired',
    }),
  cvc: z
    .string()
    .trim()
    .regex(/^\d{3,4}$/, 'CVC must be 3 or 4 digits'),
  name: z.string().trim().min(2, 'Name on card is required').max(100),
});

type CardForm = z.infer<typeof cardSchema>;

export function PaymentPage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useFeedback();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<PaymentTab>('packages');
  const [confirmPackageId, setConfirmPackageId] = useState<number | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [showCardForm, setShowCardForm] = useState(false);

  const balanceQuery = trpc.getClickSendAccountBalance.useQuery(undefined, {
    staleTime: 30_000,
  });
  const cardsQuery = trpc.listClickSendPaymentCards.useQuery(undefined, {
    staleTime: 60_000,
  });
  const packagesQuery = trpc.listClickSendRechargePackages.useQuery(undefined, {
    staleTime: 60_000,
  });
  const transactionsQuery = trpc.listClickSendTransactions.useQuery(
    { page: 1, limit: 50 },
    { staleTime: 30_000 },
  );

  const cards = cardsQuery.data?.cards ?? [];
  const packages = packagesQuery.data?.packages ?? [];
  const transactions = transactionsQuery.data?.transactions ?? [];
  const hasCard = cards.length > 0;
  const creditPackages = useMemo(
    () => packages.filter((pkg) => pkg.category === 'credit'),
    [packages],
  );
  const powerPackages = useMemo(
    () => packages.filter((pkg) => pkg.category === 'power'),
    [packages],
  );

  useEffect(() => {
    if (!cards.length) {
      setSelectedCardId('');
      return;
    }
    if (!cards.some((card) => card.id === selectedCardId)) {
      setSelectedCardId(cards.find((card) => card.isDefault)?.id ?? cards[0]!.id);
    }
  }, [cards, selectedCardId]);

  const cardForm = useForm<CardForm>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      number: '',
      expiryMonth: '',
      expiryYear: '',
      cvc: '',
      name: '',
    },
  });

  const updateCard = trpc.updateClickSendPaymentCard.useMutation({
    onSuccess: async (card) => {
      await Promise.all([
        utils.getClickSendPaymentCard.invalidate(),
        utils.listClickSendPaymentCards.invalidate(),
      ]);
      setShowCardForm(false);
      cardForm.reset();
      if (card.hasCard) {
        setSelectedCardId(card.id);
      }
      showSuccess(
        card.displayNumber
          ? `Card saved (${card.displayNumber}).`
          : 'Card saved on your ClickSend account.',
      );
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Failed to save card.'));
    },
  });

  const purchase = trpc.purchaseClickSendRechargePackage.useMutation({
    onSuccess: async (result) => {
      setConfirmPackageId(null);
      await Promise.all([
        utils.getClickSendAccountBalance.invalidate(),
        utils.listClickSendRechargePackages.invalidate(),
        utils.listClickSendTransactions.invalidate(),
      ]);
      showSuccess(
        `Package activated. Credited ${formatMoney(result.purchase.amount, result.purchase.currency)}. New balance ${formatMoney(result.balance.balance, result.balance.currency, result.balance.currencyPrefix)}.`,
      );
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Failed to activate package.'));
    },
  });

  const selectedPackage = useMemo(
    () =>
      packages.find((entry) => entry.packageId === confirmPackageId) ?? null,
    [confirmPackageId, packages],
  );

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId) ?? null,
    [cards, selectedCardId],
  );

  const isLoading =
    balanceQuery.isLoading || cardsQuery.isLoading || packagesQuery.isLoading;
  const balance = balanceQuery.data;
  const busy = purchase.isPending || updateCard.isPending;
  const currencyPrefix =
    packagesQuery.data?.currencyPrefix ?? balance?.currencyPrefix;
  const currency = packagesQuery.data?.currency ?? balance?.currency;

  const refreshAll = () => {
    void balanceQuery.refetch();
    void cardsQuery.refetch();
    void packagesQuery.refetch();
    void transactionsQuery.refetch();
  };

  const onSaveCard = cardForm.handleSubmit(async (values) => {
    await updateCard.mutateAsync({
      number: values.number,
      expiryMonth: Number(values.expiryMonth),
      expiryYear: Number(values.expiryYear),
      cvc: values.cvc,
      name: values.name,
    });
  });

  const openActivate = (packageId: number) => {
    if (!hasCard) {
      showError('Add a card first, then activate a package.');
      setTab('cards');
      setShowCardForm(true);
      return;
    }
    setConfirmPackageId(packageId);
  };

  const renderPackageCard = (
    pkg: (typeof packages)[number],
    accent: 'credit' | 'power',
  ) => (
    <Card
      key={pkg.packageId}
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: accent === 'power' ? 'warning.main' : 'divider',
        borderRadius: 0,
        bgcolor: accent === 'power' ? 'warning.light' : 'background.paper',
        overflow: 'hidden',
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack spacing={2}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Chip
              size="small"
              label={accent === 'power' ? 'Power Pack' : 'Credit Pack'}
              color={accent === 'power' ? 'warning' : 'default'}
              sx={{ fontWeight: 600 }}
            />
            {pkg.smsUnitPrice != null ? (
              <Typography variant="caption" color="text.secondary">
                {formatMoney(pkg.smsUnitPrice, pkg.currency, pkg.currencyPrefix)}
                /SMS
              </Typography>
            ) : null}
          </Stack>

          <Box>
            <Typography
              variant="h3"
              sx={{ fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}
            >
              {formatMoney(pkg.price, pkg.currency, pkg.currencyPrefix)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {pkg.estimatedSmsCount == null
                ? 'SMS quantity unavailable for this country'
                : `About ${pkg.estimatedSmsCount.toLocaleString()} SMS`}
              {packagesQuery.data?.country
                ? ` to ${packagesQuery.data.country}`
                : ''}
            </Typography>
          </Box>

          <Stack spacing={0.5}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {pkg.name}
            </Typography>
            {accent === 'power' ? (
              <Typography variant="caption" color="text.secondary">
                Unlocks a lower per-SMS rate for this top-up tier.
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Standard credit top-up for your ClickSend balance.
              </Typography>
            )}
          </Stack>

          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={purchase.isPending}
            onClick={() => openActivate(pkg.packageId)}
            sx={{ py: 1.25, fontWeight: 600 }}
          >
            Activate
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar
        title="Payments"
        onBack={() => navigate('/home')}
        rightAction={
          <Button
            size="small"
            startIcon={<FiRefreshCw size={14} />}
            onClick={refreshAll}
            disabled={isLoading || busy}
          >
            Refresh
          </Button>
        }
      />

      <Container
        maxWidth="sm"
        sx={{
          py: 2,
          pb: 'calc(24px + max(20px, env(safe-area-inset-bottom, 0px)))',
        }}
      >
        <Stack spacing={2}>
          {(balanceQuery.error || packagesQuery.error || cardsQuery.error) && (
            <Alert severity="error">
              {getErrorMessage(
                balanceQuery.error ?? packagesQuery.error ?? cardsQuery.error,
                'Failed to load ClickSend payment details.',
              )}
            </Alert>
          )}

          {isLoading && !balance ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : null}

          {balance ? (
            <Card>
              <CardContent sx={{ py: 2.25, '&:last-child': { pb: 2.25 } }}>
                <Typography variant="caption" color="text.secondary">
                  ClickSend balance
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, mt: 0.5 }}>
                  {formatMoney(
                    balance.balance,
                    balance.currency,
                    balance.currencyPrefix,
                  )}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Estimated SMS remaining:{' '}
                  <strong>
                    {balance.estimatedSmsCount === null
                      ? 'Unavailable'
                      : balance.estimatedSmsCount.toLocaleString()}
                  </strong>
                </Typography>
                {balance.estimatedSmsUnitPrice != null ? (
                  <Typography variant="caption" color="text.secondary">
                    ~{formatMoney(balance.estimatedSmsUnitPrice, balance.currency)}{' '}
                    per standard SMS
                    {balance.country ? ` to ${balance.country}` : ''}
                  </Typography>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Box
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              mx: -0.5,
              position: 'sticky',
              top: 0,
              zIndex: 2,
              bgcolor: 'background.default',
            }}
          >
            <Tabs
              value={tab}
              onChange={(_, value: PaymentTab) => setTab(value)}
              variant="fullWidth"
              aria-label="Payment sections"
            >
              <Tab label="Packages" value="packages" />
              <Tab label="Cards" value="cards" />
              <Tab label="History" value="history" />
            </Tabs>
          </Box>

          {tab === 'packages' ? (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Add credit
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Same top-up options as ClickSend Billing → Add Credit
                  {packagesQuery.data?.country
                    ? ` (prices for ${packagesQuery.data.country})`
                    : ''}
                  .
                </Typography>
              </Box>

              {packagesQuery.isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : null}

              {!packagesQuery.isLoading && packages.length === 0 ? (
                <Alert severity="info">
                  No credit packages were returned for this account.
                </Alert>
              ) : null}

              {creditPackages.length > 0 ? (
                <Stack spacing={1.5}>
                  <Typography variant="overline" color="text.secondary">
                    Credit packs
                  </Typography>
                  <Stack spacing={2}>
                    {creditPackages.map((pkg) =>
                      renderPackageCard(pkg, 'credit'),
                    )}
                  </Stack>
                </Stack>
              ) : null}

              {powerPackages.length > 0 ? (
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Power packs
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.25 }}
                    >
                      Larger top-ups with a better per-SMS rate.
                    </Typography>
                  </Box>
                  <Stack spacing={2}>
                    {powerPackages.map((pkg) =>
                      renderPackageCard(pkg, 'power'),
                    )}
                  </Stack>
                </Stack>
              ) : null}
            </Stack>
          ) : null}

          {tab === 'cards' ? (
            <Stack spacing={1.75}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Payment cards
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ClickSend keeps one active card for package purchases.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<FiPlus size={14} />}
                  onClick={() => setShowCardForm((open) => !open)}
                >
                  {showCardForm
                    ? 'Cancel'
                    : hasCard
                      ? 'Replace'
                      : 'Add'}
                </Button>
              </Stack>

              {!hasCard && !showCardForm ? (
                <Alert severity="info">
                  No saved card yet. Add a card to activate credit packages.
                </Alert>
              ) : null}

              {hasCard ? (
                <FormControl>
                  <RadioGroup
                    value={selectedCardId}
                    onChange={(event) => setSelectedCardId(event.target.value)}
                  >
                    {cards.map((card) => (
                      <Card
                        key={card.id}
                        variant="outlined"
                        sx={{
                          borderRadius: 0,
                          mb: 1.25,
                          borderColor:
                            selectedCardId === card.id
                              ? 'primary.main'
                              : 'divider',
                        }}
                      >
                        <FormControlLabel
                          value={card.id}
                          control={<Radio size="small" />}
                          sx={{
                            m: 0,
                            px: 1.5,
                            py: 1.25,
                            width: '100%',
                            alignItems: 'flex-start',
                          }}
                          label={
                            <Box sx={{ py: 0.5 }}>
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ alignItems: 'center' }}
                              >
                                <FiCreditCard size={16} />
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {card.displayNumber}
                                </Typography>
                              </Stack>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block' }}
                              >
                                {card.name ? `${card.name} · ` : ''}
                                {card.expiryMonth && card.expiryYear
                                  ? `Expires ${String(card.expiryMonth).padStart(2, '0')}/${card.expiryYear}`
                                  : 'On file'}
                                {card.isDefault ? ' · Default' : ''}
                              </Typography>
                            </Box>
                          }
                        />
                      </Card>
                    ))}
                  </RadioGroup>
                </FormControl>
              ) : null}

              <Collapse in={showCardForm}>
                <Box component="form" onSubmit={onSaveCard}>
                  <Alert severity="info" sx={{ mb: 1.5 }}>
                    Same fields as ClickSend Billing → Manage cards. Details go
                    to ClickSend only and replace the active card on this
                    account.
                  </Alert>
                  <Stack spacing={1.25}>
                    <TextField
                      label="Card number"
                      fullWidth
                      autoComplete="cc-number"
                      inputMode="numeric"
                      placeholder="•••• •••• •••• ••••"
                      error={!!cardForm.formState.errors.number}
                      helperText={cardForm.formState.errors.number?.message}
                      {...cardForm.register('number')}
                    />
                    <Stack direction="row" spacing={1}>
                      <TextField
                        label="Expiry month"
                        fullWidth
                        autoComplete="cc-exp-month"
                        inputMode="numeric"
                        placeholder="MM"
                        error={!!cardForm.formState.errors.expiryMonth}
                        helperText={
                          cardForm.formState.errors.expiryMonth?.message
                        }
                        {...cardForm.register('expiryMonth')}
                      />
                      <TextField
                        label="Expiry year"
                        fullWidth
                        autoComplete="cc-exp-year"
                        inputMode="numeric"
                        placeholder="YYYY"
                        error={!!cardForm.formState.errors.expiryYear}
                        helperText={
                          cardForm.formState.errors.expiryYear?.message
                        }
                        {...cardForm.register('expiryYear')}
                      />
                      <TextField
                        label="CVC"
                        fullWidth
                        autoComplete="cc-csc"
                        inputMode="numeric"
                        placeholder="CVC"
                        error={!!cardForm.formState.errors.cvc}
                        helperText={cardForm.formState.errors.cvc?.message}
                        {...cardForm.register('cvc')}
                      />
                    </Stack>
                    <TextField
                      label="Name on card"
                      fullWidth
                      autoComplete="cc-name"
                      error={!!cardForm.formState.errors.name}
                      helperText={cardForm.formState.errors.name?.message}
                      {...cardForm.register('name')}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={updateCard.isPending}
                      sx={{ borderRadius: 0 }}
                    >
                      {updateCard.isPending ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        'Save card'
                      )}
                    </Button>
                  </Stack>
                </Box>
              </Collapse>
            </Stack>
          ) : null}

          {tab === 'history' ? (
            <Stack spacing={1.75}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Reload history
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Recent ClickSend recharge and billing activity
                  {currency
                    ? ` (${currencyPrefix ?? ''}${currency})`
                    : ''}
                  .
                </Typography>
              </Box>

              {transactionsQuery.isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : null}

              {transactionsQuery.error ? (
                <Alert severity="error">
                  {getErrorMessage(
                    transactionsQuery.error,
                    'Failed to load reload history.',
                  )}
                </Alert>
              ) : null}

              {!transactionsQuery.isLoading && transactions.length === 0 ? (
                <Alert severity="info">No recharge transactions yet.</Alert>
              ) : null}

              <Stack spacing={1.25}>
                {transactions.map((tx) => (
                  <Card
                    key={tx.id}
                    variant="outlined"
                    sx={{ borderRadius: 0 }}
                  >
                    <CardContent
                      sx={{
                        py: 1.75,
                        px: 2,
                        '&:last-child': { pb: 1.75 },
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {formatMoney(tx.amount, tx.currency)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {tx.date
                              ? format(
                                  new Date(tx.date * 1000),
                                  'dd MMM yyyy, HH:mm',
                                )
                              : 'Date unavailable'}
                            {tx.type ? ` · ${tx.type}` : ''}
                          </Typography>
                          {tx.invoiceNumber ? (
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              sx={{ display: 'block' }}
                              noWrap
                            >
                              {tx.invoiceNumber}
                            </Typography>
                          ) : null}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      </Container>

      <Dialog
        open={Boolean(selectedPackage)}
        onClose={() => {
          if (!purchase.isPending) setConfirmPackageId(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Confirm package activation</DialogTitle>
        <DialogContent>
          {selectedPackage ? (
            <Stack spacing={2} sx={{ pt: 0.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Package
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.25 }}>
                  {formatMoney(
                    selectedPackage.price,
                    selectedPackage.currency,
                    selectedPackage.currencyPrefix,
                  )}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {selectedPackage.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedPackage.category === 'power'
                    ? 'Power Pack'
                    : 'Credit Pack'}
                  {selectedPackage.estimatedSmsCount != null
                    ? ` · ~${selectedPackage.estimatedSmsCount.toLocaleString()} SMS`
                    : ''}
                  {selectedPackage.smsUnitPrice != null
                    ? ` · ${formatMoney(selectedPackage.smsUnitPrice, selectedPackage.currency, selectedPackage.currencyPrefix)}/SMS`
                    : ''}
                </Typography>
              </Box>

              <FormControl>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 0.75 }}
                >
                  Charge card
                </Typography>
                <RadioGroup
                  value={selectedCardId}
                  onChange={(event) => setSelectedCardId(event.target.value)}
                >
                  {cards.map((card) => (
                    <FormControlLabel
                      key={card.id}
                      value={card.id}
                      control={<Radio size="small" />}
                      label={
                        <Box>
                          <Typography variant="body2">
                            {card.displayNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {card.name || 'Saved card'}
                            {card.expiryMonth && card.expiryYear
                              ? ` · ${String(card.expiryMonth).padStart(2, '0')}/${card.expiryYear}`
                              : ''}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </RadioGroup>
              </FormControl>

              {!selectedCard ? (
                <Alert severity="warning">Select a card to continue.</Alert>
              ) : (
                <Alert severity="info">
                  ClickSend will charge {selectedCard.displayNumber}. Their API
                  uses the single active card on the account for purchases.
                </Alert>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmPackageId(null)}
            disabled={purchase.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!selectedPackage || !selectedCard || purchase.isPending}
            onClick={() => {
              if (!selectedPackage || !selectedCard) return;
              purchase.mutate({ packageId: selectedPackage.packageId });
            }}
          >
            {purchase.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              'Activate package'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
