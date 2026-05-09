import { scyllaClient, connectScylla, TimeUuid, Uuid } from './db/scylla';
import { neo4jDriver, connectNeo4j } from './db/neo4j';
import { redisClient, connectRedis } from './db/redis';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

async function seed() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  P14 Social Media Analytics — MEGA SEED SCRIPT     ║
║  10K Users | 100K Follows | 100K Posts              ║
╚══════════════════════════════════════════════════════╝
  `);

  await connectScylla();
  await connectNeo4j();
  await connectRedis();

  console.log('\n🧹 Cleaning old data...');
  await scyllaClient.execute('TRUNCATE posts_by_user');
  await scyllaClient.execute('TRUNCATE posts');
  await scyllaClient.execute('TRUNCATE engagement_events');
  await scyllaClient.execute('TRUNCATE post_counters');
  await scyllaClient.execute('TRUNCATE hashtag_posts');
  await scyllaClient.execute('TRUNCATE user_daily_stats');
  
  const neoSession = neo4jDriver.session();
  await neoSession.run('MATCH (n) DETACH DELETE n');
  await neoSession.close();

  await redisClient.flushAll();
  console.log('✅ Old data cleaned');

  const userIds: string[] = [];
  const userHandles: string[] = [];

  // 1. Seed Users
  console.log('\n→ Seeding 10000 users...');
  const startTime = Date.now();
  for (let i = 0; i < 10000; i++) {
    const userId = uuidv4();
    const handle = `user_${i}`;
    userIds.push(userId);
    userHandles.push(handle);

    const neoSession = neo4jDriver.session();
    await neoSession.run(
      'CREATE (:User {user_id: $userId, handle: $handle, display_name: $name, verified: $verified, influence_score: 0.0})',
      { userId, handle, name: `User ${i}`, verified: Math.random() > 0.9 }
    );
    await neoSession.close();

    if ((i + 1) % 2000 === 0) {
      console.log(`  [Users] ${i + 1}/10000 (${Date.now() - startTime}ms)`);
    }
  }
  console.log(`✅ 10000 users seeded in ${Date.now() - startTime}ms`);

  // 2. Seed Follows
  console.log('\n→ Seeding 100000 follows...');
  const followStartTime = Date.now();
  for (let i = 0; i < 100000; i++) {
    const fromIdx = Math.floor(Math.random() * 10000);
    let toIdx = Math.floor(Math.random() * 10000);
    while (fromIdx === toIdx) toIdx = Math.floor(Math.random() * 10000);

    const neoSession = neo4jDriver.session();
    await neoSession.run(
      'MATCH (a:User {user_id: $fromId}), (b:User {user_id: $toId}) CREATE (a)-[:FOLLOWS {since: datetime()}]->(b)',
      { fromId: userIds[fromIdx], toId: userIds[toIdx] }
    );
    await neoSession.close();

    if ((i + 1) % 10000 === 0) {
      console.log(`  [Follows] ${i + 1}/100000 (${Date.now() - followStartTime}ms)`);
    }
  }
  console.log(`✅ 100000 follows seeded in ${Date.now() - followStartTime}ms`);

  // 3. Seed Posts
  console.log('\n→ Seeding 100000 posts...');
  const postStartTime = Date.now();
  const hashtags = ['#NoSQL', '#ScyllaDB', '#Neo4j', '#Redis', '#BigData', '#Tech', '#SocialMedia', '#Analytics', '#Database', '#Coding'];
  
  for (let i = 0; i < 100000; i++) {
    const userId = userIds[Math.floor(Math.random() * 10000)];
    const postId = TimeUuid.fromDate(new Date());
    const content = `This is post number ${i} about some interesting tech! #Tech #NoSQL`;
    const postHashtags = [hashtags[Math.floor(Math.random() * hashtags.length)], hashtags[Math.floor(Math.random() * hashtags.length)]];
    const postedAt = new Date();
    const yearMonth = format(postedAt, 'yyyy-MM');
    const hourBucket = format(postedAt, 'yyyy-MM-dd-HH');

    // Scylla Inserts
    const queries = [
      {
        query: 'INSERT INTO posts (post_id, user_id, content, hashtags, posted_at, lang) VALUES (?, ?, ?, ?, ?, ?)',
        params: [postId, Uuid.fromString(userId), content, postHashtags, postedAt, 'en']
      },
      {
        query: 'INSERT INTO posts_by_user (user_id, year_month, posted_at, post_id, content, hashtags) VALUES (?, ?, ?, ?, ?, ?)',
        params: [Uuid.fromString(userId), yearMonth, postedAt, postId, content, postHashtags]
      }
    ];

    for (const h of postHashtags) {
      queries.push({
        query: 'INSERT INTO hashtag_posts (hashtag, hour_bucket, posted_at, post_id, user_id) VALUES (?, ?, ?, ?, ?)',
        params: [h, hourBucket, postedAt, postId, Uuid.fromString(userId)]
      });
      // Redis Trending
      await redisClient.zIncrBy('trending:hashtags:hourly', 1, h);
    }

    await scyllaClient.batch(queries, { prepare: true });

    if ((i + 1) % 10000 === 0) {
      console.log(`  [Posts] ${i + 1}/100000 (${Date.now() - postStartTime}ms)`);
    }
  }
  console.log(`✅ 100000 posts seeded in ${Date.now() - postStartTime}ms`);

  // 4. Run Algorithms
  console.log('\n→ Running PageRank...');
  const neoSessionAlgo = neo4jDriver.session();
  await neoSessionAlgo.run("CALL gds.graph.project('followers', 'User', 'FOLLOWS')");
  await neoSessionAlgo.run("CALL gds.pageRank.write('followers', {writeProperty: 'influence_score'})");
  console.log('✅ PageRank done');

  console.log('→ Running Louvain...');
  await neoSessionAlgo.run("CALL gds.louvain.write('followers', {writeProperty: 'community_id'})");
  console.log('✅ Louvain done');

  console.log('→ Running Betweenness Centrality...');
  await neoSessionAlgo.run("CALL gds.betweenness.write('followers', {writeProperty: 'centrality_score'})");
  console.log('✅ Betweenness Centrality done');

  console.log('→ Running Weakly Connected Components...');
  await neoSessionAlgo.run("CALL gds.wcc.write('followers', {writeProperty: 'component_id'})");
  console.log('✅ WCC done');

  await neoSessionAlgo.close();

  console.log(`
╔══════════════════════════════════════════════════════╗
║  ✅ MEGA SEED COMPLETE                              ║
╚══════════════════════════════════════════════════════╝
  `);

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
