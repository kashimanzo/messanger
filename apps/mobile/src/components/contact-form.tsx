import {
  Button,
  CircularProgress,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isValidPhoneNumber, normalizePhoneNumber } from '../lib/phone-numbers';

const contactFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  phoneNumber: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .refine((value) => isValidPhoneNumber(value), {
      message: 'Enter a valid number (10–15 digits, E.164 without +)',
    }),
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('')),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

type ContactFormProps = {
  defaultValues?: Partial<ContactFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (values: ContactFormValues) => Promise<void>;
};

export function ContactForm({
  defaultValues,
  submitLabel,
  isSubmitting = false,
  onSubmit,
}: ContactFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
      email: '',
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name ?? '',
        phoneNumber: defaultValues.phoneNumber ?? '',
        email: defaultValues.email ?? '',
      });
    }
  }, [defaultValues, reset]);

  const handleFormSubmit = handleSubmit(async (values) => {
    await onSubmit({
      ...values,
      phoneNumber: normalizePhoneNumber(values.phoneNumber),
      email: values.email?.trim() ? values.email.trim() : '',
    });
  });

  return (
    <Stack
      component="form"
      spacing={2}
      onSubmit={handleFormSubmit}
      noValidate
    >
      <TextField
        label="Name"
        fullWidth
        {...register('name')}
        error={Boolean(errors.name)}
        helperText={errors.name?.message}
      />
      <TextField
        label="Phone number"
        placeholder="447424958361"
        fullWidth
        {...register('phoneNumber')}
        error={Boolean(errors.phoneNumber)}
        helperText={errors.phoneNumber?.message ?? 'Digits only, E.164 without +'}
      />
      <TextField
        label="Email (optional)"
        type="email"
        fullWidth
        {...register('email')}
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isSubmitting}
        fullWidth
      >
        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : submitLabel}
      </Button>
    </Stack>
  );
}
