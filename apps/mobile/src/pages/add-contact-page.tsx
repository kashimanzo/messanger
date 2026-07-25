import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Container,
  Stack,
} from '@mui/material';
import { ContactForm, type ContactFormValues } from '../components/contact-form';
import { useFeedback } from '../components/feedback-provider';
import { MobileAppBar } from '../components/mobile-app-bar';
import { getErrorMessage } from '../lib/get-error-message';
import { trpc } from '../lib/trpc';
import { useContactsStore } from '../stores/contacts-store';

export function AddContactPage() {
  const navigate = useNavigate();
  const { showError } = useFeedback();
  const utils = trpc.useUtils();
  const upsertContact = useContactsStore((state) => state.upsertContact);
  const createContact = trpc.createContact.useMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (values: ContactFormValues) => {
    setErrorMessage(null);

    try {
      const contact = await createContact.mutateAsync({
        name: values.name,
        phoneNumber: values.phoneNumber,
        email: values.email || undefined,
      });
      upsertContact(contact);
      await utils.getContactStats.invalidate();
      navigate('/phonebook');
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to save contact.');
      setErrorMessage(message);
      showError(message);
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <MobileAppBar title="Add contact" onBack={() => navigate('/phonebook')} />

      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Stack spacing={2}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <ContactForm
            submitLabel="Save contact"
            isSubmitting={createContact.isPending}
            onSubmit={handleSubmit}
          />
        </Stack>
      </Container>
    </Box>
  );
}
