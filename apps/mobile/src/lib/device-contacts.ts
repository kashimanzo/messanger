import { Capacitor } from '@capacitor/core';
import { CapacitorContacts, type Contact } from '@capgo/capacitor-contacts';
import { normalizePhoneNumber, isValidPhoneNumber } from './phone-numbers';

export type DeviceContact = {
  deviceContactId: string;
  name: string;
  phoneNumber: string;
  email?: string;
};

export function isNativeContactsAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

function getContactName(contact: Contact): string {
  const fullName = contact.fullName?.trim();
  if (fullName) {
    return fullName;
  }

  const given = contact.givenName?.trim() ?? '';
  const family = contact.familyName?.trim() ?? '';
  const combined = `${given} ${family}`.trim();

  return combined || 'Unknown contact';
}

function getPrimaryPhone(contact: Contact): string | null {
  for (const phone of contact.phoneNumbers ?? []) {
    const normalized = normalizePhoneNumber(phone.value ?? '');
    if (isValidPhoneNumber(normalized)) {
      return normalized;
    }
  }

  return null;
}

function getPrimaryEmail(contact: Contact): string | undefined {
  const email = contact.emailAddresses?.find((item) => item.value?.trim())?.value?.trim();
  return email || undefined;
}

export async function ensureContactsPermission(): Promise<
  'granted' | 'denied' | 'prompt' | 'limited'
> {
  const current = await CapacitorContacts.checkPermissions();

  if (current.readContacts === 'granted' || current.readContacts === 'limited') {
    return current.readContacts;
  }

  const requested = await CapacitorContacts.requestPermissions({
    permissions: ['readContacts'],
  });

  return requested.readContacts;
}

export async function loadDeviceContacts(): Promise<DeviceContact[]> {
  if (!isNativeContactsAvailable()) {
    throw new Error('Importing contacts is only available on iOS and Android.');
  }

  const permission = await ensureContactsPermission();

  if (permission !== 'granted' && permission !== 'limited') {
    throw new Error('Contacts permission was denied. Enable it in device settings.');
  }

  const result = await CapacitorContacts.getContacts({
    fields: [
      'id',
      'fullName',
      'givenName',
      'familyName',
      'phoneNumbers',
      'emailAddresses',
    ],
  });

  const contacts: DeviceContact[] = [];
  const seenNumbers = new Set<string>();

  for (const contact of result.contacts) {
    const phoneNumber = getPrimaryPhone(contact);
    const deviceContactId = contact.id?.trim();

    if (!phoneNumber || !deviceContactId || seenNumbers.has(phoneNumber)) {
      continue;
    }

    seenNumbers.add(phoneNumber);
    contacts.push({
      deviceContactId,
      name: getContactName(contact),
      phoneNumber,
      email: getPrimaryEmail(contact),
    });
  }

  return contacts.sort((left, right) => left.name.localeCompare(right.name));
}
