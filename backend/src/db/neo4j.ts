import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'password';

export const neo4jDriver = neo4j.driver(uri, neo4j.auth.basic(user, password));

export async function connectNeo4j() {
  try {
    await neo4jDriver.verifyConnectivity();
    console.log('✅ Neo4j connected');
  } catch (err) {
    console.error('❌ Neo4j connection error:', err);
    process.exit(1);
  }
}

export const getNeoSession = () => neo4jDriver.session();
