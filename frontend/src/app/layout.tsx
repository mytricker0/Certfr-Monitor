import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CERT-FR Monitor',
  description: 'Real-time monitoring of CERT-FR security publications',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
