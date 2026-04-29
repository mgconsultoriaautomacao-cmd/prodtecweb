import Dexie from 'dexie';

/**
 * Banco de Dados Local (IndexedDB) para o PWA.
 * Eu implementei este banco para garantir que o sistema funcione 100% offline.
 */
export const db = new Dexie('PackinghouseDB');

// Definição do Schema (Sincronizado com o Supabase)
db.version(1).stores({
  employees: '++id, barcode, name, role, remote_id, synced',
  fruits: '++id, name, remote_id',
  varieties: '++id, name, remote_id',
  parcels: '++id, code, remote_id',
  box_weights: '++id, name, weight_kg, remote_id',
  scan_events: '++id, ts, station_id, employee_id, raw_barcode, synced',
  quality_audits: '++id, ts, employee_id, penalty_boxes, synced',
  config: 'key, value'
});

/**
 * Função para salvar configurações do sistema localmente.
 */
export async function setConfig(key, value) {
  return await db.config.put({ key, value });
}

/**
 * Função para buscar configurações.
 */
export async function getConfig(key) {
  const row = await db.config.get(key);
  return row ? row.value : null;
}

/**
 * Adiciona um evento de leitura (Scan) localmente.
 * Marcaremos como synced = 0 para que o worker de sync saiba o que subir.
 */
export async function addScanEvent(event) {
  return await db.scan_events.add({
    ...event,
    ts: Date.now(),
    synced: 0
  });
}
