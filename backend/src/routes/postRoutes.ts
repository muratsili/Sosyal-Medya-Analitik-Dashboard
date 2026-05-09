import { Router } from 'express';
import { scyllaClient, TimeUuid, Uuid } from '../db/scylla';
import { redisClient } from '../db/redis';
import { format } from 'date-fns';
import { authenticateToken } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { analyzeSentiment } from '../utils/sentiment';

const router = Router();

router.post('/', authenticateToken, rateLimitMiddleware, async (req, res) => {
  const { content, hashtags, mentions: bodyMentions } = req.body;
  const userId = (req as any).user.userId;

  // Validation (Hocanın istediği)
  if (!content || content.length < 3 || content.length > 280) {
    return res.status(400).json({ error: 'Content must be 3-280 characters' });
  }
  if (!Array.isArray(hashtags) || hashtags.some(t => !t.startsWith('#'))) {
    return res.status(400).json({ error: 'Hashtags must start with #' });
  }
  
  const mentions = bodyMentions || (content.match(/@\w+/g) || []).map((m: string) => m.substring(1));
  const postId = TimeUuid.fromDate(new Date());
  const postedAt = new Date();
  const yearMonth = format(postedAt, 'yyyy-MM');
  const hourBucket = format(postedAt, 'yyyy-MM-dd-HH');
  const sentiment = analyzeSentiment(content);

  const queries = [
    {
      query: 'INSERT INTO posts (post_id, user_id, content, hashtags, posted_at, lang, sentiment) VALUES (?, ?, ?, ?, ?, ?, ?)',
      params: [postId, Uuid.fromString(userId), content, hashtags, postedAt, 'en', sentiment]
    },
    {
      query: 'INSERT INTO posts_by_user (user_id, year_month, posted_at, post_id, content, hashtags) VALUES (?, ?, ?, ?, ?, ?)',
      params: [Uuid.fromString(userId), yearMonth, postedAt, postId, content, hashtags]
    }
  ];

  for (const tag of hashtags) {
    queries.push({
      query: 'INSERT INTO hashtag_posts (hashtag, hour_bucket, posted_at, post_id, user_id) VALUES (?, ?, ?, ?, ?)',
      params: [tag, hourBucket, postedAt, postId, Uuid.fromString(userId)]
    });
  }

  try {
    await scyllaClient.batch(queries, { prepare: true });

    for (const tag of hashtags) {
      await Promise.all([
        redisClient.zIncrBy('trending:hashtags:hourly', 1, tag),
        redisClient.zIncrBy('trending:hashtags:daily', 1, tag),
        redisClient.zIncrBy('trending:hashtags:weekly', 1, tag)
      ]);
    }

    const neoSession = require('../db/neo4j').getNeoSession();
    try {
      await neoSession.run(
        'CREATE (p:Post {post_id: $postId, content: $content, posted_at: datetime()}) ' +
        'WITH p MATCH (u:User {user_id: $userId}) ' +
        'SET u.is_bot = $isBot ' +
        'CREATE (u)-[:AUTHORED]->(p) ' +
        'WITH p UNWIND $hashtags AS hTag MERGE (h:Hashtag {tag: hTag}) CREATE (p)-[:HAS_HASHTAG]->(h) ' +
        'WITH p UNWIND $mentions AS mHandle MATCH (m:User {handle: mHandle}) CREATE (p)-[:MENTIONS]->(m)',
        { postId: postId.toString(), content, userId, hashtags, mentions, isBot: (req as any).isBot || false }
      );
    } catch (nErr) {
      console.error('Neo4j sync error:', nErr);
    } finally {
      await neoSession.close();
    }

    res.status(202).json({ success: true, post_id: postId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

router.post('/batch', authenticateToken, async (req, res) => {
  const { posts } = req.body;
  if (!Array.isArray(posts)) return res.status(400).json({ error: 'Posts array required' });
  const userId = (req as any).user.userId;
  
  try {
    const startTime = Date.now();
    for (const post of posts.slice(0, 1000)) {
      const postId = TimeUuid.fromDate(new Date());
      const postedAt = new Date();
      await scyllaClient.execute(
        'INSERT INTO posts (post_id, user_id, content, hashtags, posted_at, lang) VALUES (?, ?, ?, ?, ?, ?)',
        [postId, Uuid.fromString(userId), post.content, post.hashtags, postedAt, 'en'],
        { prepare: true }
      );
    }
    const duration = Date.now() - startTime;
    res.json({ success: true, count: posts.length, duration_ms: duration });
  } catch (err) {
    res.status(500).json({ error: 'Batch ingest failed' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await scyllaClient.execute(
      'SELECT * FROM posts WHERE post_id = ?',
      [TimeUuid.fromString(req.params.id)],
      { prepare: true }
    );
    if (result.rowLength === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.first());
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
