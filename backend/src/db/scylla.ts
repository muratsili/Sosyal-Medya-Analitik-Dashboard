import { Client, types } from 'cassandra-driver';
import dotenv from 'dotenv';

dotenv.config();

const contactPoints = process.env.SCYLLA_CONTACT_POINTS?.split(',') || ['127.0.0.1'];
const localDataCenter = process.env.SCYLLA_LOCAL_DATA_CENTER || 'datacenter1';
const keyspace = process.env.SCYLLA_KEYSPACE || 'social';

export const scyllaClient = new Client({
  contactPoints,
  localDataCenter,
  keyspace,
});

export async function connectScylla() {
  try {
    await scyllaClient.connect();
    console.log('✅ ScyllaDB connected');
  } catch (err) {
    console.error('❌ ScyllaDB connection error:', err);
    process.exit(1);
  }
}

export const TimeUuid = types.TimeUuid;
export const Uuid = types.Uuid;
