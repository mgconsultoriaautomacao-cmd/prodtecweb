// Supabase Edge Function: send-daily-report
// Dispara relatórios via Evolution API quando o responsável finaliza o dia
// Deploy: supabase functions deploy send-daily-report

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductionScan {
  employee_name: string;
  role: string;
  weight_kg: number;
}

interface Employee {
  name: string;
  whatsapp: string | null;
}

Deno.serve(async (req: Request) => {
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
      .select('name, evo_api_url, evo_api_key, evo_instance, wa_template_employee, wa_template_manager')
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

    // 3. Agregar dados para os relatórios
    const empData: Record<string, { boxes: number; kg: number; role: string }> = {};
    const parcelData: Record<string, { boxes: number; kg: number }> = {};
    const varietyData: Record<string, { boxes: number; kg: number }> = {};
    const weightData: Record<string, { boxes: number; kg: number }> = {};

    scans.forEach((s: any) => {
      // Por funcionário
      if (!empData[s.employee_name]) empData[s.employee_name] = { boxes: 0, kg: 0, role: s.role };
      empData[s.employee_name].boxes++;
      empData[s.employee_name].kg += s.weight_kg || 0;

      // Por parcela
      const pKey = s.parcel_code || 'N/A';
      if (!parcelData[pKey]) parcelData[pKey] = { boxes: 0, kg: 0 };
      parcelData[pKey].boxes++;
      parcelData[pKey].kg += s.weight_kg || 0;

      // Por variedade
      const vKey = `${s.fruit_name || ''} ${s.variety_name || ''}`.trim() || 'N/A';
      if (!varietyData[vKey]) varietyData[vKey] = { boxes: 0, kg: 0 };
      varietyData[vKey].boxes++;
      varietyData[vKey].kg += s.weight_kg || 0;

      // Por tipo de caixa (peso)
      const wKey = s.weight_name || 'N/A';
      if (!weightData[wKey]) weightData[wKey] = { boxes: 0, kg: 0 };
      weightData[wKey].boxes++;
      weightData[wKey].kg += s.weight_kg || 0;
    });

    // 4. Buscar funcionários ATIVOS que tenham whatsapp
    const { data: employees } = await supabase
      .from('employees')
      .select('name, whatsapp, role, active')
      .eq('tenant_id', tenant_id)
      .eq('active', true) // APENAS ATIVOS
      .not('whatsapp', 'is', null);

    const empWhatsapp: Record<string, string> = {};
    const supervisorNumbers = new Set<string>();

    employees?.forEach((e: any) => {
      if (e.whatsapp) {
        // Mapeia whatsapp para o relatório individual
        empWhatsapp[e.name] = e.whatsapp;
        
        // Se for supervisor ou gerente, adiciona à lista do relatório consolidado
        const role = String(e.role).toUpperCase();
        if (role === 'SUPERVISOR' || role === 'MANAGER' || role === 'ADMIN') {
          supervisorNumbers.add(e.whatsapp);
        }
      }
    });

    // 5. Buscar gestores
    const { data: managers } = await supabase
      .from('tenant_users')
      .select('whatsapp')
      .eq('tenant_id', tenant_id)
      .not('whatsapp', 'is', null);

    const sorted = Object.entries(empData).sort((a, b) => b[1].boxes - a[1].boxes);
    const medals = ['🥇', '🥈', '🥉'];
    const totalBoxes = scans.length;
    const totalKg = (scans as ProductionScan[]).reduce((sum: number, x: ProductionScan) => sum + (x.weight_kg || 0), 0);
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
      
      let msg = tenant.wa_template_employee || [
        `📦 *Produção do dia — {nome}*`,
        `📅 {data} | *{empresa}*`,
        ``,
        `✅ Caixas produzidas: *{caixas} cx*`,
        ``,
        `_Sistema Prodtech — Obrigado pelo trabalho de hoje!_ 🌟`,
      ].join('\n');

      msg = msg.replace(/{nome}/g, name)
               .replace(/{data}/g, dateFormatted)
               .replace(/{empresa}/g, tenant.name)
               .replace(/{caixas}/g, String(d.boxes))
               .replace(/{peso}/g, d.kg.toFixed(1))
               .replace(/{ranking}/g, medal);

      await sendWhatsApp(wa, msg);
    }

    // ── 7. Enviar relatório completo para supervisores e gerentes ──
    const totalCaixas = scans.length;
    const totalToneladas = (totalKg / 1000).toFixed(2);

    // Detalhes por Parcela
    const detalhesParcelas = Object.entries(parcelData)
      .map(([p, d]) => `📍 *Parcela ${p}*: ${d.boxes} cx (${(d.kg/1000).toFixed(2)} ton)`)
      .join('\n');

    // Detalhes por Variedade
    const detalhesVariedades = Object.entries(varietyData)
      .map(([v, d]) => `🍇 *${v}*: ${d.boxes} cx`)
      .join('\n');

    // Detalhes por Tipo de Caixa
    const detalhesPesos = Object.entries(weightData)
      .map(([w, d]) => `📦 *Caixa ${w}*: ${d.boxes} unidades`)
      .join('\n');

    let managerMsg = [
      `📊 *RESUMO GERAL DE PRODUÇÃO*`,
      `📅 ${dateFormatted} | *${tenant.name}*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📑 *POR PARCELA:*`,
      detalhesParcelas,
      ``,
      `📑 *POR VARIEDADE:*`,
      detalhesVariedades,
      ``,
      `📑 *POR TIPO DE CAIXA:*`,
      detalhesPesos,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📈 *TOTAL DO DIA:*`,
      `✅ Caixas: *${totalCaixas}*`,
      `⚖️ Peso: *${totalToneladas} Toneladas*`,
      `👥 Colaboradores: *${sorted.length}*`,
      ``,
      `_Relatório gerado pelo Sistema Prodtech_`,
    ].join('\n');

    // Adiciona o número principal do cadastro do tenant também, por segurança
    if (tenant.wa_manager_phone) supervisorNumbers.add(tenant.wa_manager_phone);

    console.log(`Relatório: Enviando consolidado para ${supervisorNumbers.size} supervisores/gerentes.`);
    for (const num of supervisorNumbers) {
      await sendWhatsApp(num, managerMsg);
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
