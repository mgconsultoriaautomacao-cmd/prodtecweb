// @ts-nocheck
// Supabase Edge Function: send-daily-report
// Dispara relatórios via Evolution API quando o responsável finaliza o dia
// Deploy: npx supabase functions deploy send-daily-report --no-verify-jwt --project-ref yiigaohjvvieeooxsban

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req: Request) => {
  // ── Preflight ──
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const warnings: string[] = [];
  let step = 'parse';

  try {
    // ── 1. Parse body ──
    const body = await req.json();
    const { tenant_id, date } = body;
    if (!tenant_id || !date) throw new Error('tenant_id e date são obrigatórios');

    step = 'supabase_client';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── 2. Buscar tenant ──
    step = 'fetch_tenant';
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('name, evo_api_url, evo_api_key, evo_instance, wa_template_employee, wa_template_manager')
      .eq('id', tenant_id)
      .single();

    if (tenantErr || !tenant) throw new Error(`Tenant não encontrado (id=${tenant_id}): ${tenantErr?.message}`);

    const evoEnabled = !!(tenant.evo_api_url && tenant.evo_api_key && tenant.evo_instance);
    if (!evoEnabled) {
      warnings.push('Evolution API não configurada — relatórios WhatsApp ignorados');
      console.warn('[send-daily-report] Evolution API não configurada para o tenant:', tenant_id);
    }

    // ── 3. Buscar scans do dia ──
    // Filtra por intervalo do dia completo. Usa formato sem Z para cobrir o timestamp armazenado,
    // independente de como o Supabase indexou o timezone.
    step = 'fetch_scans';
    const { data: rawScans, error: errScans } = await supabase
      .from('production_scans')
      .select('*')
      .eq('tenant_id', tenant_id)
      .or(`ts.gte.${date}T00:00:00,ts.lte.${date}T23:59:59`)
      .order('ts', { ascending: true });

    if (errScans) {
      warnings.push(`Erro ao buscar scans: ${errScans.message}`);
      console.error('[send-daily-report] Erro scans:', errScans);
    }
    const scans = rawScans || [];

    // ── 4. Buscar lançamentos manuais / colheita ──
    step = 'fetch_bulk';
    const { data: rawBulk, error: errBulk } = await supabase
      .from('bulk_sales')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('date', date);

    if (errBulk) {
      warnings.push(`Erro ao buscar bulk_sales: ${errBulk.message}`);
      console.error('[send-daily-report] Erro bulk:', errBulk);
    }
    const bulk = rawBulk || [];

    console.log(`[send-daily-report] date=${date} | scans=${scans.length} | bulk=${bulk.length}`);

    if (scans.length === 0 && bulk.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Nenhum registro encontrado para esta data', warnings }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 5. Buscar pesos de carrocão por fruta ──
    step = 'fetch_fruits';
    const { data: fruitConfigs } = await supabase
      .from('fruits')
      .select('name, harvest_weight')
      .eq('tenant_id', tenant_id);

    const fruitHarvestWeights: Record<string, number> = {};
    fruitConfigs?.forEach((f: any) => {
      fruitHarvestWeights[f.name] = Number(f.harvest_weight) || 300;
    });

    // ── 6. Agregar dados ──
    step = 'aggregate';
    const empData: Record<string, { boxes: number; kg: number; role: string }> = {};
    const parcelData: Record<string, { boxes: number; kg: number; carrocoes: number }> = {};
    const varietyData: Record<string, { boxes: number; kg: number }> = {};
    const weightData: Record<string, { boxes: number; kg: number }> = {};
    const varietyHarvestData: Record<string, { kg: number; carrocoes: number }> = {};

    // Processar Scans (Packing House)
    scans.forEach((s: any) => {
      const empName = s.employee_name || 'Desconhecido';
      if (!empData[empName]) empData[empName] = { boxes: 0, kg: 0, role: s.role || 'PACKER' };
      empData[empName].boxes++;
      empData[empName].kg += Number(s.weight_kg) || 0;

      const pKey = s.parcel_code || 'N/A';
      if (!parcelData[pKey]) parcelData[pKey] = { boxes: 0, kg: 0, carrocoes: 0 };
      parcelData[pKey].boxes++;
      parcelData[pKey].kg += Number(s.weight_kg) || 0;

      const vKey = `${s.fruit_name || ''} ${s.variety_name || ''}`.trim() || 'N/A';
      if (!varietyData[vKey]) varietyData[vKey] = { boxes: 0, kg: 0 };
      varietyData[vKey].boxes++;
      varietyData[vKey].kg += Number(s.weight_kg) || 0;

      const wKey = s.weight_name || 'N/A';
      if (!weightData[wKey]) weightData[wKey] = { boxes: 0, kg: 0 };
      weightData[wKey].boxes++;
      weightData[wKey].kg += Number(s.weight_kg) || 0;
    });

    // Processar Lançamentos Manuais (Campo)
    bulk.forEach((b: any) => {
      const pKey = b.parcel_code || 'N/A';
      if (!parcelData[pKey]) parcelData[pKey] = { boxes: 0, kg: 0, carrocoes: 0 };

      const kg = Number(b.weight_kg) || 0;
      parcelData[pKey].kg += kg;

      const varietyName = b.variety_name || 'OUTRA';
      const fruitName = b.fruit_name || 'N/A';
      const pesoPadrao = fruitHarvestWeights[fruitName] || 300;
      const nCarr = kg / (pesoPadrao > 0 ? pesoPadrao : 300);

      if (!b.is_waste) {
        parcelData[pKey].carrocoes += nCarr;
        if (!varietyHarvestData[varietyName]) varietyHarvestData[varietyName] = { kg: 0, carrocoes: 0 };
        varietyHarvestData[varietyName].kg += kg;
        varietyHarvestData[varietyName].carrocoes += nCarr;
      }

      if (!varietyData[varietyName]) varietyData[varietyName] = { boxes: 0, kg: 0 };
      varietyData[varietyName].kg += kg;
    });

    // ── 7. Buscar funcionários com WhatsApp ──
    step = 'fetch_employees';
    const { data: employees } = await supabase
      .from('employees')
      .select('name, whatsapp, role, active')
      .eq('tenant_id', tenant_id)
      .eq('active', true)
      .not('whatsapp', 'is', null);

    const empWhatsapp: Record<string, string> = {};
    const supervisorNumbers = new Set<string>();

    employees?.forEach((e: any) => {
      if (e.whatsapp) {
        empWhatsapp[e.name] = e.whatsapp;
        const role = String(e.role || '').toUpperCase();
        if (role === 'SUPERVISOR' || role === 'MANAGER' || role === 'ADMIN') {
          supervisorNumbers.add(e.whatsapp);
        }
      }
    });

    // Nota: wa_manager_phone removido — managers são detectados via role em tenant_users (acima)

    // ── 8. Construir mensagens ──
    step = 'build_messages';
    const sorted = Object.entries(empData).sort((a, b) => b[1].boxes - a[1].boxes);
    const medals = ['🥇', '🥈', '🥉'];
    const dateFormatted = new Date(date + 'T12:00:00Z').toLocaleDateString('pt-BR');

    const totalBoxes = scans.length;
    const totalKgScans = scans.reduce((sum: number, x: any) => sum + (Number(x.weight_kg) || 0), 0);
    const totalKgBulk = bulk.reduce((sum: number, x: any) => sum + (Number(x.weight_kg) || 0), 0);
    const totalKgTotal = totalKgScans + totalKgBulk;
    const totalToneladas = (totalKgTotal / 1000).toFixed(2);
    const totalCarrocoes = Math.round(Object.values(parcelData).reduce((sum, p) => sum + p.carrocoes, 0));

    // Detalhes para relatório do gerente
    const detalhesParcelas = Object.entries(parcelData)
      .map(([p, d]) => {
        const nCarrocoes = Math.round(d.carrocoes);
        return `📍 *Parcela ${p}*: ${d.boxes > 0 ? d.boxes + ' cx | ' : ''}${(d.kg / 1000).toFixed(2)} ton (~${nCarrocoes} carr)`;
      })
      .join('\n');

    const detalhesVariedadesCampo = Object.entries(varietyHarvestData)
      .map(([v, d]) => `🚜 *${v}*: ${Math.round(d.carrocoes)} carr | ${(d.kg / 1000).toFixed(2)} ton`)
      .join('\n');

    const detalhesVariedades = Object.entries(varietyData)
      .map(([v, d]) => `🍇 *${v}*: ${d.boxes} cx`)
      .join('\n');

    const managerMsg = [
      `📊 *RESUMO GERAL DE PRODUÇÃO*`,
      `📅 ${dateFormatted} | *${tenant.name}*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `📍 *PRODUÇÃO POR PARCELA:*`,
      detalhesParcelas || '_Nenhum registro por parcela_',
      ``,
      `🚜 *COLHEITA POR VARIEDADE:*`,
      detalhesVariedadesCampo || '_Nenhum lançamento de campo_',
      ``,
      `🍇 *EMBALAGEM POR VARIEDADE:*`,
      detalhesVariedades || '_Nenhuma embalagem registrada_',
      ``,
      `📈 *TOTAIS DO DIA:*`,
      `✅ Caixas: *${totalBoxes}*`,
      `⚖️ Peso: *${totalToneladas} Toneladas*`,
      `🚛 Carrocões Est.: *~${totalCarrocoes}*`,
      `👥 Colaboradores: *${sorted.length}*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `_Relatório gerado pelo Sistema Prodtech_`,
    ].join('\n');

    // ── 9. Enviar WhatsApp (opcional — não quebra se falhar) ──
    step = 'send_whatsapp';
    let sentCount = 0;

    if (evoEnabled) {
      const sendWhatsApp = async (number: string, message: string): Promise<boolean> => {
        try {
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
          else {
            const errText = await res.text().catch(() => '');
            console.error(`[WA] Falha ao enviar para ${number}: ${res.status} ${errText}`);
          }
          return res.ok;
        } catch (waErr: any) {
          console.error(`[WA] Exceção ao enviar para ${number}:`, waErr.message);
          warnings.push(`WhatsApp: ${waErr.message}`);
          return false;
        }
      };

      // Enviar para Packers / Stackers (individualmente)
      for (const [name, d] of sorted) {
        const wa = empWhatsapp[name];
        if (!wa) continue;
        const role = String(d.role || '').toUpperCase();
        if (role === 'HARVESTER' || role === 'COLHEDOR' || role === 'CAMPO') continue;

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

        msg = msg
          .replace(/{nome}/g, name)
          .replace(/{data}/g, dateFormatted)
          .replace(/{empresa}/g, tenant.name)
          .replace(/{caixas}/g, String(d.boxes))
          .replace(/{peso}/g, d.kg.toFixed(1))
          .replace(/{ranking}/g, medal);

        await sendWhatsApp(wa, msg);
      }

      // Enviar para Colhedores (relatório de campo)
      for (const [name, d] of sorted) {
        const wa = empWhatsapp[name];
        if (!wa) continue;
        const role = String(d.role || '').toUpperCase();
        if (role !== 'HARVESTER' && role !== 'COLHEDOR' && role !== 'CAMPO') continue;

        const mainFruit = scans.find((s: any) => s.employee_name === name)?.fruit_name || 'N/A';
        const pesoCarrocao = fruitHarvestWeights[mainFruit] || 300;
        const carrocoes = Math.round(d.kg / pesoCarrocao) || 1;

        const msgCampo = [
          `🚜 *Relatório de Colheita — ${name}*`,
          `📅 ${dateFormatted} | *${tenant.name}*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          `✅ Total Colhido: *${d.kg.toFixed(0)} kg*`,
          `🚛 Est. Carrocões: *~${carrocoes} un* (Base: ${pesoCarrocao}kg)`,
          `📦 Equiv. Caixas: *${d.boxes} cx*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          `_Bom trabalho no campo hoje!_ 🌱`,
        ].join('\n');

        await sendWhatsApp(wa, msgCampo);
      }

      // Enviar consolidado para supervisores / gerentes
      console.log(`[send-daily-report] Enviando consolidado para ${supervisorNumbers.size} supervisores/gerentes`);
      for (const num of supervisorNumbers) {
        await sendWhatsApp(num, managerMsg);
      }
    }

    // ── 10. Salvar resumo diário no banco ──
    step = 'save_summaries';
    if (sorted.length > 0) {
      const summaries = sorted.map(([name, d]) => ({
        tenant_id,
        date,
        employee_name: name,
        role: d.role,
        total_boxes: d.boxes,
        total_kg: d.kg,
        total_value: 0,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabase.from('daily_summaries').upsert(summaries, {
        onConflict: 'tenant_id,date,employee_name',
        ignoreDuplicates: false,
      });

      if (upsertErr) {
        warnings.push(`Falha ao salvar daily_summaries: ${upsertErr.message}`);
        console.error('[send-daily-report] Upsert error:', upsertErr);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sent: sentCount,
        employees: sorted.length,
        scans: scans.length,
        bulk: bulk.length,
        evo_enabled: evoEnabled,
        warnings,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error(`[send-daily-report] ERRO no passo "${step}":`, err.message);
    return new Response(
      JSON.stringify({ ok: false, error: err.message, step, warnings: [] }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
