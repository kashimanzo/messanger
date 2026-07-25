import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
} from '@mui/material';
import { ContactForm, type ContactFormValues } from '../components/contact-form';
import { MobileAppBar } from '../components/mobile-app-bar';
import { trpc } from '../lib/trpc';
import { useContactsStore } from '../stores/contacts-store';

export function EditContactPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const utils = trpc.useUtils();
  const upsertContact = useContactsStore((state) => state.upsertContact);
  const removeContact = useContactsStore((state) => state.removeContact);
  const { data: contact, isLoading, error } = trpc.getContact.useQuery(
    { id },
    { enabled: Boolean(id) },
  );
  const updateContact = trpc.updateContact.useMutation();
  const deleteContact = trpc.deleteContact.useMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (values: ContactFormValues) => {
    setErrorMessage(null);

    try {
      const updated = await updateContact.mutateAsync({
        id,
        data: {
          name: values.name,
          phoneNumber: values.phoneNumber,
          email: values.email || undefined,
        },
      });
      upsertContact(updated);
      await utils.getContactStats.invalidate();
      navigate('/phonebook');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update contact.',
      );
    }
  };

  const handleDelete = async () => {
    setErrorMessage(null);

    try {
      await deleteContact.mutateAsync({ id });
      removeContact(id);
      await utils.getContactStats.invalidate();
      navigate('/phonebook');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to delete contact.',
      );
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar title="Edit contact" onBack={() => navigate('/phonebook')} />

      <Container maxWidth="sm" sx={{ py: 3 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error.message}</Alert>}

        {contact && (
          <Stack spacing={2}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <ContactForm
              defaultValues={{
                name: contact.name,
                phoneNumber: contact.phoneNumber,
                email: contact.email ?? '',
              }}
              submitLabel="Update contact"
              isSubmitting={updateContact.isPending}
              onSubmit={handleSubmit}
            />
            <Button
              color="error"
              variant="outlined"
              onClick={handleDelete}
              disabled={deleteContact.isPending}
            >
              Delete contact
            </Button>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
