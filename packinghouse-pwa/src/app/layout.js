import './globals.css';
import PWAHandler from '../components/PWAHandler';

export const metadata = {
  title: 'Agrícola Famosa | Packinghouse Premium',
  description: 'Sistema de gestão de packinghouse de alta performance',
  manifest: '/manifest.json',
  themeColor: '#065f46',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <PWAHandler />
        {children}
      </body>
    </html>
  );
}
