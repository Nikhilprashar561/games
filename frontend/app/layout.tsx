import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { NextAuthProvider } from '../components/NextAuthProvider';
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
      <body className="font-sans bg-[#05070b] text-slate-100 min-h-screen flex flex-col" suppressHydrationWarning>
        <NextAuthProvider>
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
        </NextAuthProvider>
      </body>
    </html>
  );
}
