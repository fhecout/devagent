const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[DB] Erro ao conectar:', err.message);
  } else {
    console.log('[DB] SQLite conectado:', dbPath);
    initializeTables();
  }
});

function initializeTables() {
  db.run(
    `CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_url TEXT NOT NULL,
      repo_name TEXT NOT NULL,
      model_used TEXT NOT NULL,
      technical_score REAL,
      summary TEXT,
      full_report TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
      if (err) {
        console.error('[DB] Erro ao criar tabela analyses:', err.message);
      } else {
        console.log('[DB] Tabela analyses pronta.');
      }
    }
  );
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

module.exports = { db, run, get, all };
