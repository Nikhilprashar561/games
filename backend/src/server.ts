import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import gameRoutes from './routes/gameRoutes';
import paymentRoutes from './routes/paymentRoutes';
import { setupSocket } from './socket/socketHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Allowed Production & Local Origins
const allowedOrigins = [
  'https://baaziboard.vercel.app',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

// Express Global Seamless CORS Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production')) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

// Socket.io Setup with Full Cross-Origin Support
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true); // Allows Vercel & client connections seamlessly
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocket(io);

// Database Connection
connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'production',
    backendUrl: 'https://games-zg86.onrender.com',
    frontendUrl: 'https://baaziboard.vercel.app',
    time: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🎮 Baazi Board Server running on port ${PORT}`);
  console.log(`🚀 Production Backend: https://games-zg86.onrender.com`);
  console.log(`🌐 Production Frontend: https://baaziboard.vercel.app`);
  console.log(`=================================`);
});
