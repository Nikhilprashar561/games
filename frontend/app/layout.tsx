import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { AuthModal } from '../components/AuthModal';

export const metadata: Metadata = {
  title: 'Baazi Board - Realtime Multiplayer Gaming Platform',
  description: 'Play Tic-Tac-Toe free or enter multiplayer battles in Chess, Ludo, Snake & Ladder, Teen Patti, Carrom, and Number Predict!',
  icons: {
    icon: '/images/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-['Outfit',sans-serif] bg-[#05070b] text-slate-100" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-screen flex flex-col bg-[#05070b] text-slate-100">
              <Navbar />
              <main className="flex-1">{children}</main>
              <AuthModal />
              <Footer />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
