import { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/protected-route';

const AddContactPage = lazy(() =>
  import('../pages/add-contact-page').then((m) => ({ default: m.AddContactPage })),
);
const CampaignDetailPage = lazy(() =>
  import('../pages/campaign-detail-page').then((m) => ({
    default: m.CampaignDetailPage,
  })),
);
const CampaignsPage = lazy(() =>
  import('../pages/campaigns-page').then((m) => ({ default: m.CampaignsPage })),
);
const ClickSendCampaignDetailPage = lazy(() =>
  import('../pages/clicksend-campaign-detail-page').then((m) => ({
    default: m.ClickSendCampaignDetailPage,
  })),
);
const EditContactPage = lazy(() =>
  import('../pages/edit-contact-page').then((m) => ({ default: m.EditContactPage })),
);
const GroupFormPage = lazy(() =>
  import('../pages/group-form-page').then((m) => ({ default: m.GroupFormPage })),
);
const GroupsPage = lazy(() =>
  import('../pages/groups-page').then((m) => ({ default: m.GroupsPage })),
);
const HomePage = lazy(() =>
  import('../pages/home-page').then((m) => ({ default: m.HomePage })),
);
const ImportContactsPage = lazy(() =>
  import('../pages/import-contacts-page').then((m) => ({
    default: m.ImportContactsPage,
  })),
);
const LoginPage = lazy(() =>
  import('../pages/login-page').then((m) => ({ default: m.LoginPage })),
);
const PhonebookPage = lazy(() =>
  import('../pages/phonebook-page').then((m) => ({ default: m.PhonebookPage })),
);
const RegisterPage = lazy(() =>
  import('../pages/register-page').then((m) => ({ default: m.RegisterPage })),
);
const CheckClickSendCampaignPricePage = lazy(() =>
  import('../pages/check-clicksend-campaign-price-page').then((m) => ({
    default: m.CheckClickSendCampaignPricePage,
  })),
);
const SendClickSendCampaignPage = lazy(() =>
  import('../pages/send-clicksend-campaign-page').then((m) => ({
    default: m.SendClickSendCampaignPage,
  })),
);
const SmsTemplateFormPage = lazy(() =>
  import('../pages/sms-template-form-page').then((m) => ({
    default: m.SmsTemplateFormPage,
  })),
);
const TemplatesPage = lazy(() =>
  import('../pages/templates-page').then((m) => ({ default: m.TemplatesPage })),
);

function RouteFallback() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress size={28} />
    </Box>
  );
}

function ProtectedLazy({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </ProtectedRoute>
  );
}

export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/home"
          element={
            <ProtectedLazy>
              <HomePage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/phonebook"
          element={
            <ProtectedLazy>
              <PhonebookPage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/phonebook/new"
          element={
            <ProtectedLazy>
              <AddContactPage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/phonebook/import"
          element={
            <ProtectedLazy>
              <ImportContactsPage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/phonebook/:id/edit"
          element={
            <ProtectedLazy>
              <EditContactPage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/templates"
          element={
            <ProtectedLazy>
              <TemplatesPage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/templates/sms/new"
          element={
            <ProtectedLazy>
              <SmsTemplateFormPage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/templates/sms/:templateId/edit"
          element={
            <ProtectedLazy>
              <SmsTemplateFormPage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/groups"
          element={
            <ProtectedLazy>
              <GroupsPage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/groups/new"
          element={
            <ProtectedLazy>
              <GroupFormPage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/groups/:id/edit"
          element={
            <ProtectedLazy>
              <GroupFormPage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/campaigns"
          element={
            <ProtectedLazy>
              <CampaignsPage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/campaigns/clicksend/new"
          element={
            <ProtectedLazy>
              <SendClickSendCampaignPage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/campaigns/clicksend/price"
          element={
            <ProtectedLazy>
              <CheckClickSendCampaignPricePage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/campaigns/clicksend/:id"
          element={
            <ProtectedLazy>
              <ClickSendCampaignDetailPage />
            </ProtectedLazy>
          }
        />
        <Route
          path="/campaigns/:id"
          element={
            <ProtectedLazy>
              <CampaignDetailPage />
            </ProtectedLazy>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;
