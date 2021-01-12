const Knex = require('knex');
const { db: dbConfig } = require('../config');

const client = new Knex(dbConfig);

async function testConnection() {
  try {
    await client.raw('select now()');
    console.log('DB connection done!');
  } catch (error) {
    console.log(`Test connection failed: ${error.message || error}`);
    throw error;
  }
}

module.exports = {
  testConnection,
};
