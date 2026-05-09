import { Router } from 'express';
import { scyllaClient, TimeUuid, Uuid } from '../db/scylla';
import { getNeoSession } from '../db/neo4j';
import { format } from 'date-fns';
import { authenticateToken } from '../middleware/auth';
import { likeLimitMiddleware } from '../middleware/rateLimit';

const router = Router();

router.post('/', authenticateToken, likeLimitMiddleware, async (req, res) => {
  const { postId, type, event_type } = req.body; 
  const eventType = type || event_type;
  const userId = (req as any).user.userId;
  const eventId = TimeUuid.fromDate(new Date());
  const eventTime = new Date();
  const day = format(eventTime, 'yyyy-MM-dd');

  try {
    // 1. ScyllaDB: Raw event
    await scyllaClient.execute(
      'INSERT INTO engagement_events (post_id, day, event_time, event_id, user_id, event_type) VALUES (?, ?, ?, ?, ?, ?)',
      [TimeUuid.fromString(postId), day, eventTime, eventId, Uuid.fromString(userId), eventType],
      { prepare: true }
    );

    // 2. ScyllaDB: Increment counter
    const counterColumn = `${eventType}_count`;
    await scyllaClient.execute(
      `UPDATE post_counters SET ${counterColumn} = ${counterColumn} + 1 WHERE post_id = ?`,
      [TimeUuid.fromString(postId)],
      { prepare: true }
    );

    // 3. Neo4j: Relationship (if like)
    if (eventType === 'like') {
      const session = getNeoSession();
      await session.run(
        'MATCH (u:User {user_id: $userId}), (p:Post {post_id: $postId}) ' +
        'MERGE (u)-[:LIKED {at: datetime()}]->(p)',
        { userId, postId }
      );
      await session.close();
    }

    res.status(202).json({ success: true, event_id: eventId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Engagement failed' });
  }
});

export default router;
