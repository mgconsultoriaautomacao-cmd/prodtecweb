// Supabase Edge Function: send-daily-report
// Dispara relatórios via Evolution API quando o responsável finaliza o dia
// Deploy: supabase functions deploy send-daily-report

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

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

    // 2. Buscar scans do dia (Packing House)
    const { data: rawScans, error: errScans } = await supabase
      .from('production_scans')
      .select('*')
      .eq('tenant_id', tenant_id)
      .gte('ts', `${date}T00:00:00Z`)
      .lte('ts', `${date}T23:59:59Z`);

    if (errScans) console.error('Erro ao buscar scans:', errScans);
    const scans = rawScans || [];

    // 2.1 Buscar lançamentos manuais / colheita (Campo)
    const { data: rawBulk, error: errBulk } = await supabase
      .from('bulk_sales')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('date', date);

    if (errBulk) console.error('Erro ao buscar bulk:', errBulk);
    const bulk = rawBulk || [];

    if (scans.length === 0 && bulk.length === 0) {
       console.log('Nenhum registro encontrado para:', date);
       return new Response(JSON.stringify({ ok: false, error: 'Nenhum registro encontrado para esta data' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
       });
    }

    // 3. Agregar dados para os relatórios
    const empData: Record<string, { boxes: number; kg: number; role: string }> = {};
    const parcelData: Record<string, { boxes: number; kg: number; carrocoes: number }> = {};
    const varietyData: Record<string, { boxes: number; kg: number }> = {};
    const weightData: Record<string, { boxes: number; kg: number }> = {};

    // Processar Scans
    scans.forEach((s: any) => {
      if (!empData[s.employee_name]) empData[s.employee_name] = { boxes: 0, kg: 0, role: s.role };
      empData[s.employee_name].boxes++;
      empData[s.employee_name].kg += s.weight_kg || 0;

      const pKey = s.parcel_code || 'N/A';
      if (!parcelData[pKey]) parcelData[pKey] = { boxes: 0, kg: 0, carrocoes: 0 };
      parcelData[pKey].boxes++;
      parcelData[pKey].kg += s.weight_kg || 0;

      const vKey = `${s.fruit_name || ''} ${s.variety_name || ''}`.trim() || 'N/A';
      if (!varietyData[vKey]) varietyData[vKey] = { boxes: 0, kg: 0 };
      varietyData[vKey].boxes++;
      varietyData[vKey].kg += s.weight_kg || 0;

      const wKey = s.weight_name || 'N/A';
      if (!weightData[wKey]) weightData[wKey] = { boxes: 0, kg: 0 };
      weightData[wKey].boxes++;
      weightData[wKey].kg += s.weight_kg || 0;
    });

    // Processar Lançamentos Manuais (Campo/Carrocões)
    const varietyHarvestData: Record<string, { kg: number; carrocoes: number }> = {};
    
    if (bulk && Array.isArray(bulk)) {
      bulk.forEach((b: any) => {
        const pKey = b.parcel_code || 'N/A';
        if (!parcelData[pKey]) parcelData[pKey] = { boxes: 0, kg: 0, carrocoes: 0 };
        
        const kg = Number(b.weight_kg) || 0;
        parcelData[pKey].kg += kg;
        
        // Busca o peso do carrocão para esta fruta para calcular a quantidade
        const varietyName = b.variety_name || 'OUTRA';
        const fruitName = b.fruit_name || varietyName.split(' ')[0] || 'N/A';
        const pesoPadrao = fruitHarvestWeights[fruitName] || 300;
        const nCarr = kg / (pesoPadrao > 0 ? pesoPadrao : 300);
        
        if (!b.is_waste) {
          parcelData[pKey].carrocoes += nCarr;

          // Agregar por Variedade (Campo)
          if (!varietyHarvestData[varietyName]) varietyHarvestData[varietyName] = { kg: 0, carrocoes: 0 };
          varietyHarvestData[varietyName].kg += kg;
          varietyHarvestData[varietyName].carrocoes += nCarr;
        }

        if (!varietyData[varietyName]) varietyData[varietyName] = { boxes: 0, kg: 0 };
        varietyData[varietyName].kg += kg;
      });
    }

    // 4. Buscar funcionários ATIVOS que tenham whatsapp
    const { data: employees } = await supabase
      .from('employees')
      .select('name, whatsapp, role, active')
      .eq('tenant_id', tenant_id)
      .eq('active', true)
      .not('whatsapp', 'is', null);

    // 4.1 Buscar pesos de carrocão configurados por fruta
    const { data: fruitConfigs } = await supabase
      .from('fruits')
      .select('name, harvest_weight')
      .eq('tenant_id', tenant_id);

    const fruitHarvestWeights: Record<string, number> = {};
    fruitConfigs?.forEach((f: any) => {
      fruitHarvestWeights[f.name] = Number(f.harvest_weight) || 300;
    });

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

    // ── 6. Enviar para cada colaborador (Packers/Stackers) ──
    for (const [name, d] of sorted) {
      const wa = empWhatsapp[name];
      if (!wa) continue;
      
      const role = String(d.role).toUpperCase();
      // Se for do campo, pula para o relatório específico do campo depois
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

      msg = msg.replace(/{nome}/g, name)
               .replace(/{data}/g, dateFormatted)
               .replace(/{empresa}/g, tenant.name)
               .replace(/{caixas}/g, String(d.boxes))
               .replace(/{peso}/g, d.kg.toFixed(1))
               .replace(/{ranking}/g, medal);

      await sendWhatsApp(wa, msg);
    }

    // ── 6.1 Enviar relatório específico para o pessoal do CAMPO ──
    for (const [name, d] of sorted) {
      const wa = empWhatsapp[name];
      if (!wa) continue;
      
      const role = String(d.role).toUpperCase();
      if (role === 'HARVESTER' || role === 'COLHEDOR' || role === 'CAMPO') {
        // Busca a fruta que este colaborador mais colheu no dia para usar o peso certo
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
    }

    // ── 7. Enviar relatório completo para supervisores e gerentes ──
    const totalKgScans = scans.reduce((sum: number, x: any) => sum + (x.weight_kg || 0), 0) || 0;
    const totalKgBulk = bulk.reduce((sum: number, x: any) => sum + (Number(x.weight_kg) || 0), 0) || 0;
    const totalKgTotal = totalKgScans + totalKgBulk;
    
    const totalToneladas = (totalKgTotal / 1000).toFixed(2);
    
    // Para o resumo geral, somamos todos os carrocões calculados por parcela
    const totalCarrocoes = Math.round(Object.values(parcelData).reduce((sum, p) => sum + p.carrocoes, 0));

    // Detalhes por Parcela
    const detalhesParcelas = Object.entries(parcelData)
      .map(([p, d]) => {
        const pFruit = scans.find((s: any) => s.parcel_code === p)?.fruit_name || bulk.find((b:any) => b.parcel_code === p)?.fruit_name || '';
        const pWeight = fruitHarvestWeights[pFruit] || 300;
        const nCarrocoes = Math.round(d.carrocoes);
        return `📍 *Parcela ${p}*: ${d.boxes > 0 ? d.boxes + ' cx | ' : ''}${(d.kg/1000).toFixed(2)} ton (~${nCarrocoes} carr)`;
      })
      .join('\n');

    // Detalhes por Variedade
    const detalhesVariedades = Object.entries(varietyData)
      .map(([v, d]) => `🍇 *${v}*: ${d.boxes} cx`)
      .join('\n');

    // Detalhes por Tipo de Caixa
    const detalhesPesos = Object.entries(weightData)
      .map(([w, d]) => `📦 *Caixa ${w}*: ${d.boxes} unidades`)
      .join('\n');

    // Detalhes por Variedade (Campo - Carrocões)
    const detalhesVariedadesCampo = Object.entries(varietyHarvestData || {})
      .map(([v, d]) => `🚜 *${v}*: ${Math.round(d.carrocoes)} carr | ${(d.kg/1000).toFixed(2)} ton`)
      .join('\n');

    // Detalhes por Variedade (Embalagem)
    const detalhesVariedades = Object.entries(varietyData || {})
      .map(([v, d]) => `🍇 *${v}*: ${d.boxes} cx`)
      .join('\n');

    const totalBoxesFinal = totalBoxes || 0;
    const totalToneladasFinal = totalToneladas || "0.00";
    const totalCarrocoesFinal = totalCarrocoes || 0;
    const totalColaboradores = sorted ? sorted.length : 0;

    let managerMsg = [
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
      `✅ Caixas: *${totalBoxesFinal}*`,
      `⚖️ Peso: *${totalToneladasFinal} Toneladas*`,
      `🚛 Carrocões Est.: *~${totalCarrocoesFinal}*`,
      `👥 Colaboradores: *${totalColaboradores}*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
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
