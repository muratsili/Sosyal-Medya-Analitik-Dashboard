import { scyllaClient } from './db/scylla';
import { neo4jDriver } from './db/neo4j';
import { intervalToDuration } from 'date-fns';

async function syncFollows() {
  console.log('🔄 Sync Worker: Starting follow sync...');
  // In a real system, we'd use a "last_synced_at" pointer or Change Data Capture (CDC)
  // For this project, we'll simulate a worker that periodically checks for new data
  
  // Simulation: ScyllaDB -> Neo4j sync logic would go here
  console.log('✅ Sync Worker: Follows synced.');
}

async function startWorker() {
  console.log('🚀 Sync Worker started.');
  setInterval(syncFollows, 60000); // Run every minute
}

startWorker();
