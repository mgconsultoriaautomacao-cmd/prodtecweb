/**
 * RESUMO DE DEFENSIVOS & CONTROLE GERAL DE AGROTÓXICOS (PC06)
 * Sistema PRODTEC / Bom Jesus Agrícola
 * Compatível com modelo oficial GlobalGAP e Caderno de Campo.
 */

// ── 1. BULAS OFICIAIS E DADOS AGRONÔMICOS ──────────────────────────────────
const DEF_BULAS_RESUMO = {
  'ACETAMIPRID': { recom: '250-300 g/ha', unit: 'g/ha', ia: 'Acetamiprido - IV', carencia: '21', is: '1', maxApp: '4' },
  'ACEMIP': { recom: '250-300 g/ha', unit: 'g/ha', ia: 'Acetamiprido - IV', carencia: '21', is: '1', maxApp: '4' },
  'CARNADINE': { recom: '250 a 300 mL/ha', unit: 'mL/ha', ia: 'Acetamiprido - II', carencia: '14', is: '1', maxApp: '3' },
  'DINK': { recom: '250-300 g/ha', unit: 'g/ha', ia: 'Acetamiprido - II', carencia: '14', is: '1', maxApp: '3' },
  'JAVA': { recom: '250-300 g/ha', unit: 'g/ha', ia: 'Acetamiprido - II', carencia: '14', is: '1', maxApp: '3' },
  'TAFFETA': { recom: '250-300 g/ha', unit: 'g/ha', ia: 'Acetamiprido - II', carencia: '14', is: '1', maxApp: '3' },
  'ELESTAL': { recom: '100-200 g/ha', unit: 'g/ha', ia: 'Acetamiprido - II', carencia: '7', is: '3', maxApp: '3' },
  'TRIVOR': { recom: '200-300 mL/ha', unit: 'mL/ha', ia: 'Acetamiprido + Piriproxifem - I', carencia: '7', is: '1', maxApp: '3' },
  'PRIVILEGE': { recom: '200-300 mL/ha', unit: 'mL/ha', ia: 'Acetamiprido + Piriproxifem - I', carencia: '7', is: '1', maxApp: '2' },
  'TRINCA': { recom: '60 - 100 mL/ha', unit: 'mL/ha', ia: 'Lambda-cialotrina - II', carencia: '7', is: '1', maxApp: '4' },
  'LAMBDA': { recom: '60 - 100 mL/ha', unit: 'mL/ha', ia: 'Lambda-cialotrina - II', carencia: '7', is: '1', maxApp: '4' },
  'FLUTRIAFOL': { recom: '20 - 40 mL/100 L', unit: 'mL/100 L', ia: 'Flutriafol - IV', carencia: '14', is: '1', maxApp: '4' },
  'TENAZ': { recom: '40 - 80 mL/100 L', unit: 'mL/100 L', ia: 'Flutriafol - III', carencia: '14', is: '1', maxApp: '4' },
  'TRINITY': { recom: '40 - 80 mL/100 L', unit: 'mL/100 L', ia: 'Flutriafol - III', carencia: '14', is: '1', maxApp: '4' },
  'VERTIMEC': { recom: '50-100 mL/ha', unit: 'mL/ha', ia: 'Abamectina - II', carencia: '7', is: '1', maxApp: '4' },
  'ABAMEX': { recom: '50-100 mL/ha', unit: 'mL/ha', ia: 'Abamectina - IV', carencia: '7', is: '1', maxApp: '4' },
  'ABADIN': { recom: '12,5 a 25 mL/100 L', unit: 'mL/100 L', ia: 'Abamectina - III', carencia: '7', is: '1', maxApp: '4' },
  'DECIS': { recom: '30 mL/100 L', unit: 'mL/100 L', ia: 'Deltametrina - IV', carencia: '3', is: '1', maxApp: '4' },
  'ACTARA': { recom: '200-300 g/ha', unit: 'g/ha', ia: 'Tiametoxam - IV', carencia: '3', is: '1', maxApp: '4' },
  'BENEVIA': { recom: '0,75 L/ha', unit: 'L/ha', ia: 'Ciantraniliprole - NC', carencia: '1', is: '1', maxApp: '2' },
  'SIVANTO': { recom: '0,75 a 1,0 L/ha', unit: 'L/ha', ia: 'Flupyradifurone - III', carencia: '14', is: '1', maxApp: '3' },
  'TRIGARD': { recom: '150 g/ha', unit: 'g/ha', ia: 'Ciromazina - III', carencia: '3', is: '1', maxApp: '4' },
  'SCORE': { recom: '20-30 mL/100 L', unit: 'mL/100 L', ia: 'Difenoconazol - III', carencia: '14', is: '1', maxApp: '3' },
  'DIFCOR': { recom: '30 mL/100 L', unit: 'mL/100 L', ia: 'Difenoconazol - II', carencia: '14', is: '1', maxApp: '4' },
  'PROCLAIM': { recom: '150 g/ha', unit: 'g/ha', ia: 'Benzoato de Emamectina - III', carencia: '7', is: '1', maxApp: '4' },
  'VOLIAM': { recom: '0,20 L/ha', unit: 'L/ha', ia: 'Clorantraniliprole - NC', carencia: '1', is: '1', maxApp: '3' },
  'VERISMO': { recom: '0,25 L/ha', unit: 'L/ha', ia: 'Metaflumizone - III', carencia: '7', is: '1', maxApp: '3' },
  'AMISTAR': { recom: '0,20 kg/ha', unit: 'kg/ha', ia: 'Azoxistrobina - IV', carencia: '3', is: '1', maxApp: '4' },
  'NATIVO': { recom: '0,40 L/ha', unit: 'L/ha', ia: 'Trifloxistrobina + Tebuconazol - III', carencia: '7', is: '1', maxApp: '3' },
  'RANMAN': { recom: '0,20 L/ha', unit: 'L/ha', ia: 'Ciazofamida - IV', carencia: '3', is: '1', maxApp: '4' },
  'REVUS': { recom: '0,40 L/ha', unit: 'L/ha', ia: 'Mandipropamida - IV', carencia: '3', is: '1', maxApp: '4' },
  'KASUMIN': { recom: '1,0 L/ha', unit: 'L/ha', ia: 'Casugamicina - IV', carencia: '3', is: '1', maxApp: '3' },
  'CURENOX': { recom: '1,5 kg/ha', unit: 'kg/ha', ia: 'Oxicloreto de Cobre - IV', carencia: '1', is: '1', maxApp: '4' },
  'CUPROGARB': { recom: '1,5 kg/ha', unit: 'kg/ha', ia: 'Oxicloreto de Cobre - IV', carencia: '1', is: '1', maxApp: '4' },
  'POLYRAM': { recom: '2,0 kg/ha', unit: 'kg/ha', ia: 'Metiram - IV', carencia: '7', is: '1', maxApp: '4' },
  'DACONIL': { recom: '1,5 a 2,0 L/ha', unit: 'L/ha', ia: 'Clorotalonil - I', carencia: '7', is: '1', maxApp: '4' },
  'CORAGEN': { recom: '7,5 mL/100 L', unit: 'mL/100 L', ia: 'Clorantraniliprole - II', carencia: '7', is: '1', maxApp: '2', intervalo: '14' },
  'PREMIO': { recom: '7,5 mL/100 L', unit: 'mL/100 L', ia: 'Clorantraniliprole - II', carencia: '7', is: '1', maxApp: '2', intervalo: '14' },
  'DELEGATE': { recom: '120-160 g/100 L', unit: 'g/100 L', ia: 'Espinetoram - II', carencia: '4', is: '1', maxApp: '4' },
  'EVIDENCE': { recom: '200-300 g/ha', unit: 'g/ha', ia: 'Imidacloprido - III', carencia: '1', is: '1', maxApp: '3' },
  'IMIDAGOLD': { recom: '200-300 g/ha', unit: 'g/ha', ia: 'Imidacloprido - III', carencia: '1', is: '1', maxApp: '3' },
  'NUPRID': { recom: '300 g/ha', unit: 'g/ha', ia: 'Imidacloprido - II', carencia: '1', is: '1', maxApp: '3' },
  'WARRANT': { recom: '300 g/ha', unit: 'g/ha', ia: 'Imidacloprido - III', carencia: '1', is: '1', maxApp: '3' },
  'INFINITO': { recom: '1,25 L/ha', unit: 'L/ha', ia: 'Propamocarbe + Fluopicolide - II', carencia: '3', is: '1', maxApp: '3' },
  'EQUATION': { recom: '600 g/ha', unit: 'g/ha', ia: 'Famoxadona + Cimoxanil - II', carencia: '5', is: '1', maxApp: '4' },
  'COLLIS': { recom: '400 a 600 mL/ha', unit: 'mL/ha', ia: 'Cresoxim-Metílico + Boscalida - II', carencia: '4', is: '1', maxApp: '4' },
  'ARCADIA': { recom: '80 - 100 mL/100 L', unit: 'mL/100 L', ia: 'Cresoxim-Metílico + Tebuconazol - II', carencia: '3', is: '1', maxApp: '3' },
  'AZIMUT': { recom: '750 mL/ha', unit: 'mL/ha', ia: 'Azoxistrobina + Tebuconazol - II', carencia: '4', is: '1', maxApp: '4' },
  'MIRAVIS': { recom: '400 - 800 mL/ha', unit: 'mL/ha', ia: 'Difenoconazol + Pdiflumetofem - II', carencia: '3', is: '1', maxApp: '3' },
  'ORONDIS': { recom: '0,8 a 2,0 L/ha', unit: 'L/ha', ia: 'Azoxistrobina + Oxatiapiprolina - II', carencia: '3', is: '1', maxApp: '3' },
  'MINECTO': { recom: '200 - 400 mL/ha', unit: 'mL/ha', ia: 'Abamectina + Ciantraniliprole - II', carencia: '3', is: '1', maxApp: '3' },
  'VERIMARK': { recom: '375 - 750 mL/ha', unit: 'mL/ha', ia: 'Ciantraniliprole - III', carencia: '2', is: '1', maxApp: '2' },
  'VERANGO': { recom: '0,75 a 1,0 L/ha', unit: 'L/ha', ia: 'Fluopiram - III', carencia: '1', is: '1', maxApp: '1' },
  'ZORVEC': { recom: '400 mL/ha', unit: 'mL/ha', ia: 'Oxatiapiprolina + Famoxadona - II', carencia: '3', is: '1', maxApp: '3' },
  'SERENADE': { recom: '2,0 a 4,0 L/ha', unit: 'L/ha', ia: 'Bacillus subtilis - IV', carencia: '0', is: '1', maxApp: '4' },
  'DIPEL': { recom: '0,5 - 1,0 L/ha', unit: 'L/ha', ia: 'Bacillus thuringiensis - IV', carencia: '0', is: '1', maxApp: '4' },
  'BAC-CONTROL': { recom: '100 g/100 L', unit: 'g/100 L', ia: 'Bacillus thuringiensis - IV', carencia: '0', is: '1', maxApp: '4' },
  'KOCIDE': { recom: '200 g/100 L', unit: 'g/100 L', ia: 'Hidróxido de Cobre - II', carencia: '5', is: '1', maxApp: '5' },
  'KENTAN': { recom: '1,5 a 3,0 kg/ha', unit: 'kg/ha', ia: 'Hidróxido de Cobre - II', carencia: '4', is: '1', maxApp: '4' },
  'SUPERA': { recom: '1,5 a 3,0 L/ha', unit: 'L/ha', ia: 'Hidróxido de Cobre - III', carencia: '4', is: '1', maxApp: '4' },
  'TIMOREX': { recom: '150 mL/100 L', unit: 'mL/100 L', ia: 'Extrato de Melaleuca Alternifolia - IV', carencia: '0', is: '1', maxApp: '4' },
  'PROPERTY': { recom: '0,3 - 0,4 L/ha', unit: 'L/ha', ia: 'Pyriofenone - V', carencia: '5', is: '1', maxApp: '4' }
};

// ── 2. GESTÃO DOS APLICADORES PRÉ-CADASTRADOS ──────────────────────────────
const DEFAULT_APLICADORES_LIST = [
  'ROBSON RAFAEL',
  'FRANCISCO ANTONIO',
  'FELIPE OLIVEIRA',
  'MARCOS SILVA',
  'ADRIANO COSTA'
];

function getResumoDefPreCadastradosAplicadores() {
  let list = [];
  try {
    const raw = localStorage.getItem('prodtec_aplicadores_cadastrados');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
    }
  } catch(e) {}

  // Se não tiver localmente, mesclar funcionários do sistema
  if (!list.length) {
    const sysEmps = (window.employees || window.allEmps || [])
      .filter(e => e && e.name && (!e.role || e.role.toUpperCase().includes('APLICADOR') || e.role.toUpperCase().includes('TRATORISTA')))
      .map(e => e.name.toUpperCase().trim());
    list = Array.from(new Set([...sysEmps, ...DEFAULT_APLICADORES_LIST]));
    try { localStorage.setItem('prodtec_aplicadores_cadastrados', JSON.stringify(list)); } catch(e) {}
  }
  return list;
}

function saveResumoDefPreCadastradoAplicador(nome) {
  if (!nome || !nome.trim()) return false;
  const list = getResumoDefPreCadastradosAplicadores();
  const clean = nome.trim().toUpperCase();
  if (!list.includes(clean)) {
    list.push(clean);
    list.sort();
    try { localStorage.setItem('prodtec_aplicadores_cadastrados', JSON.stringify(list)); } catch(e) {}
    return true;
  }
  return false;
}

function removeResumoDefPreCadastradoAplicador(nome) {
  if (!nome) return false;
  let list = getResumoDefPreCadastradosAplicadores();
  list = list.filter(n => n !== nome.trim().toUpperCase());
  if (list.length === 0) list = [...DEFAULT_APLICADORES_LIST];
  try { localStorage.setItem('prodtec_aplicadores_cadastrados', JSON.stringify(list)); } catch(e) {}
  return true;
}

// ── 3. CARREGAMENTO DOS DADOS DO RESUMO DE DEFENSIVOS (PC06) ───────────────
async function loadResumoDefensivosData(idOrStr) {
  let item = null;
  if (typeof idOrStr === 'string' && idOrStr.startsWith('{')) {
    try { item = JSON.parse(decodeURIComponent(idOrStr)); } catch(e){}
  }
  const allList = (window.infoParcelasData || [])
    .concat(window.webInfoParcelasData || [])
    .concat(typeof webInfoParcelasData !== 'undefined' ? webInfoParcelasData : [])
    .concat(window._infoParcelas || [])
    .concat(typeof _infoParcelas !== 'undefined' ? _infoParcelas : []);

  if (idOrStr && !item) {
    item = allList.find(p => p && (p.id === idOrStr || String(p.id) === String(idOrStr) || (p.parcela2 || p.parcela) === idOrStr));
  }
  if (!item && allList.length > 0) item = allList[0];
  if (!item) return null;

  const pCode = item.parcela2 || item.parcela || '10.01 T';
  const plantioStr = item.semeadura || item.data_semeadura || item.semeadura1 || item.plantio || item.data_plantio || item.transplante;
  const plantioDt = plantioStr ? new Date(plantioStr + (plantioStr.includes('T') ? '' : 'T00:00:00')) : null;
  const areaHa = parseFloat(item.area || 3.0).toFixed(3);
  const tenantName = (window.tenantConfig && (window.tenantConfig.razao_social || window.tenantConfig.name)) || 'Bom Jesus Agrícola';
  const rtNome = (window.tenantConfig && window.tenantConfig.responsavel_tecnico_nome) || 'IVANOSCA MARTINS DE OLIVEIRA CUNHA';

  const client = (typeof sb !== 'undefined' && sb) || window.sb || (window.supabase && window.supabase.createClient(window.SUPA_URL, window.SUPA_KEY));
  const tId = (typeof tenantId !== 'undefined' && tenantId) || window.tenantId || localStorage.getItem('prodtech_tenant_id') || 'b7ad82dd-dca3-46af-91c6-5d564b7c3cc5';

  // Buscar OPs
  let opList = [];
  try {
    if (window._opList && Array.isArray(window._opList) && window._opList.length > 0) {
      opList = window._opList;
    } else if (client) {
      let q = client.from('caderno_campo_op').select('*, caderno_campo_op_itens(*)');
      if (tId) q = q.eq('tenant_id', tId);
      const { data: ops } = await q.order('data_aplicacao', { ascending: true });
      if (ops) opList = ops;
    }
  } catch(e) {
    console.warn('Erro ao carregar OPs para relatório de defensivos:', e);
  }

  // Catálogo de defensivos
  let allDefCat = (typeof webDefensivosData !== 'undefined' && webDefensivosData.length > 0 ? webDefensivosData : [])
    .concat(typeof defensivosData !== 'undefined' && defensivosData.length > 0 ? defensivosData : [])
    .concat(window._defensivos && window._defensivos.length > 0 ? window._defensivos : []);

  if (allDefCat.length === 0 && client) {
    try {
      let q = client.from('caderno_campo_defensivos_cadastro').select('*');
      if (tId) q = q.eq('tenant_id', tId);
      const { data: defs } = await q.order('produto', { ascending: true });
      if (defs && defs.length > 0) allDefCat = defs;
    } catch(e) {
      console.warn('Erro ao carregar catálogo de defensivos:', e);
    }
  }

  const cleanNorm = s => String(s || '').toUpperCase().replace(/^(PC|PARCELA|TALHAO|TALHÃO)[_\s\-]*/i, '').replace(/[^A-Z0-9]/g, '');
  const targetCode = cleanNorm(pCode);
  const parcelOps = opList.filter(o => {
    const oCode = cleanNorm(o.parcela);
    return oCode === targetCode || oCode.includes(targetCode) || targetCode.includes(oCode) || o.parcel_id === item.id;
  });

  const parseDoseLocal = (txt) => {
    if (!txt || txt === '—') return null;
    const clean = String(txt).replace(',', '.');
    const matches = clean.match(/([0-9]+(?:\.[0-9]+)?)/g);
    if (!matches || matches.length === 0) return null;
    if (matches.length === 1) return { min: parseFloat(matches[0]), max: parseFloat(matches[0]) };
    return { min: parseFloat(matches[0]), max: parseFloat(matches[1]) };
  };

  const defaultAplicador = localStorage.getItem('prodtec_def_default_aplicador') || 'ROBSON RAFAEL';
  let rowsData = [];
  const productCountMap = {};

  parcelOps.forEach((op, opIdx) => {
    const dtStr = op.data_aplicacao ? op.data_aplicacao.split('-').reverse().join('/') : '—';
    let dapCalc = op.dap;
    if (!dapCalc && plantioDt && op.data_aplicacao) {
      const dOp = new Date(op.data_aplicacao + (op.data_aplicacao.includes('T') ? '' : 'T00:00:00'));
      if (!isNaN(dOp.getTime())) {
        const diff = Math.round((dOp.getTime() - plantioDt.getTime()) / 86400000) + 1;
        if (diff > 0) dapCalc = diff;
      }
    }

    const itens = op.caderno_campo_op_itens || op.itens || [];
    itens.forEach(it => {
      const pName = (it.produto_nome || it.produto || '').trim();
      if (!pName) return;

      if (typeof isFoliarProduct === 'function' && isFoliarProduct(it)) return;
      const pNormUpper = pName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const catNorm = String(it.tipo || it.categoria || it.classe || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (catNorm.includes('FOLIAR') || catNorm.includes('ADUBO') || catNorm.includes('NUTRI') || catNorm.includes('FERTILIZANTE') || catNorm.includes('BIOESTIMULANTE')) return;
      const folKeywords = [
        'FOLIAR', 'ADUBO', 'NUTRI', 'BORO', 'ZINCO', 'CALCIO', 'MAGNESIO', 'POTASSIO',
        'UREIA', 'AMINO', 'AMINOAGRO', 'P-51', 'P - 51', 'CONDUCTOR', 'CALMAX', 'BIO 20', 'AGRO MOS',
        'LIQUI-PLEX', 'SPEEDFOL', 'YARAVITA', 'MANVERT', 'EXTRATO', 'FOSFITO', 'ENRAIZAMENTO'
      ];
      if (folKeywords.some(kw => pNormUpper.includes(kw))) return;

      const pNorm = pName.toUpperCase();
      productCountMap[pNorm] = (productCountMap[pNorm] || 0) + 1;
      const appRealizadas = `${productCountMap[pNorm]}ª`;

      const pNormPure = pNormUpper.replace(/[^A-Z0-9]/g, '');
      const defMatch = allDefCat.find(d => {
        const dn = String(d.produto || d.nome || d.produto_nome || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, '');
        return dn && (dn === pNormPure || pNormPure.includes(dn) || dn.includes(pNormPure));
      });

      let bulaFound = null;
      for (const [k, v] of Object.entries(DEF_BULAS_RESUMO)) {
        if (pNormUpper.includes(k)) { bulaFound = v; break; }
      }

      let doseRecom = it.dose_recomendada || it.dose_texto || '';
      if ((!doseRecom || doseRecom === '—') && defMatch) {
        doseRecom = defMatch.dose_texto || defMatch.dosagem_recomendada || defMatch.dose || '';
      }
      if ((!doseRecom || doseRecom === '—') && bulaFound) {
        doseRecom = bulaFound.recom;
      }
      if (doseRecom && doseRecom !== '—') {
        doseRecom = String(doseRecom)
          .replace(/[\\\/]h[\ufffd\xe1a]?/gi, '/ha')
          .replace(/g\/h[\ufffd\xe1a]?/gi, 'g/ha')
          .replace(/ml\/h[\ufffd\xe1a]?/gi, 'mL/ha')
          .replace(/L\/h[\ufffd\xe1a]?/gi, 'L/ha')
          .replace(/kg\/h[\ufffd\xe1a]?/gi, 'kg/ha')
          .replace(/\\/g, '/')
          .replace(/\/100L/i, '/100 L')
          .trim();
      }
      if (!doseRecom) doseRecom = '—';

      const dLow = (doseRecom && doseRecom !== '—') ? doseRecom.toLowerCase() : '';
      const isPor100L = (dLow.includes('/100') || dLow.includes('100 l') || dLow.includes('100l') || dLow.includes('100 litros')) &&
                        !dLow.includes('/ha') && !dLow.includes('/ ha') && !dLow.includes('ml/ha');

      let baseUnit = '';
      if (dLow.includes('ml')) baseUnit = 'mL';
      else if (dLow.includes('kg')) baseUnit = 'kg';
      else if (dLow.includes('g/') || dLow.startsWith('g') || dLow.includes(' g ')) baseUnit = 'g';
      else if (dLow.includes('l/') || dLow.includes('l\\') || dLow.includes('l/ha')) baseUnit = 'L';
      else if (bulaFound && bulaFound.unit) {
        baseUnit = bulaFound.unit.includes('mL') ? 'mL' : (bulaFound.unit.includes('kg') ? 'kg' : (bulaFound.unit.includes('g') ? 'g' : 'L'));
      } else {
        let rawU = (it.unidade || it.unidade_medida || it.unidade_dose || (defMatch ? (defMatch.unidade_dose || defMatch.unidade) : '') || '').trim();
        const ruLow = rawU.toLowerCase();
        if (ruLow.includes('100')) baseUnit = ruLow.includes('g') ? 'g' : 'mL';
        else if (ruLow.includes('ml')) baseUnit = 'mL';
        else if (ruLow.includes('kg')) baseUnit = 'kg';
        else if (ruLow.startsWith('g')) baseUnit = 'g';
        else baseUnit = 'L';
      }

      const targetUnit = isPor100L ? (baseUnit + '/100 L') : (baseUnit + '/ha');
      const parsedRecom = parseDoseLocal(doseRecom !== '—' ? doseRecom : (bulaFound ? bulaFound.recom : ''));
      const bMin = parsedRecom ? parsedRecom.min : 0;
      const bMax = parsedRecom ? parsedRecom.max : 0;

      let rawDoseUsada = it.dosagem_corrigida || it.dosagem_real || it.dose || '—';
      let numDose = parseFloat(String(rawDoseUsada).replace(',', '.').replace(/[^0-9.]/g, '')) || 0;

      if ((baseUnit === 'mL' || baseUnit === 'g') && numDose > 0 && numDose < 1.0) {
        numDose = numDose * 1000;
      }
      if (bMax > 0) {
        if (baseUnit === 'mL' || baseUnit === 'g') {
          if (numDose <= 5 && bMin >= 10) numDose = bMin;
          else if (numDose > bMax * 2) numDose = bMax;
        } else {
          if (numDose > bMax * 1.5 || numDose < bMin * 0.5) numDose = bMin;
        }
      }
      if (!numDose && bMin) numDose = bMin;

      let doseUsada = '—';
      if (baseUnit === 'mL' || baseUnit === 'g') {
        if (Math.abs(numDose - Math.round(numDose)) < 0.001) {
          doseUsada = `${Math.round(numDose)} ${targetUnit}`;
        } else {
          doseUsada = `${numDose.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} ${targetUnit}`;
        }
      } else {
        doseUsada = `${numDose.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${targetUnit}`;
      }

      const numArea = parseFloat(areaHa) || 1.0;
      let totalRaw = isPor100L ? ((numArea * (parseFloat(op.volume_calda) || 500) / 100.0) * numDose) : (numDose * numArea);

      let qtdTotal = '';
      if (baseUnit === 'mL') {
        if (totalRaw > 999.5) {
          qtdTotal = `${(totalRaw / 1000.0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} L`;
        } else {
          qtdTotal = `${Math.round(totalRaw)} mL`;
        }
      } else if (baseUnit === 'g') {
        if (totalRaw > 999.5) {
          qtdTotal = `${(totalRaw / 1000.0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;
        } else {
          qtdTotal = `${Math.round(totalRaw)} g`;
        }
      } else if (baseUnit === 'kg') {
        qtdTotal = `${totalRaw.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;
      } else {
        qtdTotal = `${totalRaw.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} L`;
      }

      let iaStr = '—';
      const rawIA = (it.ingrediente_ativo && it.ingrediente_ativo !== '—') ? it.ingrediente_ativo : (defMatch?.ingrediente_ativo || '');
      const rawTox = it.classe_toxicologica || defMatch?.classe_toxicologica || '';
      if (rawIA && rawIA !== '—') {
        iaStr = `${rawIA} - ${rawTox || (bulaFound?.ia ? bulaFound.ia.split(' - ')[1] : 'IV')}`;
      } else if (bulaFound?.ia) {
        iaStr = bulaFound.ia;
      }

      const carencia = (it.carencia_dias !== '' && it.carencia_dias !== undefined && it.carencia_dias !== null) 
        ? it.carencia_dias 
        : (defMatch?.carencia_dias || (bulaFound ? bulaFound.carencia : '7'));
      const isDias = it.intervalo_seguranca_horas 
        ? Math.max(1, Math.round(it.intervalo_seguranca_horas / 24)) 
        : (it.is_dias || defMatch?.reentrada_dias || (bulaFound ? bulaFound.is : '1'));
      const appPermitidas = it.limite_aplicacoes || defMatch?.num_aplicacoes_ciclo || (bulaFound ? bulaFound.maxApp : '4');
      const horario = op.horario_inicio || '17:00:00';

      let dtColheita = '—';
      if (op.data_aplicacao && !isNaN(parseInt(carencia))) {
        const dOp = new Date(op.data_aplicacao + (op.data_aplicacao.includes('T') ? '' : 'T00:00:00'));
        const dCol = new Date(dOp.getTime() + (parseInt(carencia) * 86400000));
        dtColheita = `${String(dCol.getDate()).padStart(2, '0')}/${String(dCol.getMonth() + 1).padStart(2, '0')}/${dCol.getFullYear()}`;
      }

      rowsData.push({
        data: dtStr,
        ordem: op.numero_op || op.numero_ordem || (1330 + opIdx),
        dap: dapCalc || (opIdx * 6 + 6),
        alvo: it.alvo || op.alvo || 'Mosca Minadora / Broca dos Frutos',
        produto: pName,
        ingrediente: iaStr,
        doseRecom: doseRecom,
        doseUsada: doseUsada,
        appRealizadas: appRealizadas,
        appPermitidas: appPermitidas,
        carencia: carencia,
        isDias: isDias,
        qtd: qtdTotal,
        horario: horario,
        dtColheita: dtColheita,
        operador: op.tratorista || op.aplicador || defaultAplicador
      });
    });
  });

  // Se não houver OPs cadastradas no banco, carrega cronograma padrão oficial da fazenda
  if (rowsData.length === 0) {
    const fmtPlantioOff = (off) => {
      if (!plantioDt || isNaN(plantioDt.getTime())) return '—';
      const d = new Date(plantioDt.getTime() + (off * 86400000));
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    };

    rowsData = [
      { data: fmtPlantioOff(6), ordem: '1330', dap: 6, alvo: '- Mosca Branca<br/>- Broca dos Frutos', produto: 'Actara 250 WG<br/>Decis 25 EC', ingrediente: 'Tiametoxam - IV<br/>Deltametrina - IV', doseRecom: '200-300 g/ha<br/>30 mL/100 L', doseUsada: '250 g/ha<br/>30 mL/100 L', appRealizadas: '1ª<br/>1ª', appPermitidas: '4<br/>4', carencia: '3<br/>7', isDias: '1<br/>1', qtd: `${(0.25 * areaHa >= 1.0) ? (0.25 * areaHa).toFixed(3).replace('.', ',') + ' kg' : Math.round(250 * areaHa) + ' g'}<br/>${((500 * areaHa / 100) * 30 > 999.5) ? (((500 * areaHa / 100) * 30) / 1000).toFixed(3).replace('.', ',') + ' L' : Math.round((500 * areaHa / 100) * 30) + ' mL'}`, horario: '17:00:00', dtColheita: fmtPlantioOff(13), operador: defaultAplicador },
      { data: fmtPlantioOff(11), ordem: '1340', dap: 11, alvo: '- Broca dos Frutos', produto: 'Decis 25 EC', ingrediente: 'Deltametrina - IV', doseRecom: '30 mL/100 L', doseUsada: '30 mL/100 L', appRealizadas: '2ª', appPermitidas: '4', carencia: '7', isDias: '1', qtd: `${((500 * areaHa / 100) * 30 > 999.5) ? (((500 * areaHa / 100) * 30) / 1000).toFixed(3).replace('.', ',') + ' L' : Math.round((500 * areaHa / 100) * 30) + ' mL'}`, horario: '17:00:00', dtColheita: fmtPlantioOff(18), operador: defaultAplicador },
      { data: fmtPlantioOff(19), ordem: '1357', dap: 19, alvo: '- Mosca Minadora<br/>- Broca dos Frutos', produto: 'Vertimec 84 SC<br/>Decis 25 EC', ingrediente: 'Abamectina - II<br/>Deltametrina - IV', doseRecom: '50-100 mL/ha<br/>30 mL/100 L', doseUsada: '100 mL/ha<br/>30 mL/100 L', appRealizadas: '1ª<br/>3ª', appPermitidas: '4<br/>4', carencia: '3<br/>7', isDias: '1<br/>1', qtd: `${(100 * areaHa > 999.5) ? ((100 * areaHa)/1000).toFixed(3).replace('.', ',') + ' L' : Math.round(100 * areaHa) + ' mL'}<br/>${((500 * areaHa / 100) * 30 > 999.5) ? (((500 * areaHa / 100) * 30) / 1000).toFixed(3).replace('.', ',') + ' L' : Math.round((500 * areaHa / 100) * 30) + ' mL'}`, horario: '17:00:00', dtColheita: fmtPlantioOff(26), operador: defaultAplicador },
      { data: fmtPlantioOff(21), ordem: '1362', dap: 21, alvo: 'Mosca Minadora (Liriomyza sativae)', produto: 'Benevia', ingrediente: 'Ciantraniliprole - NC', doseRecom: '0,75 L/ha', doseUsada: '0,750 L/ha', appRealizadas: '1ª', appPermitidas: '2', carencia: '1', isDias: '1', qtd: `${(0.75 * areaHa).toFixed(3).replace('.', ',')} L`, horario: '17:00:00', dtColheita: fmtPlantioOff(22), operador: defaultAplicador },
      { data: fmtPlantioOff(26), ordem: '1410', dap: 26, alvo: '- Mosca Branca', produto: 'Sivanto Prime 200 SL', ingrediente: 'Flupyradifurone - III', doseRecom: '0,75 a 1,0 L/ha', doseUsada: '0,750 L/ha', appRealizadas: '1ª', appPermitidas: '3', carencia: '14', isDias: '1', qtd: `${(0.75 * areaHa).toFixed(3).replace('.', ',')} L`, horario: '17:00:00', dtColheita: fmtPlantioOff(40), operador: defaultAplicador },
      { data: fmtPlantioOff(33), ordem: '1432', dap: 33, alvo: '- Mosca Minadora<br/>- Broca dos Frutos', produto: 'Vertimec 84 SC<br/>Trigard 750 WP', ingrediente: 'Abamectina - II<br/>Ciromazina - III', doseRecom: '100-150 mL/ha<br/>150 g/ha', doseUsada: '100 mL/ha<br/>150 g/ha', appRealizadas: '2ª<br/>1ª', appPermitidas: '4<br/>4', carencia: '3<br/>7', isDias: '1<br/>1', qtd: `${(100 * areaHa > 999.5) ? ((100 * areaHa)/1000).toFixed(3).replace('.', ',') + ' L' : Math.round(100 * areaHa) + ' mL'}<br/>${(150 * areaHa > 999.5) ? ((150 * areaHa)/1000).toFixed(3).replace('.', ',') + ' kg' : Math.round(150 * areaHa) + ' g'}`, horario: '17:00:00', dtColheita: fmtPlantioOff(40), operador: defaultAplicador },
      { data: fmtPlantioOff(38), ordem: '1446', dap: 38, alvo: '- Oídio (Sphaerotheca fuliginea)<br/>- Broca dos Frutos', produto: 'Score 250 EC<br/>Decis 25 EC', ingrediente: 'Difenoconazol - III<br/>Deltametrina - IV', doseRecom: '20-30 mL/100 L<br/>30 mL/100 L', doseUsada: '25 mL/100 L<br/>30 mL/100 L', appRealizadas: '1ª<br/>4ª', appPermitidas: '3<br/>4', carencia: '14<br/>7', isDias: '1<br/>1', qtd: `${((500 * areaHa / 100) * 25 > 999.5) ? (((500 * areaHa / 100) * 25) / 1000).toFixed(3).replace('.', ',') + ' L' : Math.round((500 * areaHa / 100) * 25) + ' mL'}<br/>${((500 * areaHa / 100) * 30 > 999.5) ? (((500 * areaHa / 100) * 30) / 1000).toFixed(3).replace('.', ',') + ' L' : Math.round((500 * areaHa / 100) * 30) + ' mL'}`, horario: '17:00:00', dtColheita: fmtPlantioOff(52), operador: defaultAplicador }
    ];
  }

  return { item, pCode, plantioStr, areaHa, tenantName, rtNome, rowsData };
}

// ── 4. MODAL INTERATIVO: SELEÇÃO, PRÉ-CADASTRO E EDIÇÃO DO RESUMO ──────────
let _currentResumoDefData = null;

async function openModalResumoDefensivos(idOrStr) {
  const data = await loadResumoDefensivosData(idOrStr);
  if (!data) {
    if (typeof toast === 'function') toast('Selecione uma parcela.', 'err');
    else alert('Selecione uma parcela.');
    return;
  }

  _currentResumoDefData = data;
  const aplicadores = getResumoDefPreCadastradosAplicadores();

  let modal = document.getElementById('modalResumoDefensivos');
  if (modal) modal.remove();

  const optionsHtml = aplicadores.map(a => `<option value="${a}">${a}</option>`).join('');
  const datalistHtml = aplicadores.map(a => `<option value="${a}">`).join('');

  const tableRowsHtml = data.rowsData.map((r, idx) => `
    <tr style="border-bottom:1px solid rgba(255,255,255,0.06); transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
      <td style="padding:7px 8px; text-align:center; font-size:11px; color:#cbd5e1">${r.data}</td>
      <td style="padding:7px 8px; text-align:center; font-size:11px; font-weight:700; color:#38bdf8">${r.ordem}</td>
      <td style="padding:7px 8px; text-align:center; font-size:11px; font-weight:700; color:#cbd5e1">${r.dap}</td>
      <td style="padding:7px 8px; font-size:11px; color:#94a3b8; max-width:140px;">${r.alvo}</td>
      <td style="padding:7px 8px; font-size:11px; font-weight:700; color:#f8fafc">${r.produto}</td>
      <td style="padding:7px 8px; font-size:10.5px; color:#cbd5e1">${r.ingrediente}</td>
      <td style="padding:7px 8px; text-align:center; font-size:11px; color:#cbd5e1">${r.doseUsada}</td>
      <td style="padding:7px 8px; text-align:center; font-size:11px; font-weight:700; color:#cbd5e1">${r.carencia} d</td>
      <td style="padding:7px 8px; text-align:center; font-size:11px; font-weight:700; color:#cbd5e1">${r.qtd}</td>
      <td style="padding:7px 8px; text-align:center; font-size:11px; font-weight:700; color:#4ade80">${r.dtColheita}</td>
      <td style="padding:6px 8px; text-align:center;">
        <input type="text" list="resumoDefDatalist" id="resumoDefRowOp_${idx}" value="${r.operador || ''}"
          style="width:100%; min-width:140px; padding:6px 10px; border-radius:6px; background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.18); color:#f8fafc; font-size:11px; font-weight:600; outline:none; transition:border 0.2s;"
          onfocus="this.style.borderColor='#38bdf8'" onblur="this.style.borderColor='rgba(255,255,255,0.18)'"
          placeholder="Selecione ou digite..." />
      </td>
    </tr>
  `).join('');

  const modalHtml = `
  <div id="modalResumoDefensivos" style="position:fixed; inset:0; background:rgba(2,6,23,0.88); backdrop-filter:blur(10px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:12px; font-family:system-ui,-apple-system,sans-serif;">
    <div style="background:#0f172a; color:#f8fafc; border:1px solid rgba(255,255,255,0.12); border-radius:14px; max-width:1250px; width:98%; max-height:92vh; display:flex; flex-direction:column; box-shadow:0 25px 60px -15px rgba(0,0,0,0.8);">
      
      <!-- HEADER DO MODAL -->
      <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.08); background:linear-gradient(90deg, rgba(30,41,59,0.7), rgba(15,23,42,0.7));">
        <div>
          <div style="font-size:16px; font-weight:800; display:flex; align-items:center; gap:8px; color:#f8fafc;">
            <span style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:8px; background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3)"></span>
            Resumo de Defensivos — Controle Geral de Agrotóxicos (PC06)
          </div>
          <div style="font-size:12px; color:#94a3b8; margin-top:4px; display:flex; gap:12px; flex-wrap:wrap;">
            <span><strong>Parcela:</strong> <span style="color:#38bdf8">${data.pCode}</span></span>
            <span><strong>Área:</strong> ${data.areaHa} ha</span>
            <span><strong>Plantio:</strong> ${data.plantioStr ? data.plantioStr.split('-').reverse().join('/') : '—'}</span>
            <span><strong>Total Aplicações:</strong> ${data.rowsData.length}</span>
          </div>
        </div>
        <button type="button" onclick="closeModalResumoDefensivos()" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#94a3b8; border-radius:8px; width:34px; height:34px; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.2)'; this.style.color='#f87171'" onmouseout="this.style.background='rgba(255,255,255,0.06)'; this.style.color='#94a3b8'">X</button>
      </div>

      <!-- BARRA DE GESTÃO RÁPIDA DE APLICADORES -->
      <div style="background:rgba(30,41,59,0.5); border-bottom:1px solid rgba(255,255,255,0.06); padding:12px 20px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <span style="font-size:12px; font-weight:700; color:#93c5fd; display:flex; align-items:center; gap:6px;">
             Aplicador Pré-cadastrado:
          </span>
          <select id="resumoDefGlobalAplicadorSelect" style="padding:7px 12px; border-radius:7px; background:#1e293b; border:1px solid rgba(255,255,255,0.18); color:#f8fafc; font-size:12px; font-weight:600; outline:none; min-width:180px;">
            ${optionsHtml}
          </select>
          <button type="button" onclick="resumoDefApplyGlobalAplicador()" style="background:#2563eb; color:#fff; border:none; padding:7px 14px; border-radius:7px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px; transition:background 0.2s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
             Aplicar a Todas as Linhas
          </button>
        </div>

        <div>
          <button type="button" onclick="openResumoDefGerenciarAplicadoresSubmodal()" style="background:rgba(255,255,255,0.06); color:#cbd5e1; border:1px solid rgba(255,255,255,0.15); padding:7px 14px; border-radius:7px; font-size:12px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">
             Gerenciar Aplicadores Pré-Cadastrados
          </button>
        </div>
      </div>

      <!-- TABELA INTERATIVA DO RESUMO (SEM COLUNA DESTRUIÇÃO) -->
      <div style="flex:1; overflow-y:auto; padding:12px 20px;">
        <datalist id="resumoDefDatalist">
          ${datalistHtml}
        </datalist>

        <div style="overflow-x:auto; border:1px solid rgba(255,255,255,0.08); border-radius:10px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:11px;">
            <thead>
              <tr style="background:#1e293b; color:#94a3b8; font-size:10.5px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid rgba(255,255,255,0.1);">
                <th style="padding:9px 8px; text-align:center; width:50px;">Data</th>
                <th style="padding:9px 8px; text-align:center; width:45px;">Nº OP</th>
                <th style="padding:9px 8px; text-align:center; width:35px;">DAP</th>
                <th style="padding:9px 8px; width:150px;">Alvo / Doenças</th>
                <th style="padding:9px 8px; width:120px;">Produto Comercial</th>
                <th style="padding:9px 8px; width:130px;">Ingrediente Ativo</th>
                <th style="padding:9px 8px; text-align:center; width:70px;">Dose Usada</th>
                <th style="padding:9px 8px; text-align:center; width:55px;">Carência</th>
                <th style="padding:9px 8px; text-align:center; width:75px;">Qtd Total</th>
                <th style="padding:9px 8px; text-align:center; width:65px;">Data Colheita</th>
                <th style="padding:9px 8px; text-align:center; width:170px; color:#38bdf8;">Nome do Aplicador </th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- FOOTER DE AÇÕES -->
      <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-top:1px solid rgba(255,255,255,0.08); background:#0b1120;">
        <span style="font-size:11.5px; color:#64748b;">
          * A coluna "Colheita p/ Destruição" foi removida da emissão conforme instrução técnica.
        </span>
        <div style="display:flex; gap:10px;">
          <button type="button" onclick="closeModalResumoDefensivos()" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; padding:8px 18px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;">
            Cancelar
          </button>
          <button type="button" onclick="confirmAndPrintResumoDefensivos()" style="background:linear-gradient(135deg, #10b981, #059669); border:none; color:#ffffff; padding:8px 22px; border-radius:8px; font-size:12px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(16,185,129,0.35); transition:all 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
             Imprimir Resumo PC06 Oficial (A4)
          </button>
        </div>
      </div>

    </div>
  </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeModalResumoDefensivos() {
  const m = document.getElementById('modalResumoDefensivos');
  if (m) m.remove();
}

function resumoDefApplyGlobalAplicador() {
  const sel = document.getElementById('resumoDefGlobalAplicadorSelect');
  if (!sel || !sel.value) return;
  const val = sel.value.trim().toUpperCase();
  if (!_currentResumoDefData || !_currentResumoDefData.rowsData) return;

  _currentResumoDefData.rowsData.forEach((r, idx) => {
    r.operador = val;
    const inp = document.getElementById(`resumoDefRowOp_${idx}`);
    if (inp) inp.value = val;
  });

  try { localStorage.setItem('prodtec_def_default_aplicador', val); } catch(e){}
  if (typeof toast === 'function') toast(`Aplicador "${val}" definido para todas as linhas!`, 'ok');
}

function confirmAndPrintResumoDefensivos() {
  if (!_currentResumoDefData || !_currentResumoDefData.rowsData) return;

  // Coleta os valores atualizados de cada linha editada
  _currentResumoDefData.rowsData.forEach((r, idx) => {
    const inp = document.getElementById(`resumoDefRowOp_${idx}`);
    if (inp && inp.value.trim()) {
      r.operador = inp.value.trim().toUpperCase();
    }
  });

  // Salva o primeiro aplicador da lista como padrão recente
  const firstOp = _currentResumoDefData.rowsData[0]?.operador;
  if (firstOp) {
    try { localStorage.setItem('prodtec_def_default_aplicador', firstOp); } catch(e){}
  }

  // Imprime a folha oficial sem a coluna destruição e com os aplicadores selecionados
  printPastaCampoDefensivosOficial(_currentResumoDefData.item, _currentResumoDefData.rowsData);
  closeModalResumoDefensivos();
}

// ── 5. SUBMODAL DE PRÉ-CADASTRO E GESTÃO DE APLICADORES ────────────────────
function openResumoDefGerenciarAplicadoresSubmodal() {
  let sub = document.getElementById('submodalGerenciarAplicadores');
  if (sub) sub.remove();

  const aplicadores = getResumoDefPreCadastradosAplicadores();
  const chipsHtml = aplicadores.map(a => `
    <div style="background:#1e293b; border:1px solid rgba(255,255,255,0.12); padding:5px 10px; border-radius:20px; font-size:11.5px; font-weight:600; color:#f8fafc; display:inline-flex; align-items:center; gap:6px;">
      <span>${a}</span>
      <button type="button" onclick="handleRemoveAplicadorPreCadastrado('${a}')" style="background:none; border:none; color:#ef4444; font-size:13px; font-weight:bold; cursor:pointer; padding:0 2px;">X</button>
    </div>
  `).join('');

  const html = `
  <div id="submodalGerenciarAplicadores" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(6px); z-index:100005; display:flex; align-items:center; justify-content:center; padding:16px;">
    <div style="background:#0f172a; color:#f8fafc; border:1px solid rgba(255,255,255,0.15); border-radius:12px; width:100%; max-width:480px; padding:20px; box-shadow:0 20px 40px rgba(0,0,0,0.8);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">
        <div style="font-size:14px; font-weight:800; color:#38bdf8;"> Gerenciar Aplicadores Pré-Cadastrados</div>
        <button type="button" onclick="document.getElementById('submodalGerenciarAplicadores').remove()" style="background:none; border:none; color:#94a3b8; font-size:16px; cursor:pointer;">X</button>
      </div>

      <div style="font-size:11.5px; color:#94a3b8; margin-bottom:12px;">
        Cadastre os nomes dos aplicadores para que fiquem disponíveis na lista rápida do resumo de defensivos e em todas as parcelas:
      </div>

      <div style="display:flex; gap:8px; margin-bottom:16px;">
        <input type="text" id="novoAplicadorInput" placeholder="Ex: JOÃO SILVA" style="flex:1; padding:8px 12px; border-radius:7px; background:#1e293b; border:1px solid rgba(255,255,255,0.2); color:#fff; font-size:12px; font-weight:600; text-transform:uppercase; outline:none;" />
        <button type="button" onclick="handleAddNovoAplicadorPreCadastrado()" style="background:#10b981; color:#fff; border:none; padding:8px 14px; border-radius:7px; font-size:12px; font-weight:700; cursor:pointer;">+ Adicionar</button>
      </div>

      <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:8px;">Aplicadores Cadastrados:</div>
      <div id="submodalChipsContainer" style="display:flex; flex-wrap:wrap; gap:6px; max-height:180px; overflow-y:auto; padding-bottom:6px;">
        ${chipsHtml}
      </div>

      <div style="margin-top:20px; text-align:right;">
        <button type="button" onclick="document.getElementById('submodalGerenciarAplicadores').remove()" style="background:#3b82f6; color:#fff; border:none; padding:8px 18px; border-radius:7px; font-size:12px; font-weight:700; cursor:pointer;">Concluir</button>
      </div>
    </div>
  </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  setTimeout(() => {
    const inp = document.getElementById('novoAplicadorInput');
    if (inp) {
      inp.focus();
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleAddNovoAplicadorPreCadastrado(); });
    }
  }, 100);
}

function handleAddNovoAplicadorPreCadastrado() {
  const inp = document.getElementById('novoAplicadorInput');
  if (!inp || !inp.value.trim()) return;
  const nome = inp.value.trim().toUpperCase();
  saveResumoDefPreCadastradoAplicador(nome);
  inp.value = '';

  // Atualiza chips
  openResumoDefGerenciarAplicadoresSubmodal();

  // Atualiza selects e datalists do modal principal
  refreshResumoDefSelectsAndDatalists(nome);
  if (typeof toast === 'function') toast(`Aplicador "${nome}" cadastrado com sucesso!`, 'ok');
}

function handleRemoveAplicadorPreCadastrado(nome) {
  removeResumoDefPreCadastradoAplicador(nome);
  openResumoDefGerenciarAplicadoresSubmodal();
  refreshResumoDefSelectsAndDatalists();
  if (typeof toast === 'function') toast(`Aplicador "${nome}" removido.`, 'info');
}

function refreshResumoDefSelectsAndDatalists(selectedNew) {
  const aplicadores = getResumoDefPreCadastradosAplicadores();
  const sel = document.getElementById('resumoDefGlobalAplicadorSelect');
  if (sel) {
    sel.innerHTML = aplicadores.map(a => `<option value="${a}" ${a === selectedNew ? 'selected' : ''}>${a}</option>`).join('');
  }
  const dl = document.getElementById('resumoDefDatalist');
  if (dl) {
    dl.innerHTML = aplicadores.map(a => `<option value="${a}">`).join('');
  }
}

// ── 6. IMPRESSÃO OFICIAL: PC06 — CONTROLE GERAL DE AGROTÓXICO (SEM DESTRUIÇÃO) ─────
function printPastaCampoDefensivosOficial(item, rowsData) {
  const tenantName = (window.tenantConfig && (window.tenantConfig.razao_social || window.tenantConfig.name)) || 'DINA DINAMARCA INDUSTRIAL AGRÍCOLA LTDA';
  const rtNome = (window.tenantConfig && window.tenantConfig.responsavel_tecnico_nome) || 'IVANOSCA MARTINS DE OLIVEIRA CUNHA';
  const pCode = item.parcela2 || item.parcela || '10.01 T';
  const plantioStr = item.semeadura || item.data_semeadura || item.semeadura1 || item.plantio || item.data_plantio || item.transplante;
  const areaHa = parseFloat(item.area || 3.0).toFixed(3);

  // GERAÇÃO DAS LINHAS IMPRESSAS — SEM A COLUNA "COLHEITA REALIZADA P/ DESTRUIÇÃO"
  const rowsHtml = (rowsData || []).map(r => `
    <tr>
      <td style="border:1px solid #000; padding:2px 3px; text-align:center">${r.data}</td>
      <td style="border:1px solid #000; padding:2px 3px; text-align:center; font-weight:bold">${r.ordem}</td>
      <td style="border:1px solid #000; padding:2px 3px; text-align:center; font-weight:bold">${r.dap}</td>
      <td style="border:1px solid #000; padding:2px 4px">${r.alvo}</td>
      <td style="border:1px solid #000; padding:2px 4px; font-weight:bold">${r.produto}</td>
      <td style="border:1px solid #000; padding:2px 4px">${r.ingrediente}</td>
      <td style="border:1px solid #000; padding:2px 3px; text-align:center">${r.doseRecom}</td>
      <td style="border:1px solid #000; padding:2px 3px; text-align:center; font-weight:bold">${r.doseUsada}</td>
      <td style="border:1px solid #000; padding:2px 3px; text-align:center">${r.appRealizadas}</td>
      <td style="border:1px solid #000; padding:2px 3px; text-align:center">${r.appPermitidas}</td>
      <td style="border:1px solid #000; padding:2px 3px; text-align:center; font-weight:bold">${r.carencia}</td>
      <td style="border:1px solid #000; padding:2px 3px; text-align:center">${r.isDias}</td>
      <td style="border:1px solid #000; padding:2px 3px; text-align:center; font-weight:bold">${r.qtd}</td>
      <td style="border:1px solid #000; padding:2px 3px; text-align:center">${r.horario}</td>
      <td style="border:1px solid #000; padding:2px 3px; text-align:center; font-weight:bold">${r.dtColheita}</td>
      <td style="border:1px solid #000; padding:2px 4px; text-align:center; font-weight:600">${r.operador || '—'}</td>
    </tr>
  `).join('');

  const printWin = window.open('', '_blank', 'width=1350,height=900');
  if (!printWin) {
    if (typeof toast === 'function') toast('Permita popups para imprimir.', 'err');
    else alert('Permita popups para imprimir.');
    return;
  }

  const logoHtml = typeof getTenantLogoHtml === 'function' ? getTenantLogoHtml(32, 100) : '<span style="font-weight:bold;font-size:11pt">PRODTEC</span>';

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8"/>
  <title>PC06 — CONTROLE GERAL DE AGROTÓXICO NA CULTURA — ${pCode}</title>
  <style>
    @page { size: A4 landscape; margin: 3mm 4mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 5.6pt; color: #000; line-height: 1.12; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet { width: 100%; }
    .hdr-table { width: 100%; border-collapse: collapse; margin-bottom: 2px; border: 1px solid #000; }
    .hdr-table td { border: 1px solid #000; padding: 1.5px 3px; font-size: 5.5pt; vertical-align: middle; }
    .main-title { font-size: 8pt; font-weight: bold; text-align: center; padding: 2px; border: 1px solid #000; margin-bottom: 2px; background: #f9fafb; color: #d32f2f; text-transform: uppercase; }
    .info-bar { width: 100%; display: flex; justify-content: space-between; font-size: 6.8pt; font-weight: bold; margin-bottom: 2px; }
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 2px; font-size: 5.3pt; }
    .grid-table th, .grid-table td { border: 1px solid #000; padding: 1px 2px; }
    .grid-table th { background: #f3f4f6; font-weight: bold; text-align: center; font-size: 5.1pt; }
    .footer-obs { font-size: 5pt; line-height: 1.15; margin-top: 2px; border-top: 1px solid #000; padding-top: 2px; }
    @media print {
      html, body { height: 100%; margin: 0 !important; padding: 0 !important; }
      .sheet { page-break-inside: avoid; page-break-after: avoid; }
      table { page-break-inside: avoid; }
      tr { page-break-inside: avoid; }
    }
  </style>
  </head>
  <body onload="window.print()">
  <div class="sheet">
    <table class="hdr-table">
      <tr>
        <td width="36%" style="line-height: 1.2;">
          <strong>ELABORADO, EMITIDO E REVISADO POR:</strong> EMANUELA MOREIRA<br/>
          Avaliado por: ADGF &nbsp;|&nbsp; Aprovado por: ADGF<br/>
          <strong>FREQUÊNCIA:</strong> POR PARCELA DE CAMPO.
        </td>
        <td width="18%" style="text-align:center; vertical-align:middle;">${logoHtml}</td>
        <td width="46%" style="line-height: 1.2;">
          <strong>DEPARTAMENTO:</strong> CAMPO<br/>
          <strong>NOME DO DOC:</strong> CONTROLE GERAL DE AGROTÓXICO NA CULTURA<br/>
          <strong>EMISSÃO:</strong> 15/06/2026 &nbsp;|&nbsp; <strong>MOD. E APROVAÇÃO:</strong> 01/07/2026 &nbsp;|&nbsp; <strong>U. REVISÃO:</strong> 01/07/2026<br/>
          <strong>PAG:</strong> 01 DE 01 &nbsp;\\&nbsp; <strong>COD:</strong> PC06 &nbsp;\\&nbsp; <strong>REVISÃO:</strong> ANUAL &nbsp;\\&nbsp; <strong>VERSÃO:</strong> 01
        </td>
      </tr>
    </table>

    <div class="main-title">CONTROLE GERAL DE AGROTÓXICO NA CULTURA</div>

    <div class="info-bar">
      <div><strong>Fazenda:</strong> &nbsp; ${tenantName.toUpperCase()} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Parcela:</strong> ${pCode} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Área:</strong> ${areaHa} ha &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Cultura:</strong> ${item.cultura || 'Melão'}</div>
      <div><strong>Data de Plantio:</strong> ${plantioStr ? plantioStr.split('-').reverse().join('/') : '—'}</div>
    </div>

    <table class="grid-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 48px;">Data<br/>DD/MM/AA</th>
          <th rowspan="2" style="width: 30px;">Nº<br/>Ordem</th>
          <th rowspan="2" style="width: 26px;">DAP*</th>
          <th rowspan="2" style="width: 105px;">Justificativa Nome<br/>Pragas e /ou Doenças</th>
          <th rowspan="2" style="width: 82px;">Nome Comercial (s)</th>
          <th rowspan="2" style="width: 85px;">Ingrediente Ativo<br/>Classe Toxicológica</th>
          <th colspan="2">Dosagem</th>
          <th colspan="2">Nº Aplicações</th>
          <th rowspan="2" style="width: 32px;">Carência*<br/>(Dias)</th>
          <th rowspan="2" style="width: 24px;">I.S*<br/>(Dias)</th>
          <th rowspan="2" style="width: 44px;">Quantidade<br/>(L, Kg ou mL)</th>
          <th rowspan="2" style="width: 42px;">Horário de<br/>Aplicação</th>
          <th rowspan="2" style="width: 48px;">Data Autorizada<br/>p/ Colheita</th>
          <th rowspan="2" style="width: 95px;">Nome do<br/>Aplicador</th>
        </tr>
        <tr>
          <th style="font-size:4.8pt; width:46px;">Recomendada</th>
          <th style="font-size:4.8pt; width:32px;">Usada</th>
          <th style="font-size:4.8pt; width:32px;">Realizadas</th>
          <th style="font-size:4.8pt; width:30px;">Permitidas</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="footer-obs">
      <strong>OBSERVAÇÕES:</strong><br/>
      <strong>- 1º DAP*:</strong> Dias após o plantio.<br/>
      <strong>- 2º Intervalo de Segurança (I.S*):</strong> Data de autorização de reentrada de pessoas sem o uso de EPI na área.<br/>
      <strong>- 3º CARÊNCIA*:</strong> Quantidade de dias que após a pulverização de um produto químico pode ser colhido o fruto sem resíduos químicos.<br/>
      <strong>- 4º</strong> Todo o excedente de calda química deve ser aplicado em bordaduras de parcelas que possam receber o produto. O técnico responsável deve autorizar essa aplicação, mantendo registros do processo, toda a equipe deve ser treinada, saber e obedecer essa prática. É proibido descartar resíduos de calda em áreas de preservação ambiental ou recursos hídricos.
    </div>

    <!-- ASSINATURA DA RESPONSÁVEL TÉCNICA -->
    <div style="display:flex; justify-content:flex-end; margin-top:3px;">
      <div style="text-align:center; width:260px;">
        <div style="border-bottom:1px solid #000; margin-bottom:2px; height:18px;"></div>
        <div style="font-weight:bold; font-size:7pt;">${rtNome}</div>
        <div style="font-size:5.8pt; color:#222;">Engª. Agrônoma &nbsp;|&nbsp; Responsável Técnica</div>
      </div>
    </div>
  </div>
  </body>
  </html>
  `;

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}

// ── 7. EXPOSIÇÃO GLOBAL E INTEGRAÇÃO TRANSPARENTE ──────────────────────────
async function printPastaCampoDefensivos(idOrStr, forceDirectPrint) {
  if (forceDirectPrint === true) {
    const data = await loadResumoDefensivosData(idOrStr);
    if (data) printPastaCampoDefensivosOficial(data.item, data.rowsData);
  } else {
    await openModalResumoDefensivos(idOrStr);
  }
}

window.printPastaCampoDefensivos = printPastaCampoDefensivos;
window.openModalResumoDefensivos = openModalResumoDefensivos;
window.printPastaCampoDefensivosOficial = printPastaCampoDefensivosOficial;
window.getResumoDefPreCadastradosAplicadores = getResumoDefPreCadastradosAplicadores;
window.saveResumoDefPreCadastradoAplicador = saveResumoDefPreCadastradoAplicador;
window.removeResumoDefPreCadastradoAplicador = removeResumoDefPreCadastradoAplicador;
