import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 Days Session Expiry (604,800 seconds)
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 Days JWT Lifespan
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      try {
        // Sync verified Google user with Express Backend & MongoDB
        const response = await axios.post(`${API_BASE_URL}/api/auth/google-sync`, {
          googleProfile: {
            id: user.id || account?.providerAccountId,
            sub: account?.providerAccountId,
            email: user.email,
            name: user.name,
            image: user.image,
          },
        });

        if (response.data && response.data.success) {
          (user as any).backendToken = response.data.token;
          (user as any).userData = response.data.user;
          return true;
        }
        return true;
      } catch (err) {
        console.error('Failed to sync Google user with backend:', err);
        return true;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        token.backendToken = (user as any).backendToken;
        token.userData = (user as any).userData;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        (session as any).backendToken = token.backendToken;
        (session as any).userData = token.userData;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'baazi_game_platform_nextauth_secret_key_2026_7d',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
