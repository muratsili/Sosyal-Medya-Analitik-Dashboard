// Constraints & Indexes
CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.user_id IS UNIQUE;
CREATE CONSTRAINT post_id_unique IF NOT EXISTS FOR (p:Post) REQUIRE p.post_id IS UNIQUE;
CREATE INDEX user_handle IF NOT EXISTS FOR (u:User) ON (u.handle);
CREATE INDEX user_influence IF NOT EXISTS FOR (u:User) ON (u.influence_score);
CREATE INDEX user_community IF NOT EXISTS FOR (u:User) ON (u.community_id);
CREATE INDEX user_centrality IF NOT EXISTS FOR (u:User) ON (u.centrality_score);
CREATE INDEX user_component IF NOT EXISTS FOR (u:User) ON (u.component_id);
