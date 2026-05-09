import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectScylla, scyllaClient } from './db/scylla';
import { connectNeo4j, neo4jDriver } from './db/neo4j';
import { connectRedis, redisClient, decayTrends } from './db/redis';
import postRoutes from './routes/postRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import authRoutes from './routes/authRoutes';
import engagementRoutes from './routes/engagementRoutes';
import userRoutes from './routes/userRoutes';
import hashtagRoutes from './routes/hashtagRoutes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static('public'));

// Routes
app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/engagements', engagementRoutes);
app.use('/users', userRoutes);
app.use('/hashtags', hashtagRoutes);
app.use('/', analyticsRoutes); // Mounts /health, /dashboard/overview, /admin etc.


// Start Server
async function startServer() {
  await connectScylla();
  await connectNeo4j();
  await connectRedis();

  // Socket.io
  io.on('connection', (socket) => {
    console.log('🔌 Dashboard connected:', socket.id);
  });

  // Background Jobs
  setInterval(async () => {
    await decayTrends();
    io.emit('stats_update', { timestamp: new Date() });
  }, 60000);

  httpServer.listen(port, () => {
    console.log(`
==========================================
  P14 SOCIAL ANALYTICS - SUNUCU HAZIR
  Port: ${port}
  Mod: ${process.env.NODE_ENV}
  WebSocket: Aktif ✅
==========================================
    `);
  });

  // Graceful Shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await scyllaClient.shutdown();
    await neo4jDriver.close();
    await redisClient.quit();
    process.exit(0);
  });
}

startServer();
