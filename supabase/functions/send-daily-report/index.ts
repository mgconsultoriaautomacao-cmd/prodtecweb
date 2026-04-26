// Supabase Edge Function: send-daily-report
// Dispara relatórios via Evolution API quando o responsável finaliza o dia
// Deploy: supabase functions deploy send-daily-report

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { tenant_id, date } = await req.json();
    if (!tenant_id || !date) throw new Error('tenant_id e date são obrigatórios');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Buscar configurações do tenant (Evolution API)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, evo_api_url, evo_api_key, evo_instance')
      .eq('id', tenant_id)
      .single();

    if (!tenant) throw new Error('Tenant não encontrado');
    if (!tenant.evo_api_url) throw new Error('Evolution API não configurada para este tenant');

    // 2. Buscar scans do dia
    const { data: scans } = await supabase
      .from('production_scans')
      .select('*')
      .eq('tenant_id', tenant_id)
      .gte('ts', `${date}T00:00:00Z`)
      .lte('ts', `${date}T23:59:59Z`);

    if (!scans || scans.length === 0) throw new Error('Nenhum registro para esta data');

    // 3. Agregar por funcionário
    const empData: Record<string, { boxes: number; kg: number; role: string; whatsapp?: string }> = {};
    scans.forEach(s => {
      if (!empData[s.employee_name]) empData[s.employee_name] = { boxes: 0, kg: 0, role: s.role };
      empData[s.employee_name].boxes++;
      empData[s.employee_name].kg += s.weight_kg || 0;
    });

    // 4. Buscar whatsapp dos funcionários
    const { data: employees } = await supabase
      .from('employees')
      .select('name, whatsapp')
      .eq('tenant_id', tenant_id)
      .not('whatsapp', 'is', null);

    const empWhatsapp: Record<string, string> = {};
    employees?.forEach(e => { if (e.whatsapp) empWhatsapp[e.name] = e.whatsapp; });

    // 5. Buscar gestores
    const { data: managers } = await supabase
      .from('tenant_users')
      .select('whatsapp')
      .eq('tenant_id', tenant_id)
      .not('whatsapp', 'is', null);

    const sorted = Object.entries(empData).sort((a, b) => b[1].boxes - a[1].boxes);
    const medals = ['🥇', '🥈', '🥉'];
    const totalBoxes = scans.length;
    const totalKg = scans.reduce((s, x) => s + (x.weight_kg || 0), 0);
    const dateFormatted = new Date(date + 'T12:00:00Z').toLocaleDateString('pt-BR');

    let sentCount = 0;

    // ── Helper: enviar mensagem via Evolution API ──
    async function sendWhatsApp(number: string, message: string) {
      const url = `${tenant.evo_api_url}/message/sendText/${tenant.evo_instance}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': tenant.evo_api_key,
        },
        body: JSON.stringify({
          number: number.replace(/\D/g, ''),
          text: message,
        }),
      });
      if (res.ok) sentCount++;
      return res.ok;
    }

    // ── 6. Enviar para cada funcionário ──
    for (const [name, d] of sorted) {
      const wa = empWhatsapp[name];
      if (!wa) continue;
      const pos = sorted.findIndex(([n]) => n === name) + 1;
      const medal = pos <= 3 ? medals[pos - 1] : `#${pos}`;
      const msg = [
        `📦 *Produção do dia — ${name}*`,
        `📅 ${dateFormatted} | *${tenant.name}*`,
        ``,
        `✅ Caixas produzidas: *${d.boxes} cx*`,
        ``,
        `_Sistema Prodtech — Obrigado pelo trabalho de hoje!_ 🌟`,
      ].join('\n');
      await sendWhatsApp(wa, msg);
    }

    // ── 7. Enviar relatório completo para gestores ──
    const managerMsg = [
      `📊 *Relatório de Produção — ${tenant.name}*`,
      `📅 ${dateFormatted}`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      ...sorted.map(([name, d], i) => {
        const medal = i < 3 ? medals[i] : `  ${i+1}.`;
        return `${medal} *${name}* — ${d.boxes} cx | ${d.kg.toFixed(1)} kg`;
      }),
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📦 *Total: ${totalBoxes} caixas | ${totalKg.toFixed(1)} kg*`,
      `👥 ${sorted.length} colaboradores`,
      ``,
      `_Relatório gerado automaticamente pelo sistema Prodtech_`,
    ].join('\n');

    for (const manager of (managers || [])) {
      if (manager.whatsapp) await sendWhatsApp(manager.whatsapp, managerMsg);
    }

    // ── 8. Salvar resumo diário no banco (upsert) ──
    const summaries = sorted.map(([name, d]) => ({
      tenant_id,
      date,
      employee_name: name,
      role: d.role,
      total_boxes: d.boxes,
      total_kg: d.kg,
      total_value: 0, // Calculado separadamente se houver valor/caixa
      updated_at: new Date().toISOString(),
    }));

    await supabase.from('daily_summaries').upsert(summaries, {
      onConflict: 'tenant_id,date,employee_name',
      ignoreDuplicates: false,
    });

    return new Response(JSON.stringify({ ok: true, sent: sentCount, employees: sorted.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
