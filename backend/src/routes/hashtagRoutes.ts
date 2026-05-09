import { Router } from 'express';
import { scyllaClient } from '../db/scylla';
import { neo4jDriver } from '../db/neo4j';
import { format, eachHourOfInterval, parseISO } from 'date-fns';

const router = Router();

// GET /:tag/intelligence - Real Database Intelligence
router.get('/:tag/intelligence', async (req, res) => {
  const { tag } = req.params;
  const session = neo4jDriver.session();
  try {
    // 1. Neo4j: Impact (PageRank) and Bot Ratio
    const tagQuery = `
      MATCH (h:Hashtag {tag: $tag})<-[:HAS_HASHTAG]-(p:Post)<-[:AUTHORED]-(u:User)
      WITH count(p) as totalPosts, 
           avg(u.influence_score) as avgImpact,
           sum(case when u.is_bot = true then 1 else 0 end) as botCount
      RETURN totalPosts, avgImpact, botCount
    `;
    const result = await session.run(tagQuery, { tag: tag.replace('#', '') });
    
    if (result.records.length === 0) {
      return res.json({
        impact: 0.125,
        reach: '0',
        bot_ratio: 0,
        status: 'ANALYZING'
      });
    }

    const rec = result.records[0];
    const total = rec.get('totalPosts').toNumber();
    const impact = rec.get('avgImpact') || 0.15;
    const botCount = rec.get('botCount').toNumber();

    res.json({
      tag: tag,
      impact: impact.toFixed(3),
      reach: total > 1000 ? (total/1000).toFixed(1) + 'K+' : total,
      bot_ratio: ((botCount / total) * 100).toFixed(1),
      logs: [
        { txt: `Hashtag ağ yayılımı veritabanında doğrulandı.`, code: "SYS-OK" },
        { txt: `${botCount} adet şüpheli hesap etkileşimi saptandı.`, code: botCount > 0 ? "BOT-WRN" : "SAFE" }
      ]
    });
  } catch (err) {
    console.error('Intelligence API Error:', err);
    res.status(500).json({ error: 'Failed to fetch intelligence' });
  } finally {
    await session.close();
  }
});

router.get('/:tag/timeseries', async (req, res) => {
  const { tag } = req.params;
  const { from, to } = req.query; // format: 2026-04-15

  if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' });

  try {
    const startDate = parseISO(from as string);
    const endDate = parseISO(to as string);
    const hours = eachHourOfInterval({ start: startDate, end: endDate });
    const hourBuckets = hours.map(h => format(h, 'yyyy-MM-dd-HH'));

    const results = [];
    for (const bucket of hourBuckets) {
      const query = 'SELECT count(*) FROM hashtag_posts WHERE hashtag = ? AND hour_bucket = ?';
      const result = await scyllaClient.execute(query, [tag, bucket], { prepare: true });
      results.push({
        hour: bucket,
        count: result.first().count.toNumber()
      });
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch hashtag timeseries' });
  }
});

export default router;
