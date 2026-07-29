const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_HOST = 'yiigaohjvvieeooxsban.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpaWdhb2hqdnZpZWVvb3hzYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTY1NzksImV4cCI6MjA5MDE5MjU3OX0.CjzcyltkTXHsi0zO7IL-sb5Psy7yMTAnJ7GRQ4maFK8';
const DEFAULT_TENANT_ID = 'b7ad82dd-dca3-46af-91c6-5d564b7c3cc5';

function supabasePost(table, records, onConflict = '') {
  return new Promise((resolve) => {
    const postData = JSON.stringify(records);
    const options = {
      hostname: SUPABASE_HOST,
      path: `/rest/v1/${table}${onConflict ? '?on_conflict=' + onConflict : ''}`,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation,resolution=merge-duplicates',
        'x-tenant-id': DEFAULT_TENANT_ID,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve({ ok: true, data: JSON.parse(body) }); } catch (e) { resolve({ ok: true, data: [] }); }
        } else {
          resolve({ ok: false, status: res.statusCode, body });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ ok: false, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

async function seed() {
  console.log('🚀 Iniciando Carga do AppSheet para o Supabase (Dual Schema Support)...');

  const dataPath = path.join(__dirname, 'bomjesus_data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Arquivo bomjesus_data.json não encontrado!');
    return;
  }

  const rawData = fs.readFileSync(dataPath, 'utf8');
  const dbData = JSON.parse(rawData);

  // 1. POPULAR FUNCIONÁRIOS (CadastroPessoal -> employees)
  const funcionarios = dbData['CadastroPessoal'] || [];
  console.log(`📦 Processando ${funcionarios.length} funcionários...`);
  
  for (let i = 0; i < funcionarios.length; i += 100) {
    const chunk = funcionarios.slice(i, i + 100).map(f => ({
      tenant_id: DEFAULT_TENANT_ID,
      remote_id: f['IdCadastro Funcionario'] || f['id'] || String(Math.random()),
      barcode: f['CPF'] || f['IdCadastro Funcionario'] || String(Math.random()),
      name: f['Nome'] || 'Desconhecido',
      role: f['Cargo'] || f['Função'] || 'Operador',
      sector: f['Setor'] || 'CAMPO',
      active: true
    }));

    // Tentar agri_employees primeiro, fallback para employees
    let r = await supabasePost('agri_employees', chunk, 'remote_id');
    if (!r.ok) {
      await supabasePost('employees', chunk, 'remote_id');
    }
  }
  console.log('✅ Funcionários processados!');

  // 2. POPULAR PARCELAS (Parcela -> info_parcelas & parcels)
  const parcelas = dbData['Parcela'] || [];
  console.log(`📦 Processando ${parcelas.length} parcelas...`);
  
  for (let i = 0; i < parcelas.length; i += 100) {
    const chunkAgri = parcelas.slice(i, i + 100).map(p => {
      const codeStr = String(p['Parcela'] || p['IdParcela'] || p['Código'] || '').trim();
      return {
        tenant_id: DEFAULT_TENANT_ID,
        remote_id: p['IdParcela'] || codeStr,
        code: codeStr || 'P-UNC',
        parcela: p['Número'] || codeStr.split(' ')[0] || codeStr,
        letra: p['Letra'] || (codeStr.split(' ')[1] || ''),
        cultura: p['Cultura'] || 'MELÃO',
        variedade: p['Variedade'] || null,
        area_ha: parseFloat(p['Área'] || p['Area'] || 0) || 0
      };
    }).filter(x => x.code);

    const chunkInfo = parcelas.slice(i, i + 100).map(p => {
      const codeStr = String(p['Parcela'] || p['IdParcela'] || p['Código'] || '').trim();
      return {
        tenant_id: DEFAULT_TENANT_ID,
        parcela: p['Número'] || codeStr.split(' ')[0] || codeStr,
        letra: p['Letra'] || (codeStr.split(' ')[1] || ''),
        parcela2: codeStr,
        variedade: p['Variedade'] || null,
        cultura: p['Cultura'] || 'MELÃO',
        area: parseFloat(p['Área'] || p['Area'] || 0) || 0,
        lote: p['Lote'] || null,
        fornecedor: p['Fornecedor'] || null
      };
    });

    let r = await supabasePost('agri_parcels', chunkAgri, 'remote_id');
    if (!r.ok) {
      await supabasePost('info_parcelas', chunkInfo);
    }
  }
  console.log('✅ Parcelas processadas!');

  console.log('🎉 Sincronização do AppSheet para o Supabase concluída!');
}

seed().catch(console.error);
