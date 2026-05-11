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

  // 2. Sincronizar Auditorias de Qualidade (Faltava este bloco!)
  const unsyncedAudits = await db.quality_audits.where('synced').equals(0).toArray();
  if (unsyncedAudits.length > 0) {
    const { error } = await supabase
      .from('quality_audits')
      .insert(unsyncedAudits.map(a => ({
        ts: new Date(a.ts).toISOString(),
        employee_id: a.employee_id, // UUID do funcionário
        penalty_boxes: a.penalty_boxes,
        issue_type: a.issue_type || 'Defeito',
        reason: a.reason || '',
        station_id: a.station_id || 'ST01',
        tenant_id: a.tenant_id // ID da empresa
      })));

    if (!error) {
      await db.quality_audits.where('id').anyOf(unsyncedAudits.map(a => a.id)).modify({ synced: 1 });
      console.log(`Sync Up: ${unsyncedAudits.length} auditorias de qualidade sincronizadas.`);
    } else {
      console.error('Erro ao sincronizar auditorias:', error);
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
