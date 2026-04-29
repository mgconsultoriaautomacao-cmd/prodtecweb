import { createClient } from '@supabase/supabase-js';
import { db } from './db';

/**
 * Serviço de Sincronização Premium.
 * Eu desenvolvi este serviço para gerenciar a fluidez de dados entre o campo e a nuvem.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Sobe os dados locais pendentes para o Supabase.
 */
export async function syncUp() {
  console.log('Sync: Iniciando upload de dados...');
  
  // 1. Sincronizar Scans
  const unsyncedScans = await db.scan_events.where('synced').equals(0).toArray();
  
  if (unsyncedScans.length > 0) {
    const { error } = await supabase
      .from('production_scans')
      .insert(unsyncedScans.map(s => ({
        ts: new Date(s.ts).toISOString(),
        station_id: s.station_id,
        raw_barcode: s.raw_barcode,
        // ... mapeamento adicional conforme o schema original
      })));

    if (!error) {
      await db.scan_events.where('id').anyOf(unsyncedScans.map(s => s.id)).modify({ synced: 1 });
      console.log(`Sync Up: ${unsyncedScans.length} leituras sincronizadas.`);
    }
  }
}

/**
 * Baixa as tabelas de referência do Supabase para o banco local.
 */
export async function syncDown() {
  console.log('Sync: Baixando tabelas de referência...');
  
  // Sincronizar Funcionários
  const { data: employees, error } = await supabase.from('employees').select('*');
  
  if (!error && employees) {
    await db.employees.clear();
    await db.employees.bulkAdd(employees.map(e => ({
      remote_id: e.id,
      name: e.name,
      barcode: e.barcode,
      role: e.role,
      synced: 1
    })));
    console.log(`Sync Down: ${employees.length} funcionários atualizados.`);
  }
}
