require('dotenv').config();
const fatal = require('../services/fatal');

const config = {
  port: process.env.PORT || 3000,
  db: {
    client: 'postgres',
    connection: {
      user: process.env.DB_USER || fatal('no DB_USER'),
      host: process.env.DB_HOST || fatal('no DB_HOST'),
      port: process.env.DB_PORT || fatal('no DB_PORT'),
      database: process.env.DB_NAME || fatal('no DB_NAME'),
      password: process.env.DB_PASS || fatal('no DB_PASS'),
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
  apiKey: process.env.API_KEY || fatal('no API_KEY'),
  apiOrigin: process.env.API_ORIGIN || fatal('no api origin'),
};

module.exports = config;
