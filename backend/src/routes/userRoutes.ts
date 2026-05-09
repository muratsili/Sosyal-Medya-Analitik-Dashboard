import { Router } from 'express';
import { scyllaClient, Uuid } from '../db/scylla';
import { neo4jDriver } from '../db/neo4j';
import { authenticateToken } from '../middleware/auth';
import { format, subMonths } from 'date-fns';

const router = Router();

// Timeline: User's own posts
router.get('/:id/timeline', async (req, res) => {
  const userId = req.params.id;
  const now = new Date();
  const months = [format(now, 'yyyy-MM'), format(subMonths(now, 1), 'yyyy-MM')];

  try {
    const result = await scyllaClient.execute(
      'SELECT * FROM posts_by_user WHERE user_id = ? AND year_month IN ? LIMIT 50',
      [Uuid.fromString(userId), months],
      { prepare: true }
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// Feed: Posts from people the user follows
router.get('/feed', authenticateToken, async (req, res) => {
  const userId = (req as any).user.userId;
  const neoSession = neo4jDriver.session();

  try {
    // 1. Get followed users from Neo4j
    const followResult = await neoSession.run(
      'MATCH (:User {user_id: $userId})-[:FOLLOWS]->(followed:User) RETURN followed.user_id as id',
      { userId }
    );
    const followedIds = followResult.records.map(r => r.get('id'));

    if (followedIds.length === 0) return res.json([]);

    // 2. Fetch recent posts from ScyllaDB for each followed user
    // In a real system, this would be more optimized (e.g. specialized feed table)
    const yearMonth = format(new Date(), 'yyyy-MM');
    const feedPosts = [];

    for (const fId of followedIds) {
      const posts = await scyllaClient.execute(
        'SELECT * FROM posts_by_user WHERE user_id = ? AND year_month = ? LIMIT 5',
        [Uuid.fromString(fId), yearMonth],
        { prepare: true }
      );
      feedPosts.push(...posts.rows);
    }

    // Sort by timestamp
    feedPosts.sort((a, b) => b.posted_at - a.posted_at);

    res.json(feedPosts.slice(0, 50));
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  } finally {
    await neoSession.close();
  }
});

// Follow User
router.post('/:id/follow', authenticateToken, async (req, res) => {
  const followerId = (req as any).user.userId;
  const followedId = req.params.id;
  const session = require('../db/neo4j').getNeoSession();
  try {
    await session.run(
      'MATCH (a:User {user_id: $followerId}), (b:User {user_id: $followedId}) ' +
      'MERGE (a)-[r:FOLLOWS]->(b) ON CREATE SET r.since = datetime(), b.follower_count = b.follower_count + 1',
      { followerId, followedId }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Follow failed' });
  } finally {
    await session.close();
  }
});

// Unfollow User
router.delete('/:id/follow', authenticateToken, async (req, res) => {
  const followerId = (req as any).user.userId;
  const followedId = req.params.id;
  const session = require('../db/neo4j').getNeoSession();
  try {
    await session.run(
      'MATCH (a:User {user_id: $followerId})-[r:FOLLOWS]->(b:User {user_id: $followedId}) ' +
      'DELETE r SET b.follower_count = b.follower_count - 1',
      { followerId, followedId }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Unfollow failed' });
  } finally {
    await session.close();
  }
});

export default router;
