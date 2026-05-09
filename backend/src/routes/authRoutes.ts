import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { scyllaClient, Uuid } from '../db/scylla';
import { getNeoSession } from '../db/neo4j';
import { redisClient } from '../db/redis';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

router.post('/register', async (req, res) => {
  const { email, handle, password } = req.body;
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // 1. Save to ScyllaDB
    await scyllaClient.execute(
      'INSERT INTO users (email, user_id, handle, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [email, Uuid.fromString(userId), handle, passwordHash, new Date()],
      { prepare: true }
    );

    // 2. Save to Neo4j
    const session = getNeoSession();
    await session.run(
      'CREATE (:User {user_id: $userId, handle: $handle, display_name: $handle, verified: false, follower_count: 0, created_at: datetime()})',
      { userId, handle }
    );
    await session.close();

    // 3. Mark as online in Redis
    await redisClient.sAdd('online:users', userId);

    res.status(201).json({ success: true, userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await scyllaClient.execute(
      'SELECT * FROM users WHERE email = ?',
      [email],
      { prepare: true }
    );

    if (result.rowLength === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.first();
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.user_id, handle: user.handle }, JWT_SECRET, { expiresIn: '24h' });
    
    // Mark as online in Redis
    await redisClient.sAdd('online:users', user.user_id.toString());

    res.json({ token, userId: user.user_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    await redisClient.sRem('online:users', userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
