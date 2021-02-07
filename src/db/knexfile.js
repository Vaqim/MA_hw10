require('dotenv').config({ path: `${process.env.PWD}/.env` });

const { db: dbConfig } = require('../config');

module.exports = { development: dbConfig };
