// db.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

// kjør migrasjon hvis nødvendig
const migrateSql = fs.readFileSync(path.join(__dirname, 'migrate.sql'), 'utf8');
db.exec(migrateSql);

module.exports = db;
