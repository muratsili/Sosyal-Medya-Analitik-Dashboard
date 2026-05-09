-- Keyspace (Hocanın istediği strateji)
CREATE KEYSPACE IF NOT EXISTS social
  WITH REPLICATION = {'class':'NetworkTopologyStrategy','replication_factor':1};

USE social;

-- Posts (per-user timeline)
CREATE TABLE IF NOT EXISTS posts_by_user (
  user_id uuid,
  year_month text,  -- "2026-04" bucketing
  posted_at timestamp,
  post_id timeuuid,
  content text,
  hashtags set<text>,
  mentions set<uuid>,
  media_urls list<text>,
  lang text,
  PRIMARY KEY ((user_id, year_month), posted_at, post_id)
) WITH CLUSTERING ORDER BY (posted_at DESC);

-- Post details (by post_id)
CREATE TABLE IF NOT EXISTS posts (
  post_id timeuuid PRIMARY KEY,
  user_id uuid,
  content text,
  hashtags set<text>,
  posted_at timestamp,
  lang text,
  sentiment text
);

-- Engagement events
CREATE TABLE IF NOT EXISTS engagement_events (
  post_id timeuuid,
  day text,  -- "2026-04-15" bucketing
  event_time timestamp,
  event_id timeuuid,
  user_id uuid,
  event_type text,  -- 'like','view','share','comment'
  PRIMARY KEY ((post_id, day), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC)
  AND default_time_to_live = 7776000;  -- 90 days (Hocanın istediği TTL)

-- Post counters (COUNTER type - Hocanın istediği)
CREATE TABLE IF NOT EXISTS post_counters (
  post_id timeuuid PRIMARY KEY,
  like_count counter,
  view_count counter,
  share_count counter,
  comment_count counter
);

-- Hashtag posts (by hour bucket)
CREATE TABLE IF NOT EXISTS hashtag_posts (
  hashtag text,
  hour_bucket text,  -- "2026-04-15-14"
  posted_at timestamp,
  post_id timeuuid,
  user_id uuid,
  PRIMARY KEY ((hashtag, hour_bucket), posted_at, post_id)
) WITH CLUSTERING ORDER BY (posted_at DESC);

-- User daily engagement summary
CREATE TABLE IF NOT EXISTS user_daily_stats (
  user_id uuid,
  day text,  -- "2026-04-15"
  posts_count counter,
  likes_received counter,
  shares_received counter,
  PRIMARY KEY (user_id, day)
);

-- Users table for Auth
CREATE TABLE IF NOT EXISTS users (
  email text PRIMARY KEY,
  user_id uuid,
  handle text,
  password_hash text,
  created_at timestamp
);
