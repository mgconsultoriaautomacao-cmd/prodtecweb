const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

let _db = null;

function getDbPath() {
  const newUserDbDir = path.join(app.getPath('userData'), 'data');
  const newUserDbPath = path.join(newUserDbDir, 'packing.sqlite3');
  const oldLocalDbDir = path.resolve(__dirname, '..', 'data');
  const oldLocalDbPath = path.join(oldLocalDbDir, 'packing.sqlite3');

  console.log(`App: isPackaged=${app.isPackaged}, __dirname=${__dirname}`);
  console.log(`App: userData path=${app.getPath('userData')}`);

  if (app.isPackaged) {
    // Migration logic: check both possible source locations
    const sources = [
      path.join(path.resolve(__dirname, '..', 'data'), 'packing.sqlite3'),
      path.join(path.resolve(__dirname, '..'), 'production.db')
    ];

    if (!fs.existsSync(newUserDbPath)) {
      for (const source of sources) {
        if (fs.existsSync(source)) {
          console.log(`App: Migrating database from ${source} to userData directory...`);
          if (!fs.existsSync(newUserDbDir)) fs.mkdirSync(newUserDbDir, { recursive: true });
          try {
            fs.copyFileSync(source, newUserDbPath);
            console.log('App: Database migration successful.');
            break; // Migration complete
          } catch (err) {
            console.error(`App: Failed to migrate database from ${source}:`, err);
          }
        }
      }
    }

    if (!fs.existsSync(newUserDbDir)) fs.mkdirSync(newUserDbDir, { recursive: true });
    console.log(`App: DB Path resolved to: ${newUserDbPath} (PACKAGED)`);
    return newUserDbPath;
  }

  // Development mode
  if (!fs.existsSync(oldLocalDbDir)) fs.mkdirSync(oldLocalDbDir, { recursive: true });
  console.log(`App: DB Path resolved to: ${oldLocalDbPath} (DEV)`);
  return oldLocalDbPath;
}

function initDb() {
  if (_db) return _db;
  const db = new sqlite3.Database(getDbPath());
  _db = db;

  db.serialize(() => {
    db.run(`
      create table if not exists config (
        key text primary key,
        value text
      )
    `);

    db.run(`
      create table if not exists employees (
        id integer primary key autoincrement,
        barcode text not null,
        name text not null,
        role text not null,
        sector text,
        photo_path text,
        active integer not null default 1,
        created_at integer not null,
        updated_at integer not null,
        remote_id text unique,
        synced integer not null default 0,
        unique(barcode, role)
      )
    `);

    db.run(`
      create table if not exists fruits (
        id integer primary key autoincrement,
        name text not null unique,
        active integer not null default 1,
        created_at integer not null,
        updated_at integer not null,
        remote_id text unique,
        synced integer not null default 0
      )
    `);

    db.run(`
      create table if not exists varieties (
        id integer primary key autoincrement,
        name text not null unique,
        active integer not null default 1,
        created_at integer not null,
        updated_at integer not null,
        remote_id text unique,
        synced integer not null default 0
      )
    `);

    db.run(`
      create table if not exists parcels (
        id integer primary key autoincrement,
        code text not null unique,
        active integer not null default 1,
        created_at integer not null,
        updated_at integer not null,
        remote_id text unique,
        synced integer not null default 0
      )
    `);

    db.run(`
      create table if not exists box_weights (
        id integer primary key autoincrement,
        name text not null unique,
        weight_kg real,
        active integer not null default 1,
        created_at integer not null,
        updated_at integer not null,
        remote_id text,
        synced integer not null default 0
      )
    `);


    db.run(`
      create table if not exists parcel_fruit_varieties (
        parcel_id integer not null,
        fruit_id integer not null,
        variety_id integer not null,
        primary key (parcel_id, fruit_id, variety_id)
      )
    `);

    db.run(`
      create table if not exists station_context (
        station_id text not null,
        role text not null,
        parcel_id integer,
        fruit_id integer,
        variety_id integer,
        weight_id integer,
        updated_at integer not null,
        primary key (station_id, role)
      )
    `);

    db.run(`
      create table if not exists daily_production_summary (
        id integer primary key autoincrement,
        date text not null,
        station_id text not null,
        employee_id integer not null,
        employee_name text not null,
        role text not null,
        total_boxes integer not null,
        total_kg real not null,
        total_value real not null,
        created_at integer not null,
        unique(date, station_id, employee_id, role)
      )
    `);

    db.run(`
      create table if not exists scan_events (
        id integer primary key autoincrement,
        ts integer not null,
        station_id text not null,
        scanner_id text not null,
        role text not null,
        employee_id integer,
        raw_barcode text not null,
        parcel_id integer,
        fruit_id integer,
        variety_id integer,
        weight_id integer,
        synced integer not null default 0
      )
    `);

    db.run(`
      create table if not exists hourly_stats (
        hour_start integer not null,
        station_id text not null,
        role text not null,
        employee_id integer not null,
        produced_count integer not null default 0,
        quality_deducted integer not null default 0,
        primary key (hour_start, station_id, role, employee_id)
      )
    `);

    // EU PRECISO TERMINAR ESSAS MIGRAÇÕES AQUI
    const tablesToMigrate = [
      { table: 'employees', column: 'remote_id', type: 'text' },
      { table: 'employees', column: 'sector', type: 'text' },
      { table: 'fruits', column: 'remote_id', type: 'text' },
      { table: 'varieties', column: 'remote_id', type: 'text' },
      { table: 'parcels', column: 'remote_id', type: 'text' },
      { table: 'box_weights', column: 'remote_id', type: 'text' },
      { table: 'quality_audits', column: 'remote_id', type: 'text' },
      { table: 'scan_events', column: 'weight_id', type: 'integer' },
      { table: 'scan_events', column: 'synced', type: 'integer not null default 0' },
      { table: 'scan_events', column: 'caliber', type: 'text' },
      { table: 'employees', column: 'synced', type: 'integer not null default 0' },
      { table: 'fruits', column: 'synced', type: 'integer not null default 0' },
      { table: 'varieties', column: 'synced', type: 'integer not null default 0' },
      { table: 'parcels', column: 'synced', type: 'integer not null default 0' },
      { table: 'box_weights', column: 'synced', type: 'integer not null default 0' },
      { table: 'barcode_mappings', column: 'synced', type: 'integer not null default 0' },
      { table: 'daily_production_summary', column: 'synced', type: 'integer not null default 0' }
    ];

    tablesToMigrate.forEach(({ table, column, type }) => {
      db.run(`alter table ${table} add column ${column} ${type}`, (err) => {
        // Ignore se houver duplicidade
      });
    });

    // Índices UNIQUE para permitir o ON CONFLICT(remote_id)
    db.run(`create unique index if not exists idx_quality_audits_remote_id on quality_audits(remote_id)`, (err) => {});
    db.run(`create unique index if not exists idx_employees_remote_id on employees(remote_id)`, (err) => {});
    db.run(`create unique index if not exists idx_employees_barcode_role on employees(barcode, role)`, (err) => {});
    db.run(`create unique index if not exists idx_parcels_remote_id on parcels(remote_id)`, (err) => {});
    db.run(`create unique index if not exists idx_fruits_remote_id on fruits(remote_id)`, (err) => {});
    db.run(`create unique index if not exists idx_varieties_remote_id on varieties(remote_id)`, (err) => {});
    db.run(`create unique index if not exists idx_box_weights_remote_id on box_weights(remote_id)`, (err) => {});


    db.run(`
      create table if not exists barcode_mappings (
        barcode text primary key,
        employee_id integer not null,
        weight_id integer not null,
        created_at integer not null,
        updated_at integer not null,
        synced integer not null default 0
      )
    `);

    db.run(`
      create table if not exists quality_audits (
        id integer primary key autoincrement,
        ts integer not null,
        station_id text not null,
        employee_id integer not null,
        parcel_id integer,
        penalty_boxes integer not null default 0,
        issue_type text,
        reason text,
        remote_id text,
        synced integer not null default 0,
        unique(remote_id)
      )
    `);

    // FORCE UPDATE TO NEW PRODUCTION DATABASE (yiigaohjvvieeooxsban)
    // Isso garante que mesmo que o banco de dados já exista no computador do cliente, 
    // ele seja redirecionado para o novo ambiente de produção.
    const prodUrl = 'https://yiigaohjvvieeooxsban.supabase.co';
    const prodKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpaWdhb2hqdnZpZWVvb3hzYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTY1NzksImV4cCI6MjA5MDE5MjU3OX0.CjzcyltkTXHsi0zO7IL-sb5Psy7yMTAnJ7GRQ4maFK8';
    const prodTenantId = 'b7ad82dd-dca3-46af-91c6-5d564b7c3cc5'; // BOM JESUS

    db.get(`select value from config where key='supabase_url'`, (err, row) => {
      if (!row || row.value !== prodUrl) {
        console.log('App: Database URL mismatch. Updating to production...');
        db.run(`insert into config(key, value) values('supabase_url', ?) on conflict(key) do update set value=excluded.value`, [prodUrl]);
        db.run(`insert into config(key, value) values('supabase_key', ?) on conflict(key) do update set value=excluded.value`, [prodKey]);
      }
    });

  });

  return db;
}

function getDb() {
  return _db;
}

module.exports = { initDb, getDb };
