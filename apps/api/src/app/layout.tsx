import '../lib/env';
import './global.css';

export const metadata = {
  title: 'Bulk Messanger API',
  description: 'tRPC and auth API server',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
