import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FiLogOut, FiSend } from 'react-icons/fi';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@bulk-messanger/ui';
import { authClient } from '../lib/auth';
import { trpc } from '../lib/trpc';
import { useAuthStore } from '../stores/auth-store';

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { data: profile } = trpc.getProfile.useQuery(undefined, {
    retry: false,
  });
  const { data: health } = trpc.health.useQuery();
  const sendTestCampaign = trpc.sendTestWhatsAppCampaign.useMutation();
  const [campaignMessage, setCampaignMessage] = useState<string | null>(null);

  const handleSendTestWhatsApp = async () => {
    setCampaignMessage(null);

    try {
      const result = await sendTestCampaign.mutateAsync();
      setCampaignMessage(
        `Sent ${result.successCount}/${result.total} messages using template "${result.templateName}".`,
      );
    } catch (error) {
      setCampaignMessage(
        error instanceof Error ? error.message : 'Failed to send test campaign.',
      );
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    setUser(null);
    navigate('/login');
  };

  const displayUser = profile ?? user;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-slate-600">Welcome back, {displayUser?.name}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <FiLogOut />
            Sign out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Name:</span> {displayUser?.name}
            </p>
            <p>
              <span className="font-medium">Email:</span> {displayUser?.email}
            </p>
            {profile?.createdAt && (
              <p>
                <span className="font-medium">Joined:</span>{' '}
                {format(new Date(profile.createdAt), 'PPP')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-slate-600">
              Sends your approved template to the 3 test numbers from send.js.
            </p>
            <Button
              onClick={handleSendTestWhatsApp}
              disabled={sendTestCampaign.isPending}
            >
              <FiSend />
              {sendTestCampaign.isPending
                ? 'Sending...'
                : 'Send test WhatsApp campaign'}
            </Button>
            {campaignMessage && (
              <p
                className={
                  campaignMessage.includes('Failed') ||
                  sendTestCampaign.isError
                    ? 'text-red-600'
                    : 'text-green-700'
                }
              >
                {campaignMessage}
              </p>
            )}
            {sendTestCampaign.data?.results.map((result) => (
              <p key={result.to} className="text-slate-600">
                {result.success ? '✅' : '❌'} {result.to}
                {result.error ? ` — ${result.error}` : ''}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Status</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              tRPC health: <span className="font-medium">{health?.status}</span>
            </p>
            {health?.timestamp && (
              <p className="text-slate-500">
                Last checked: {format(new Date(health.timestamp), 'PPpp')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
