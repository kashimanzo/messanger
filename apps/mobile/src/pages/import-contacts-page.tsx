import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControlLabel,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FiSearch } from 'react-icons/fi';
import { MobileAppBar } from '../components/mobile-app-bar';
import { useContacts } from '../hooks/use-contacts';
import {
  isNativeContactsAvailable,
  loadDeviceContacts,
  type DeviceContact,
} from '../lib/device-contacts';
import { trpc } from '../lib/trpc';

export function ImportContactsPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { refresh: refreshContacts } = useContacts();
  const importContacts = trpc.importContacts.useMutation();
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [isLoadingDevice, setIsLoadingDevice] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoadingDevice(true);
      setLoadError(null);

      try {
        if (!isNativeContactsAvailable()) {
          throw new Error(
            'Import is only available in the iOS or Android app. Open the native build, not the browser.',
          );
        }

        const contacts = await loadDeviceContacts();

        if (!cancelled) {
          setDeviceContacts(contacts);
          setSelectedIds(new Set(contacts.map((contact) => contact.deviceContactId)));
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : 'Failed to load device contacts.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDevice(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return deviceContacts;
    }

    return deviceContacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.phoneNumber.includes(query),
    );
  }, [deviceContacts, search]);

  const allVisibleSelected =
    filteredContacts.length > 0 &&
    filteredContacts.every((contact) => selectedIds.has(contact.deviceContactId));

  const toggleContact = (deviceContactId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(deviceContactId)) {
        next.delete(deviceContactId);
      } else {
        next.add(deviceContactId);
      }

      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (allVisibleSelected) {
        for (const contact of filteredContacts) {
          next.delete(contact.deviceContactId);
        }
      } else {
        for (const contact of filteredContacts) {
          next.add(contact.deviceContactId);
        }
      }

      return next;
    });
  };

  const handleImport = async () => {
    setStatusMessage(null);

    const selectedContacts = deviceContacts.filter((contact) =>
      selectedIds.has(contact.deviceContactId),
    );

    if (selectedContacts.length === 0) {
      setStatusMessage('Select at least one contact to import.');
      return;
    }

    try {
      const result = await importContacts.mutateAsync({
        contacts: selectedContacts.map((contact) => ({
          name: contact.name,
          phoneNumber: contact.phoneNumber,
          email: contact.email,
          deviceContactId: contact.deviceContactId,
        })),
        skipDuplicates: true,
      });

      await refreshContacts();
      await utils.getContactStats.invalidate();

      setStatusMessage(
        `Imported ${result.imported} contact${result.imported === 1 ? '' : 's'}. Skipped ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'}.`,
      );

      if (result.imported > 0) {
        navigate('/phonebook');
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to import contacts.',
      );
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar title="Import contacts" onBack={() => navigate('/phonebook')} />

      <Container maxWidth="sm" sx={{ py: 3, pb: 12 }}>
        <Stack spacing={2}>
          {isLoadingDevice && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}

          {loadError && <Alert severity="error">{loadError}</Alert>}
          {statusMessage && (
            <Alert
              severity={
                statusMessage.includes('Failed') || statusMessage.includes('Select')
                  ? 'error'
                  : 'success'
              }
            >
              {statusMessage}
            </Alert>
          )}

          {!isLoadingDevice && !loadError && (
            <>
              <TextField
                placeholder="Search device contacts"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FiSearch />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={allVisibleSelected}
                    indeterminate={
                      filteredContacts.some((contact) =>
                        selectedIds.has(contact.deviceContactId),
                      ) && !allVisibleSelected
                    }
                    onChange={toggleSelectAllVisible}
                  />
                }
                label={`Select all visible (${selectedIds.size} selected)`}
              />

              {filteredContacts.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                  No device contacts with valid phone numbers were found.
                </Typography>
              ) : (
                <List
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {filteredContacts.map((contact) => (
                    <ListItem key={contact.deviceContactId} disablePadding>
                      <ListItemButton onClick={() => toggleContact(contact.deviceContactId)}>
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={selectedIds.has(contact.deviceContactId)}
                            tabIndex={-1}
                            disableRipple
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={contact.name}
                          secondary={`+${contact.phoneNumber}`}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </>
          )}
        </Stack>
      </Container>

      {!isLoadingDevice && !loadError && deviceContacts.length > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Container maxWidth="sm">
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={importContacts.isPending || selectedIds.size === 0}
              onClick={handleImport}
            >
              {importContacts.isPending ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                `Import ${selectedIds.size} contact${selectedIds.size === 1 ? '' : 's'}`
              )}
            </Button>
          </Container>
        </Box>
      )}
    </Box>
  );
}
