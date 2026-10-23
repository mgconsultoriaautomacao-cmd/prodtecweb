/**
 * RESUMO DE ELEMENTOS & NUTRIÇÃO VEGETAL — CADERNO DE CAMPO (PC08 / PC09)
 * Sistema PRODTEC / Bom Jesus Agrícola
 * Compatível com modelo oficial de Certificação GlobalGAP e Caderno de Campo.
 */

// ── 1. LISTA DE ELEMENTOS QUÍMICOS / NUTRIENTES ───────────────────────────
const NUTRIENT_COLUMNS = [
  { key: 'mat_org', label: 'Mat. Org.', unit: '%' },
  { key: 'n', label: 'N', unit: '%' },
  { key: 'p2o5', label: 'P₂O₅', unit: '%' },
  { key: 'k2o', label: 'K₂O', unit: '%' },
  { key: 'cao', label: 'CaO', unit: '%' },
  { key: 'mgo', label: 'MgO', unit: '%' },
  { key: 'so3', label: 'SO₃', unit: '%' },
  { key: 'zn', label: 'Zn', unit: '%' },
  { key: 'fe', label: 'Fe', unit: '%' },
  { key: 'mn', label: 'Mn', unit: '%' },
  { key: 'b', label: 'B', unit: '%' },
  { key: 'mo', label: 'Mo', unit: '%' },
  { key: 'cu', label: 'Cu', unit: '%' },
  { key: 'co', label: 'Co', unit: '%' },
  { key: 'h2po4', label: 'H₂PO₄', unit: '%' },
  { key: 'hpo4', label: 'HPO₄', unit: '%' },
  { key: 'ac_humico', label: 'Ác. Húmico', unit: '%' },
  { key: 'ac_fulvico', label: 'Ác. Fúlvico', unit: '%' },
  { key: 'celulase', label: 'Celulase', unit: '%' },
  { key: 'silicio', label: 'Silício', unit: '%' },
  { key: 'amilase', label: 'Amilase', unit: '%' }
];


// ── 1.1. PROTOCOLOS EMBARCADOS OFICIAIS DE FERTIRRIGAÇÃO (DAP 11 AO DAP 65/75) ─────
const DEFAULT_FERT_PROTOCOLS = {"MELAO_PADRAO":{"sheet_name":"FERT MELÃO","fertilizers":["MAP","UREIA","ACIDO BORICO","NIT. CALCIO","SULF. MAG.","SULF. POTASSIO","FERT","OBSERVAÇÕES"],"schedule":{"1":{"MAP":3,"UREIA":3},"2":{"MAP":3,"UREIA":3,"NIT. CALCIO":2},"3":{"MAP":3,"UREIA":3,"SULF. MAG.":1,"FERT":1},"4":{"MAP":5,"UREIA":3,"NIT. CALCIO":2,"SULF. POTASSIO":2,"FERT":1},"5":{"MAP":5,"UREIA":3,"SULF. MAG.":1,"FERT":1},"6":{"MAP":5,"UREIA":4,"NIT. CALCIO":2,"SULF. POTASSIO":2,"FERT":1},"7":{"MAP":5,"UREIA":4,"ACIDO BORICO":0.3,"SULF. MAG.":1,"FERT":1},"8":{"MAP":5,"UREIA":4,"ACIDO BORICO":0.3,"NIT. CALCIO":2,"SULF. POTASSIO":2,"OBSERVAÇÕES":1},"9":{"MAP":5,"UREIA":4,"ACIDO BORICO":0.3,"SULF. MAG.":1,"FERT":1},"10":{"MAP":5,"UREIA":4,"ACIDO BORICO":0.3,"NIT. CALCIO":2,"SULF. POTASSIO":2},"11":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.3,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"12":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.3,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2},"13":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.3,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"14":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2},"15":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"16":{"MAP":8,"UREIA":5,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2},"17":{"MAP":8,"UREIA":5,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"18":{"MAP":8,"UREIA":5,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"19":{"MAP":8,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"20":{"MAP":8,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":3,"FERT":1},"21":{"MAP":9,"ACIDO BORICO":0.5,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":3,"FERT":1},"22":{"MAP":9,"ACIDO BORICO":0.5,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":3},"23":{"MAP":9,"ACIDO BORICO":0.5,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":3,"FERT":1},"24":{"MAP":9,"ACIDO BORICO":0.4,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":3},"25":{"MAP":9,"ACIDO BORICO":0.4,"NIT. CALCIO":3,"SULF. MAG.":2,"SULF. POTASSIO":3,"FERT":1},"26":{"MAP":9,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6},"27":{"MAP":9,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6,"FERT":1},"28":{"MAP":9,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6},"29":{"MAP":9,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6,"FERT":1},"30":{"MAP":6,"UREIA":2,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6,"FERT":1},"31":{"MAP":6,"UREIA":2,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":8,"FERT":1},"32":{"MAP":6,"UREIA":2,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":8,"FERT":1},"33":{"MAP":6,"UREIA":2,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":11,"FERT":1},"34":{"MAP":5,"UREIA":2,"ACIDO BORICO":0.25,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":11},"35":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":13,"FERT":1},"36":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":13},"37":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":13,"FERT":1},"38":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":13},"39":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":13,"FERT":1},"40":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":13},"41":{"UREIA":5,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":13},"42":{"UREIA":5,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":13},"43":{"UREIA":5,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":13},"44":{"UREIA":5,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":13},"45":{"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":13},"46":{"NIT. CALCIO":9,"SULF. POTASSIO":13},"47":{"NIT. CALCIO":9,"SULF. POTASSIO":13},"48":{"NIT. CALCIO":9,"SULF. POTASSIO":13},"49":{"NIT. CALCIO":9,"SULF. POTASSIO":13},"50":{"NIT. CALCIO":9,"SULF. POTASSIO":13},"51":{"NIT. CALCIO":9,"SULF. POTASSIO":13},"52":{"NIT. CALCIO":9,"SULF. POTASSIO":13},"53":{"NIT. CALCIO":9,"SULF. POTASSIO":13},"54":{"NIT. CALCIO":9,"SULF. POTASSIO":13},"55":{"NIT. CALCIO":9,"SULF. POTASSIO":13}}},"MELANCIA_PADRAO":{"sheet_name":"FERT MELANCIA.","fertilizers":["MAP","UREIA","ACIDO BORICO","NIT. CALCIO","SULF. MAG.","SULF. POTASSIO","FERT","OBSERVAÇÕES"],"schedule":{"1":{"MAP":3,"UREIA":3},"2":{"MAP":3,"UREIA":3},"3":{"MAP":3,"UREIA":3,"SULF. MAG.":1,"FERT":1},"4":{"MAP":5,"UREIA":3,"FERT":1},"5":{"MAP":5,"UREIA":3,"SULF. MAG.":1,"FERT":1},"6":{"MAP":5,"UREIA":4,"FERT":1},"7":{"MAP":5,"UREIA":4,"ACIDO BORICO":0.3,"SULF. MAG.":1,"FERT":1},"8":{"MAP":5,"UREIA":4,"ACIDO BORICO":0.3,"NIT. CALCIO":2,"OBSERVAÇÕES":1},"9":{"MAP":5,"UREIA":4,"ACIDO BORICO":0.3,"SULF. MAG.":1,"FERT":1},"10":{"MAP":5,"UREIA":4,"ACIDO BORICO":0.3,"NIT. CALCIO":2,"SULF. POTASSIO":2},"11":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.3,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"12":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.3,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2},"13":{"MAP":6,"ACIDO BORICO":0.3,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"14":{"MAP":6,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2},"15":{"MAP":6,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"16":{"MAP":8,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"17":{"MAP":8,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"18":{"MAP":8,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"19":{"MAP":8,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"20":{"MAP":8,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":3},"21":{"MAP":9,"ACIDO BORICO":0.5,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":3,"FERT":1},"22":{"MAP":9,"ACIDO BORICO":0.5,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":3},"23":{"MAP":9,"ACIDO BORICO":0.5,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":3,"FERT":1},"24":{"MAP":9,"ACIDO BORICO":0.4,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":3},"25":{"MAP":9,"ACIDO BORICO":0.4,"NIT. CALCIO":3,"SULF. MAG.":2,"SULF. POTASSIO":9,"FERT":1},"26":{"MAP":9,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":9},"27":{"MAP":9,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":9,"FERT":1},"28":{"MAP":9,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":9},"29":{"MAP":9,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":9,"FERT":1},"30":{"MAP":6,"UREIA":2,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":9,"FERT":1},"31":{"MAP":6,"UREIA":2,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":8,"FERT":1},"32":{"MAP":6,"UREIA":2,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":11,"FERT":1},"33":{"MAP":6,"UREIA":2,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":11,"FERT":1},"34":{"MAP":5,"UREIA":2,"ACIDO BORICO":0.25,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":11},"35":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":13,"FERT":1},"36":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":13},"37":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":13,"FERT":1},"38":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":13},"39":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":13,"FERT":1},"40":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":13},"41":{"UREIA":5,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":13},"42":{"UREIA":5,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":13},"43":{"UREIA":5,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":13},"44":{"UREIA":5,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":13},"45":{"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":13},"46":{"NIT. CALCIO":9,"SULF. POTASSIO":13},"47":{"NIT. CALCIO":9,"SULF. POTASSIO":13},"48":{"NIT. CALCIO":9,"SULF. POTASSIO":13},"49":{"NIT. CALCIO":9,"SULF. POTASSIO":13},"50":{"NIT. CALCIO":9,"SULF. POTASSIO":13}}},"ASTURIA":{"sheet_name":"FERT MELAO","fertilizers":["MAP","UREIA","ACIDO BORICO","NIT. CALCIO","SULF. MAG.","SULF. POTASSIO","FERT","OBSERVAÇÕES"],"schedule":{"1":{"MAP":5,"UREIA":3},"2":{"MAP":5,"UREIA":3},"3":{"MAP":5,"UREIA":3,"SULF. MAG.":1,"FERT":1},"4":{"MAP":5,"UREIA":3,"FERT":1},"5":{"MAP":5,"UREIA":3,"SULF. MAG.":1,"FERT":1},"6":{"MAP":6,"UREIA":4,"FERT":1},"7":{"MAP":6,"UREIA":4,"ACIDO BORICO":0.3,"SULF. MAG.":1,"FERT":1},"8":{"MAP":6,"UREIA":4,"ACIDO BORICO":0.3,"NIT. CALCIO":2},"9":{"MAP":6,"UREIA":4,"ACIDO BORICO":0.3,"SULF. MAG.":1,"FERT":1},"10":{"MAP":6,"UREIA":4,"ACIDO BORICO":0.3,"NIT. CALCIO":2,"SULF. POTASSIO":2},"11":{"MAP":7,"UREIA":5,"ACIDO BORICO":0.3,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"12":{"MAP":7,"UREIA":5,"ACIDO BORICO":0.3,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2},"13":{"MAP":7,"UREIA":4,"ACIDO BORICO":0.3,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"14":{"MAP":7,"UREIA":4,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2},"15":{"MAP":7,"UREIA":4,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"16":{"MAP":8,"UREIA":4,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"17":{"MAP":10,"UREIA":4,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"18":{"MAP":10,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"19":{"MAP":10,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"20":{"MAP":10,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":3},"21":{"MAP":10,"ACIDO BORICO":0.5,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":3,"FERT":1},"22":{"MAP":10,"ACIDO BORICO":0.5,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":6},"23":{"MAP":10,"ACIDO BORICO":0.5,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":6,"FERT":1},"24":{"MAP":10,"ACIDO BORICO":0.4,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":6},"25":{"MAP":10,"ACIDO BORICO":0.4,"NIT. CALCIO":3,"SULF. MAG.":2,"SULF. POTASSIO":6,"FERT":1},"26":{"MAP":10,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6},"27":{"MAP":10,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6,"FERT":1},"28":{"MAP":10,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6},"29":{"MAP":10,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6,"FERT":1},"30":{"MAP":10,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6,"FERT":1},"31":{"MAP":8,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":8,"FERT":1},"32":{"MAP":8,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":8,"FERT":1},"33":{"MAP":8,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":8,"FERT":1},"34":{"MAP":8,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":8},"35":{"MAP":8,"UREIA":5,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":10,"FERT":1},"36":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":10},"37":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":10,"FERT":1},"38":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":10},"39":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":10,"FERT":1},"40":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":10},"41":{"MAP":4,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":10,"FERT":1},"42":{"MAP":4,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":10},"43":{"MAP":4,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":10,"FERT":1},"44":{"MAP":4,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":10},"45":{"MAP":4,"UREIA":4,"ACIDO BORICO":0.25,"NIT. CALCIO":10,"SULF. MAG.":1,"SULF. POTASSIO":10,"FERT":1},"46":{"UREIA":4,"ACIDO BORICO":0.25,"NIT. CALCIO":10,"SULF. MAG.":1,"SULF. POTASSIO":10},"47":{"UREIA":4,"ACIDO BORICO":0.25,"NIT. CALCIO":10,"SULF. MAG.":1,"SULF. POTASSIO":10,"FERT":1},"48":{"UREIA":4,"ACIDO BORICO":0.25,"NIT. CALCIO":10,"SULF. MAG.":1,"SULF. POTASSIO":10},"49":{"UREIA":2,"ACIDO BORICO":0.25,"NIT. CALCIO":10,"SULF. MAG.":1,"SULF. POTASSIO":10,"FERT":1},"50":{"UREIA":2,"ACIDO BORICO":0.25,"NIT. CALCIO":10,"SULF. MAG.":1,"SULF. POTASSIO":10},"51":{"UREIA":2,"NIT. CALCIO":10,"SULF. POTASSIO":10},"52":{"UREIA":2,"NIT. CALCIO":10,"SULF. POTASSIO":10},"53":{"UREIA":2,"NIT. CALCIO":10,"SULF. POTASSIO":10},"54":{"UREIA":2,"NIT. CALCIO":10,"SULF. POTASSIO":10},"55":{"UREIA":2,"NIT. CALCIO":10,"SULF. POTASSIO":10},"56":{"NIT. CALCIO":10,"SULF. POTASSIO":10},"57":{"NIT. CALCIO":10,"SULF. POTASSIO":10},"58":{"NIT. CALCIO":10,"SULF. POTASSIO":10},"59":{"NIT. CALCIO":10,"SULF. POTASSIO":10},"60":{"NIT. CALCIO":10,"SULF. POTASSIO":10},"61":{"NIT. CALCIO":8,"SULF. POTASSIO":8},"62":{"NIT. CALCIO":8,"SULF. POTASSIO":8},"63":{"NIT. CALCIO":8,"SULF. POTASSIO":8},"64":{"NIT. CALCIO":8,"SULF. POTASSIO":8},"65":{"NIT. CALCIO":8,"SULF. POTASSIO":8}}},"GRAND_PRIX":{"sheet_name":"FERT MELAO","fertilizers":["MAP","UREIA","ACIDO BORICO","NIT. CALCIO","SULF. MAG.","SULF. POTASSIO","FERT","OBSERVAÇÕES"],"schedule":{"1":{"MAP":5,"UREIA":3},"2":{"MAP":5,"UREIA":3},"3":{"MAP":5,"UREIA":3,"SULF. MAG.":1,"FERT":1},"4":{"MAP":5,"UREIA":3,"FERT":1},"5":{"MAP":5,"UREIA":3,"SULF. MAG.":1,"FERT":1},"6":{"MAP":6,"UREIA":4,"FERT":1},"7":{"MAP":6,"UREIA":4,"ACIDO BORICO":0.3,"SULF. MAG.":1,"FERT":1},"8":{"MAP":6,"UREIA":4,"ACIDO BORICO":0.3,"NIT. CALCIO":2},"9":{"MAP":6,"UREIA":4,"ACIDO BORICO":0.3,"SULF. MAG.":1,"FERT":1},"10":{"MAP":6,"UREIA":4,"ACIDO BORICO":0.3,"NIT. CALCIO":2,"SULF. POTASSIO":2},"11":{"MAP":7,"UREIA":5,"ACIDO BORICO":0.3,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"12":{"MAP":7,"UREIA":5,"ACIDO BORICO":0.3,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2},"13":{"MAP":7,"UREIA":4,"ACIDO BORICO":0.3,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"14":{"MAP":7,"UREIA":4,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2},"15":{"MAP":7,"UREIA":4,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"16":{"MAP":8,"UREIA":4,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"17":{"MAP":10,"UREIA":4,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"18":{"MAP":10,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"19":{"MAP":10,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":2,"FERT":1},"20":{"MAP":10,"ACIDO BORICO":0.5,"NIT. CALCIO":2,"SULF. MAG.":1,"SULF. POTASSIO":3},"21":{"MAP":10,"ACIDO BORICO":0.5,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":3,"FERT":1},"22":{"MAP":10,"ACIDO BORICO":0.5,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":6},"23":{"MAP":10,"ACIDO BORICO":0.5,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":6,"FERT":1},"24":{"MAP":10,"ACIDO BORICO":0.4,"NIT. CALCIO":3,"SULF. MAG.":1,"SULF. POTASSIO":6},"25":{"MAP":10,"ACIDO BORICO":0.4,"NIT. CALCIO":3,"SULF. MAG.":2,"SULF. POTASSIO":6,"FERT":1},"26":{"MAP":10,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6},"27":{"MAP":10,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6,"FERT":1},"28":{"MAP":10,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6},"29":{"MAP":10,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6,"FERT":1},"30":{"MAP":10,"ACIDO BORICO":0.4,"NIT. CALCIO":4,"SULF. MAG.":2,"SULF. POTASSIO":6,"FERT":1},"31":{"MAP":8,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":8,"FERT":1},"32":{"MAP":8,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":8,"FERT":1},"33":{"MAP":8,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":8,"FERT":1},"34":{"MAP":8,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":8},"35":{"MAP":8,"UREIA":5,"ACIDO BORICO":0.4,"NIT. CALCIO":5,"SULF. MAG.":2,"SULF. POTASSIO":10,"FERT":1},"36":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":10},"37":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":10,"FERT":1},"38":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":10},"39":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":10,"FERT":1},"40":{"MAP":6,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":7,"SULF. MAG.":2,"SULF. POTASSIO":10},"41":{"MAP":4,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":10,"FERT":1},"42":{"MAP":4,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":10},"43":{"MAP":4,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":10,"FERT":1},"44":{"MAP":4,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":9,"SULF. MAG.":1,"SULF. POTASSIO":10},"45":{"MAP":4,"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":10,"SULF. MAG.":1,"SULF. POTASSIO":10,"FERT":1},"46":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":10,"SULF. MAG.":1,"SULF. POTASSIO":10},"47":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":10,"SULF. MAG.":1,"SULF. POTASSIO":10,"FERT":1},"48":{"UREIA":5,"ACIDO BORICO":0.25,"NIT. CALCIO":10,"SULF. MAG.":1,"SULF. POTASSIO":10},"49":{"UREIA":3,"ACIDO BORICO":0.25,"NIT. CALCIO":10,"SULF. MAG.":1,"SULF. POTASSIO":10,"FERT":1},"50":{"UREIA":3,"ACIDO BORICO":0.25,"NIT. CALCIO":10,"SULF. MAG.":1,"SULF. POTASSIO":10},"51":{"UREIA":3,"NIT. CALCIO":10,"SULF. POTASSIO":10},"52":{"UREIA":3,"NIT. CALCIO":10,"SULF. POTASSIO":10},"53":{"UREIA":3,"NIT. CALCIO":10,"SULF. POTASSIO":10},"54":{"UREIA":3,"NIT. CALCIO":10,"SULF. POTASSIO":10},"55":{"UREIA":3,"NIT. CALCIO":10,"SULF. POTASSIO":10},"56":{"NIT. CALCIO":8,"SULF. POTASSIO":8},"57":{"NIT. CALCIO":8,"SULF. POTASSIO":8},"58":{"NIT. CALCIO":8,"SULF. POTASSIO":8},"59":{"NIT. CALCIO":8,"SULF. POTASSIO":8},"60":{"NIT. CALCIO":8,"SULF. POTASSIO":8}}}};
if (typeof window !== 'undefined') {
  window.DEFAULT_FERT_PROTOCOLS = DEFAULT_FERT_PROTOCOLS;
  if (!window.FERT_PROTOCOLS) window.FERT_PROTOCOLS = DEFAULT_FERT_PROTOCOLS;
}

// ── 2. BASE DE DADOS PADRÃO DE TEORES (%) EXTRAÍDA DO MODELO OFICIAL ───────
const DEFAULT_ELEMENTS_DATABASE = {
  // Fertilizantes Principais de Fertirrigação
  "MAP": { n: 11.0, p2o5: 50.0 },
  "MAP 61%": { n: 12.0, p2o5: 61.0 },
  "MAP CRISTAL": { n: 12.0, p2o5: 61.0, k2o: 10.0 },
  "UREIA": { n: 45.0 },
  "UREIA MAX": { n: 46.0 },
  "URFA 44%": { n: 17.0, p2o5: 44.0 },
  "ACIDO BORICO": { b: 17.5 },
  "AC. BORICO": { b: 17.5 },
  "ÁCIDO BÓRICO": { b: 17.5 },
  "NIT. CALCIO": { n: 15.5, cao: 10.0, mgo: 0.5 },
  "NITRATO DE CALCIO": { n: 15.5, cao: 10.0, mgo: 0.5 },
  "NITRATO DE CÁLCIO": { n: 15.5, cao: 10.0, mgo: 0.5 },
  "SULF. MAG.": { mgo: 9.0, so3: 12.0 },
  "SULF. MAG": { mgo: 9.0, so3: 12.0 },
  "SULFATO DE MAGNESIO": { mgo: 9.0, so3: 12.0 },
  "SULFATO DE MAGNÉSIO": { mgo: 9.0, so3: 12.0 },
  "SULF. POTASSIO": { k2o: 50.0, so3: 42.0 },
  "SULF. POT.": { k2o: 50.0, so3: 42.0 },
  "SULFATO DE POTASSIO": { k2o: 50.0, so3: 42.0 },
  "SULFATO DE POTÁSSIO": { k2o: 50.0, so3: 42.0 },
  "CLORETO DE POTASSIO": { k2o: 60.0 },
  "CLORETO DE POTÁSSIO (KCL)": { k2o: 60.0 },
  "FERT": { mat_org: 2.0, n: 2.0, p2o5: 3.0 },
  "SUPERSOIL": { mat_org: 2.0, n: 2.0, p2o5: 3.0 },
  "AGI MOL": { mat_org: 2.0, n: 2.0, p2o5: 3.0 },
  "AGIMOL": { mat_org: 2.0, n: 2.0, p2o5: 3.0 },
  
  // Adubos de Fundação & Complexos NPK
  "ADUBO 06-24-12": { n: 6.0, p2o5: 24.0, k2o: 12.0 },
  "06.24.12": { n: 6.0, p2o5: 24.0, k2o: 12.0 },
  "ADUBO 03-12-06": { n: 3.0, p2o5: 12.0, k2o: 6.0 },
  "03.12.06": { n: 3.0, p2o5: 12.0, k2o: 6.0 },
  "ADUBO 08-30-20": { n: 8.0, p2o5: 30.0, k2o: 20.0 },
  "ADUBO 10-10-10": { n: 10.0, p2o5: 10.0, k2o: 10.0 },
  "ADUBO 11-40-11": { n: 11.0, p2o5: 40.0, k2o: 11.0 },
  "ADUBO 12-18-18": { n: 12.0, p2o5: 18.0, k2o: 18.0 },
  "ADUBO 13-14-30": { n: 13.0, p2o5: 14.0, k2o: 30.0 },
  "ADUBO 15.30.15": { n: 15.0, p2o5: 30.0, k2o: 15.0 },
  "05.30.05": { n: 5.0, p2o5: 30.0, k2o: 5.0 },
  "FERT MINERAL COMPLEXO 05.30.05": { n: 5.0, p2o5: 30.0, k2o: 5.0 },
  "FERT MINERAL MISTO 15.30.15": { n: 15.0, p2o5: 30.0, k2o: 15.0 },
  "BIOTURBO": { n: 3.0, p2o5: 12.0, k2o: 6.0 },
  "COMPOSTO ORGANICO": { mat_org: 39.0, n: 17.0, p2o5: 3.3, k2o: 2.3 },
  "COMPOSTO ORGÂNICO": { mat_org: 39.0, n: 17.0, p2o5: 3.3, k2o: 2.3 },
  "COMPOSTO ORG": { mat_org: 39.0, n: 17.0, p2o5: 3.3, k2o: 2.3 },
  "AMIORGAN": { mat_org: 70.0, n: 17.0, p2o5: 7.0, k2o: 8.0, so3: 0.8 },

  // Ácidos e Especialidades
  "ACIDO NITRICO": { n: 12.4 },
  "ÁCIDO NÍTRICO": { n: 12.4 },
  "ACIDO FOSFORICO": { p2o5: 50.0 },
  "ÁCIDO FOSFÓRICO": { p2o5: 50.0 },
  "NITRATO DE MAGNESIO": { n: 10.5, mgo: 9.0 },
  "NITRATO DE MAGNÉSIO": { n: 10.5, mgo: 9.0 },
  "NIT MAG": { n: 10.5, mgo: 9.0 },
  "NITRATO DE POTASSIO": { n: 13.0, k2o: 44.0 },
  "NITRATO DE POTÁSSIO": { n: 13.0, k2o: 44.0 },
  "NIT. POT.": { n: 13.0, k2o: 44.0 },
  "SULFATO DE AMONIA": { n: 20.0, so3: 22.0 },
  "SULFATO DE AMÔNIA": { n: 20.0, so3: 22.0 },
  "SULFATO DE ZINCO": { so3: 16.0, zn: 20.0 },
  "MKP": { p2o5: 52.0, k2o: 34.0 },
  "PEKACID": { p2o5: 60.0, k2o: 20.0 },
  "MAGNUM PHOSCAL": { n: 9.0, p2o5: 49.0, cao: 10.0 },
  "MAGPHOS": { p2o5: 55.0, k2o: 19.0, mgo: 8.0 },
  "MULT NPK 00.50.36": { p2o5: 50.0, k2o: 36.0 },
  "MULT NPK 13.02.44": { n: 13.0, p2o5: 2.0, k2o: 44.0 },
  "MULT PROTEK 00.56.37": { p2o5: 56.0, k2o: 37.0, h2po4: 30.0, hpo4: 26.0 },
  "MULTIMAG 9": { cao: 9.0, so3: 11.0 },
  "POLY FEED 12.43.12": { n: 12.0, p2o5: 43.0, k2o: 12.0 },
  "UREIA SUPERFOSFATADA": { n: 17.0, p2o5: 44.0 },

  // Foliares e Nutrição Foliar (Páginas 10, 11 e 13)
  "P - 51": { p2o5: 51.0 },
  "P-51": { p2o5: 51.0 },
  "P - 51 (FOLIAR)": { p2o5: 51.0 },
  "ACTIWAVE": { n: 3.0, p2o5: 7.0, cao: 0.32, mgo: 0.08, so3: 0.5 },
  "AGRO MOS": { n: 2.75, p2o5: 2.0, k2o: 3.0 },
  "AGRUMAX": { n: 12.0, p2o5: 10.8, k2o: 10.0, cao: 0.2, zn: 10.0, fe: 1.0, mn: 0.1 },
  "AJIFOL": { mat_org: 30.0, n: 10.0, p2o5: 12.2, k2o: 12.5, cao: 12.2, mgo: 12.1 },
  "AJIFOL P-250": { p2o5: 25.0 },
  "AJIPOWER": { n: 4.0, p2o5: 19.0 },
  "ALPHA X-35": { n: 12.4, p2o5: 2.4 },
  "AMINOAGRO AD+": { n: 7.0 },
  "AMINOAGRO MAGNESIO": { mgo: 5.0 },
  "AMINOAGRO MAGNÉSIO": { mgo: 5.0 },
  "AMINOAGRO MOLIBDENIO": { mo: 15.0 },
  "AMINOAGRO MOLIBDÊNIO": { mo: 15.0 },
  "AMINOBOR CA": { cao: 8.0, b: 0.2 },
  "AMINOBOR Ca": { cao: 8.0, b: 0.2 },
  "AMINOMAX CAB": { n: 9.0, cao: 0.5, b: 0.2, mo: 0.01, ac_humico: 6.0 },
  "AMINOMAX M": { n: 10.0, p2o5: 3.0, k2o: 2.0, cao: 0.5, fe: 0.1, mn: 0.02, zn: 0.02, ac_humico: 6.0 },
  "AMINOMAX SUPRA": { n: 5.0, p2o5: 10.0, k2o: 6.0, cao: 2.0, mgo: 1.1, zn: 0.1, fe: 0.5, mn: 0.1, b: 0.2, ac_humico: 6.0 },
  "AMINO-PLUS": { mat_org: 30.0, n: 11.0, k2o: 1.0 },
  "ATON AZ": { n: 10.0, p2o5: 5.0, zn: 0.2, fe: 2.5, b: 0.1 },
  "AVE-0": { mat_org: 62.0, n: 10.6, p2o5: 16.4 },
  "BAC SOL": { n: 5.0 },
  "BARRIER": { cao: 13.0, silicio: 10.0 },
  "BENEFIT PZ": { n: 1.0, p2o5: 3.0, cao: 1.0, mgo: 1.0, ac_humico: 3.0 },
  "BIO PIROL": { n: 0.3, p2o5: 5.5, k2o: 1.8, cao: 0.2, fe: 0.5, mn: 0.4, zn: 0.3 },
  "BIOCONTROL": { mat_org: 52.0, n: 7.6, p2o5: 14.7, k2o: 15.5 },
  "BIONUTRI FERRO": { fe: 8.0 },
  "BIONUTRI ZINCO": { zn: 5.0 },
  "BIOZIME TF": { n: 1.73, p2o5: 5.0, k2o: 2.1, cao: 2.43, so3: 0.49, zn: 1.0, fe: 0.08 },
  "BORAMIN CA": { b: 0.2 },
  "BORO PLUS": { b: 11.0 },
  "BREXIL TOP": { n: 2.0, cao: 10.0, mgo: 6.0, zn: 5.0, b: 2.0, fe: 6.0 },
  "CAB MAX": { cao: 2.0, b: 8.0 },
  "CAB2": { cao: 8.0, b: 2.0 },
  "CATP": { mat_org: 33.0, cao: 0.3, p2o5: 30.0 },
  "CHELAL B": { b: 8.0 },
  "CODA BRIX": { k2o: 18.0 },
  "CODA MAX": { p2o5: 3.9, k2o: 32.0 },
  "CODA MIX": { fe: 4.6, mn: 0.5, zn: 4.0, cu: 2.0, b: 0.3, mo: 0.12 },
  "CODAFOL 0.54.0": { p2o5: 54.0 },
  "CODAHUMUS 20": { n: 3.0, ac_humico: 10.0, ac_fulvico: 10.2 },
  "CODAMIM HF": { n: 3.0, p2o5: 9.5, k2o: 3.5, b: 0.5 },
  "CODAPHOS MG": { p2o5: 40.0, mgo: 6.0 },
  "CODASAL PLUS": { n: 6.6, cao: 8.7 },
  "CODASTING": { n: 7.2 },
  "COMPLEXO HORTIFRUTI": { n: 3.0, p2o5: 5.0, k2o: 10.0, cao: 1.0, mgo: 1.0, so3: 0.5, zn: 10.0, fe: 0.2 },
  "CONTROL DPM": { n: 3.0, p2o5: 17.0 },
  "COPPER CROP": { n: 4.0, cu: 10.0 },
  "CROP SET": { n: 3.62, so3: 2.5, zn: 3.0, fe: 1.0 },
  "DELFAN PLUS": { n: 9.0 },
  "DIGEST-AID": { ac_humico: 6.0, celulase: 0.6 },
  "DMOLIDOR 20": { n: 5.0, p2o5: 4.0, b: 0.5 },
  "DRAKAR K": { n: 3.0, k2o: 31.0 },
  "ENERVIG LEG": { n: 0.5, p2o5: 10.0, fe: 0.7 },
  "ENXOFRE 100": { so3: 11.0, fe: 7.1 },
  "ENXOFRE LIQUIDO": { so3: 68.0 },
  "ENXOFRE SUFU-M": { so3: 80.0, fe: 0.1 },
  "FAINAL K": { n: 3.0, k2o: 31.0 },
  "FERTAMIM CAB": { n: 10.0, cao: 1.5, b: 0.05, mo: 0.01 },
  "FERTAMIM EXTRA": { n: 10.0, p2o5: 1.0, k2o: 1.0, cao: 1.0, mgo: 0.5, zn: 3.0, fe: 0.5 },
  "FERTAMIM FERRO": { fe: 0.5 },
  "FERTAMIM PLUS": { n: 2.0, p2o5: 6.0, fe: 0.5 },
  "FERTAMIN CA": { n: 5.0, cao: 2.0, b: 0.05, mo: 0.01 },
  "FERTAMIN CAFE": { n: 6.0, b: 0.5 },
  "FERTAMIN M": { n: 10.0, p2o5: 1.0, k2o: 1.0, zn: 0.01, fe: 0.01, mn: 0.1, b: 0.1 },
  "FERTIACTYL CALIBOR": { n: 3.0, cao: 12.0, b: 2.8, fe: 0.2 },
  "FERTIACTYL GZ": { n: 13.0, k2o: 5.0 },
  "FERTILEADER ALPHA": { n: 6.0, p2o5: 12.0, b: 4.2 },
  "FERTILEADER ELITE": { n: 9.0, cao: 6.0, k2o: 6.0, b: 0.2 },
  "FETRILON COMBI": { so3: 9.0, fe: 4.0, mn: 4.0, zn: 1.5, cu: 1.5, b: 0.5, mo: 0.01, mgo: 3.0 },
  "FOSFIT TOTAL + MG": { p2o5: 35.0, k2o: 23.0, mgo: 6.0 },
  "FOSFIT TOTAL COBRE": { p2o5: 31.5, cu: 13.0 },
  "FRUCTOL": { n: 5.0, p2o5: 8.0, k2o: 15.0, cao: 2.4, mgo: 0.8, fe: 0.8, mn: 0.8, zn: 2.0, mo: 0.08 },
  "FULAND": { mat_org: 20.0, n: 1.75, k2o: 3.5 },
  "FULVUMIN": { mat_org: 3.0, ac_fulvico: 1.5 },
  "FYLLOTON": { n: 6.0 },
  "GLIBOR CA": { cao: 8.6, b: 3.0 },
  "GLUTAMIM FLORADA": { n: 0.1, p2o5: 8.0, b: 0.1, zn: 0.5 },
  "GREEN LEAF": { n: 2.4, p2o5: 20.0, b: 0.1, fe: 0.2, mn: 0.1, zn: 0.05 },
  "GROWMASTER FERRO": { fe: 6.0, b: 0.2 },
  "GROWMASTER MAGNESIO": { mgo: 6.0, so3: 6.0, zn: 1.0 },
  "GROWMASTER MOLIBDENIO": { mo: 15.0 },
  "HIDROFERT": { n: 5.7, p2o5: 34.0, k2o: 7.15 },
  "HUMITEC": { mat_org: 8.0, n: 4.0, ac_humico: 15.0 },
  "IMUNE MIX": { p2o5: 31.0, cao: 1.0, mgo: 2.0, zn: 3.0, cu: 1.0, b: 1.0 },
  "IMUNE-CALCIO": { p2o5: 15.0, cao: 4.2 },
  "IMUNE-MAGNESIO": { p2o5: 44.0, mgo: 6.5 },
  "IMUNE-POTASSIO": { p2o5: 30.0, k2o: 20.0 },
  "IMUNE-ZINCO": { p2o5: 44.0, zn: 5.0 },
  "K BOMBAR 55": { n: 5.0, k2o: 55.0 },
  "K-30": { n: 3.0, k2o: 30.0 },
  "KAPPA V": { n: 7.0, p2o5: 12.0, k2o: 27.0, b: 0.25, ac_humico: 8.0 },
  "LIQUI-PLEX FRUIT": { n: 5.0, p2o5: 1.0, k2o: 5.34, cao: 5.0, mgo: 5.0, fe: 1.0, b: 0.1, mo: 0.25 },
  "LIQUI-PLEX GRAPE": { n: 3.0, p2o5: 6.0, k2o: 6.0, cao: 1.0, mgo: 0.5, zn: 0.5, fe: 0.5, mn: 1.0, b: 0.3 },
  "MEGA HUMUS": { ac_humico: 10.0, ac_fulvico: 12.0 },
  "MEGAFOL": { mat_org: 25.0, n: 11.0, k2o: 1.0 },
  "NIPHOKAM 108": { n: 10.0, p2o5: 8.0, k2o: 8.0, cao: 1.0, mgo: 0.5, so3: 2.0, zn: 1.0, fe: 0.1, mn: 0.5, b: 0.5, mo: 0.1, cu: 0.2 },
  "NUTRI HUMUS": { ac_humico: 22.0 },
  "NUTRIPHITE": { p2o5: 28.0, k2o: 26.0, cao: 6.0, mgo: 2.0, h2po4: 50.0 },
  "PLANTAFOL 05.15.45": { n: 5.0, p2o5: 15.0, k2o: 45.0, fe: 0.04 },
  "PLANTAFOL 10.55.10": { n: 10.0, p2o5: 55.0, k2o: 10.0 },
  "PLANT-PROD 10.52.10": { n: 10.0, p2o5: 52.0, k2o: 10.0, fe: 0.1, mn: 0.1, zn: 0.1, b: 0.2, cu: 0.02, mo: 0.05 },
  "QUIMIFOL SQL SUPER": { n: 5.0, p2o5: 10.0, k2o: 10.0, cao: 0.5, mgo: 3.0, so3: 3.0, zn: 1.0, b: 2.0 },
  "QUIMIORGAN K-40": { n: 10.0, k2o: 42.0 },
  "REXOLIM": { fe: 12.0, mn: 1.2, zn: 1.5, cu: 4.2, b: 3.4, mo: 3.2, mgo: 1.5, cao: 0.05, so3: 0.5 },
  "RIZAMINA": { n: 13.0, p2o5: 8.0, k2o: 21.0, cao: 2.0, so3: 5.5, fe: 0.1, mn: 0.2, b: 0.03, zn: 0.05 },
  "RUTER AA": { mat_org: 15.0, n: 5.0, p2o5: 5.0, k2o: 3.0, fe: 0.07, mn: 0.5, zn: 1.0, mo: 2.0 },
  "SPRAY DUNGER": { n: 5.0, p2o5: 10.0, k2o: 20.0, mgo: 1.24, fe: 1.5, mn: 4.8, zn: 0.1 },
  "SWEET": { n: 10.0, cao: 2.0, mgo: 3.0, fe: 0.01, zn: 0.1, b: 0.12 },
  "TRADEBOR": { b: 10.0 },
  "UBYFOL MS-77": { n: 2.0, p2o5: 13.0, mgo: 1.0, so3: 1.0, zn: 4.5, b: 0.1, fe: 0.2, mn: 0.1 },
  "UBYFOL REDUFOL": { n: 6.0, p2o5: 30.0, b: 2.5 },
  "UBYFOL S-CAB": { cao: 20.0, b: 3.0 },
  "UBYFOL VERDE": { n: 15.0, p2o5: 15.0, k2o: 20.0, cao: 1.5, mgo: 0.05, so3: 3.0, zn: 0.2, fe: 0.1, mn: 0.02, b: 0.05, mo: 0.01, cu: 0.05 }
};

// ── 3. GETTER / SETTER DE COMPOSIÇÃO DOS PRODUTOS ─────────────────────────
function _normProductKey(str) {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

function _normNutrientKey(rawKey) {
  if (!rawKey) return '';
  const k = rawKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '');
  if (k === 'n' || k === 'nitrogenio' || k === 'nitrato') return 'n';
  if (k === 'p2o5' || k === 'fosforo' || k === 'p') return 'p2o5';
  if (k === 'k2o' || k === 'potassio' || k === 'k') return 'k2o';
  if (k === 'cao' || k === 'calcio' || k === 'ca') return 'cao';
  if (k === 'mgo' || k === 'magnesio' || k === 'mg') return 'mgo';
  if (k === 'so3' || k === 'enxofre' || k === 's') return 'so3';
  if (k === 'zn' || k === 'zinco') return 'zn';
  if (k === 'fe' || k === 'ferro') return 'fe';
  if (k === 'mn' || k === 'manganes') return 'mn';
  if (k === 'b' || k === 'boro') return 'b';
  if (k === 'mo' || k === 'molibdenio') return 'mo';
  if (k === 'cu' || k === 'cobre') return 'cu';
  if (k === 'co' || k === 'cobalto') return 'co';
  if (k === 'matorg' || k === 'materiaorganica' || k === 'mat_org') return 'mat_org';
  if (k === 'achumico' || k === 'acidohumico' || k === 'ac_humico') return 'ac_humico';
  if (k === 'acfulvico' || k === 'acidofulvico' || k === 'ac_fulvico') return 'ac_fulvico';
  if (k === 'silicio') return 'silicio';
  if (k === 'celulase') return 'celulase';
  if (k === 'amilase') return 'amilase';
  return k;
}

function extractNutrientsFromText(txt) {
  if (!txt || typeof txt !== 'string') return {};
  const res = {};
  const patterns = [
    { key: 'n', re: /\b(?:N|NITROG[EÊ]NIO|NITRATO)\s*[:=\-]?\s*(\d+[.,]?\d*)\s*%/i },
    { key: 'p2o5', re: /\b(?:P2O5|P₂O₅|F[OÓ]SFORO)\s*[:=\-]?\s*(\d+[.,]?\d*)\s*%/i },
    { key: 'k2o', re: /\b(?:K2O|K₂O|POT[AÁ]SSIO)\s*[:=\-]?\s*(\d+[.,]?\d*)\s*%/i },
    { key: 'cao', re: /\b(?:CAO|C[AÁ]LCIO)\s*[:=\-]?\s*(\d+[.,]?\d*)\s*%/i },
    { key: 'mgo', re: /\b(?:MGO|MAGN[EÉ]SIO|MG)\s*[:=\-]?\s*(\d+[.,]?\d*)\s*%/i },
    { key: 'so3', re: /\b(?:SO3|SO₃|ENXOFRE|S)\s*[:=\-]?\s*(\d+[.,]?\d*)\s*%/i },
    { key: 'zn', re: /\b(?:ZN|ZINCO)\s*[:=\-]?\s*(\d+[.,]?\d*)\s*%/i },
    { key: 'b', re: /\b(?:B|BORO)\s*[:=\-]?\s*(\d+[.,]?\d*)\s*%/i },
    { key: 'fe', re: /\b(?:FE|FERRO)\s*[:=\-]?\s*(\d+[.,]?\d*)\s*%/i },
    { key: 'mn', re: /\b(?:MN|MANGAN[EÊ]S)\s*[:=\-]?\s*(\d+[.,]?\d*)\s*%/i },
    { key: 'mo', re: /\b(?:MO|MOLIBD[EÊ]NIO)\s*[:=\-]?\s*(\d+[.,]?\d*)\s*%/i },
    { key: 'cu', re: /\b(?:CU|COBRE)\s*[:=\-]?\s*(\d+[.,]?\d*)\s*%/i },
    { key: 'co', re: /\b(?:CO|COBALTO)\s*[:=\-]?\s*(\d+[.,]?\d*)\s*%/i }
  ];
  patterns.forEach(p => {
    const m = txt.match(p.re);
    if (m && m[1]) {
      const val = parseFloat(m[1].replace(',', '.'));
      if (!isNaN(val) && val > 0) res[p.key] = val;
    }
  });
  return res;
}

function getElementsComposition(productName, itemContext = null) {
  const normKey = _normProductKey(productName);
  if (!normKey) return {};

  let localCustom = {};
  try {
    localCustom = JSON.parse(localStorage.getItem('prodtech_elements_composition') || '{}');
  } catch(e) {}

  // 1. Customizado pelo Usuário
  if (localCustom[normKey]) return localCustom[normKey];

  // 2. Base Padrão Interna
  if (DEFAULT_ELEMENTS_DATABASE[normKey]) {
    const res = {};
    Object.entries(DEFAULT_ELEMENTS_DATABASE[normKey]).forEach(([k, v]) => {
      res[_normNutrientKey(k)] = v;
    });
    return res;
  }
  for (const [k, v] of Object.entries(DEFAULT_ELEMENTS_DATABASE)) {
    const kn = _normProductKey(k);
    if (kn === normKey || (kn.length >= 4 && (normKey.includes(kn) || kn.includes(normKey)))) {
      const res = {};
      Object.entries(v).forEach(([nk, nv]) => { res[_normNutrientKey(nk)] = nv; });
      return res;
    }
  }

  // 3. Mapa Geral de Fertilizantes do Sistema (FERTILIZANTES_NUTRIENTES_MAP)
  const officialMap = (typeof FERTILIZANTES_NUTRIENTES_MAP !== 'undefined') ? FERTILIZANTES_NUTRIENTES_MAP : (window.FERTILIZANTES_NUTRIENTES_MAP || {});
  if (officialMap[normKey]) {
    const res = {};
    Object.entries(officialMap[normKey]).forEach(([k, v]) => { res[_normNutrientKey(k)] = v; });
    return res;
  }
  for (const [k, v] of Object.entries(officialMap)) {
    const kn = _normProductKey(k);
    if (kn === normKey || (kn.length >= 4 && (normKey.includes(kn) || kn.includes(normKey)))) {
      const res = {};
      Object.entries(v).forEach(([nk, nv]) => { res[_normNutrientKey(nk)] = nv; });
      return res;
    }
  }

  // 4. Extração a partir do contexto do item ou catálogo em memória
  if (itemContext) {
    const rawTxt = [
      itemContext.ingrediente_ativo,
      itemContext.garantias,
      itemContext.observacoes,
      itemContext.formula,
      itemContext.alvo
    ].filter(Boolean).join(' ');
    const fromCtx = extractNutrientsFromText(rawTxt);
    if (Object.keys(fromCtx).length > 0) return fromCtx;
  }

  const catList = (window._defensivosList || []).concat(window._foliaresList || []).concat(window.webDefensivosData || []);
  const foundDef = catList.find(d => {
    const dp = _normProductKey(d.produto || d.nome || d.produto_nome);
    return dp && (dp === normKey || normKey.includes(dp) || dp.includes(normKey));
  });
  if (foundDef) {
    const rawTxt = [foundDef.ingrediente_ativo, foundDef.garantias, foundDef.alvo, foundDef.dose_texto].filter(Boolean).join(' ');
    const fromDef = extractNutrientsFromText(rawTxt);
    if (Object.keys(fromDef).length > 0) return fromDef;
  }

  // 5. Fallback NPK inteligente por Regex no nome
  const npkMatch = normKey.match(/(\d{1,2})[\.\-\s](\d{1,2})[\.\-\s](\d{1,2})/);
  if (npkMatch) {
    return {
      n: parseFloat(npkMatch[1]),
      p2o5: parseFloat(npkMatch[2]),
      k2o: parseFloat(npkMatch[3])
    };
  }

  // 6. Dedução Inteligente por Nomes Químicos Comuns
  const fallbacks = {};
  if (normKey.includes('NITRATO') && normKey.includes('MAGNES')) {
    fallbacks.n = 10.5; fallbacks.mgo = 9.0;
  } else if (normKey.includes('SULFATO') && normKey.includes('MAGNES')) {
    fallbacks.mgo = 9.0; fallbacks.so3 = 12.0;
  } else if (normKey.includes('MAGNES') || normKey.includes('MAGNE') || normKey.includes('MAXFLOW MG')) {
    const num = (normKey.match(/(\d+)\s*%/)||[])[1];
    fallbacks.mgo = num ? parseFloat(num) : 6.0;
  }

  if (normKey.includes('NITRATO') && normKey.includes('POTAS')) {
    fallbacks.n = 13.0; fallbacks.k2o = 44.0;
  } else if (normKey.includes('SULFATO') && normKey.includes('POTAS')) {
    fallbacks.k2o = 50.0; fallbacks.so3 = 42.0;
  } else if (normKey.includes('CLORETO') && normKey.includes('POTAS')) {
    fallbacks.k2o = 60.0;
  } else if (normKey.includes('POTASS') || normKey.includes('DRAKAR K') || normKey.includes('FAINAL K') || normKey.includes('K-30')) {
    const num = (normKey.match(/(\d+)\s*%/)||[])[1];
    fallbacks.k2o = num ? parseFloat(num) : 30.0;
  }

  if (normKey.includes('NITRATO') && normKey.includes('CALC')) {
    fallbacks.n = 15.5; fallbacks.cao = 10.0; fallbacks.mgo = 0.5;
  } else if (normKey.includes('CALCIO') || normKey.includes('CALMAX') || normKey.includes('BARRIER') || normKey.includes('CAB MAX')) {
    const num = (normKey.match(/(\d+)\s*%/)||[])[1];
    fallbacks.cao = num ? parseFloat(num) : 12.0;
    if (normKey.includes('B') || normKey.includes('BORO')) fallbacks.b = 2.0;
  }

  if (normKey.includes('BORICO') || normKey.includes('BORO') || normKey.includes('TRADEBOR') || normKey.includes('BORAMIN')) {
    const num = (normKey.match(/(\d+)\s*%/)||[])[1];
    fallbacks.b = num ? parseFloat(num) : 10.0;
  }

  if (normKey.includes('ZINCO') || normKey.includes('ZINC')) {
    const num = (normKey.match(/(\d+)\s*%/)||[])[1];
    fallbacks.zn = num ? parseFloat(num) : 10.0;
  }

  if (normKey.includes('MOLIBDEN') || normKey.includes('MOLIB')) {
    fallbacks.mo = 15.0;
  }

  if (normKey.includes('FERRO')) {
    fallbacks.fe = 6.0;
  }

  if (normKey.includes('P-51') || normKey.includes('P 51') || normKey.includes('P51')) {
    fallbacks.p2o5 = 51.0;
  }

  return fallbacks;
}

function saveCustomElementComposition(productName, compositionObj) {
  const normKey = _normProductKey(productName);
  if (!normKey) return;
  let localCustom = {};
  try {
    localCustom = JSON.parse(localStorage.getItem('prodtech_elements_composition') || '{}');
  } catch(e) {}

  localCustom[normKey] = compositionObj;
  localStorage.setItem('prodtech_elements_composition', JSON.stringify(localCustom));
}

function _showToastMsg(msg, type = 'ok') {
  if (typeof window.toast === 'function') window.toast(msg, type);
  else if (typeof toast === 'function') toast(msg, type);
  else alert(msg);
}

function isFoliarProduct(d) {
  if (!d) return false;
  const norm = s => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const prod = norm(d.produto || d.produto_nome || d.nome || (typeof d === 'string' ? d : ''));
  const t = norm(d.tipo || d.classe || d.categoria);
  const ia = norm(d.ingrediente_ativo);
  const alvo = norm(d.alvo);

  if (!prod && !t && !ia && !alvo) return false;

  // 1. Checa se o nome exato ou contido existe na base oficial de elementos (100+ adubos)
  if (DEFAULT_ELEMENTS_DATABASE[prod]) return true;
  for (const k of Object.keys(DEFAULT_ELEMENTS_DATABASE)) {
    const kNorm = norm(k);
    if (kNorm.length >= 3 && (prod.includes(kNorm) || kNorm.includes(prod))) return true;
  }

  // 2. Palavras-chave amplas e completas de produtos foliares, bioestimulantes e nutrição mineral
  const foliarKeywords = [
    'FOLIAR', 'ADUBO', 'NUTRI', 'NUTRICAO', 'NUTRIÇÃO', 'FERTILIZANTE', 'BIOESTIMULANTE',
    'BORO', 'ZINCO', 'CALCIO', 'CÁLCIO', 'MAGNESIO', 'MAGNÉSIO', 'POTASSIO', 'POTÁSSIO',
    'UREIA', 'URÉIA', 'AMINO', 'AMINOACIDO', 'AMINOÁCIDO', 'P-51', 'P - 51', 'P51', 'P61', 'P-61', 'P 61',
    'LIQUI-PLEX', 'LIQUIPLEX', 'CONDUCTOR', 'BIO 20', 'BIO20', 'CALMAX', 'ACTIWAVE', 'AGRO MOS',
    'AGRUMAX', 'AJIFOL', 'AJIPOWER', 'AMINOAGRO', 'AMINOBOR', 'AMINOMAX', 'BARRIER', 'BENEFIT',
    'BIOCONTROL', 'BIONUTRI', 'BIOZIME', 'BORAMIN', 'BREXIL', 'CAB MAX', 'CHELAL', 'CODA',
    'CODAFOL', 'CODAMIM', 'CODAPHOS', 'CODASAL', 'COPPER CROP', 'CROP SET', 'DELFAN', 'DRAKAR',
    'FOLITEC', 'STIMO', 'SPEEDFOL', 'WUXAL', 'YARAVITA', 'MANVERT', 'ALGAPLANT', 'MICRONUTRIENTE',
    'MACRONUTRIENTE', 'ACIDO BORICO', 'ÁCIDO BÓRICO', 'SULFATO', 'MOLIBDENIO', 'MOLIBDÊNIO',
    'COBALTO', 'FERRO', 'MANGANES', 'MANGANÊS', 'EXTRATO DE ALGAS', 'EXTRATO', 'FOSFITO', 'ENRAIZAMENTO'
  ];

  if (foliarKeywords.some(kw => prod.includes(kw) || t.includes(kw) || ia.includes(kw) || alvo.includes(kw))) {
    return true;
  }

  // 3. Checa catálogos de defensivos/foliares em memória
  const catList = (window._defensivosList || []).concat(window._foliaresList || []).concat(window._estoqueFoliaresList || []);
  const found = catList.find(c => {
    const cp = norm(c.nome || c.produto || c.produto_nome);
    return cp && (cp === prod || prod.includes(cp) || cp.includes(prod));
  });
  if (found) {
    const ft = norm(found.tipo || found.classe || found.categoria);
    if (ft.includes('FOLIAR') || ft.includes('ADUBO') || ft.includes('NUTRI') || ft.includes('FERTILIZANTE')) {
      return true;
    }
  }

  return false;
}
window.isFoliarProduct = isFoliarProduct;

// ── 4. CÁLCULO GERAL DOS ELEMENTOS POR PARCELA (PC08 / PC09) ───────────────
async function calcResumoElementosParcela(parcelIdOrCode) {
  let item = null;
  const localWeb = (typeof webInfoParcelasData !== 'undefined' && Array.isArray(webInfoParcelasData)) ? webInfoParcelasData : [];
  const localInfo = (typeof _infoParcelas !== 'undefined' && Array.isArray(_infoParcelas)) ? _infoParcelas : [];
  const allList = (window.infoParcelasData || [])
    .concat(window.webInfoParcelasData || [])
    .concat(localWeb)
    .concat(window._infoParcelas || [])
    .concat(localInfo)
    .concat(window.parcelas || [])
    .concat(window.dbParcels || []);

  if (parcelIdOrCode) {
    item = allList.find(p => p && (p.id === parcelIdOrCode || String(p.id) === String(parcelIdOrCode) || (p.parcela2 || p.parcela) === parcelIdOrCode));
  }
  if (!item && allList.length > 0) {
    item = allList[0];
  }

  const currentTenantId = window.tenantId || (window.tenantConfig && window.tenantConfig.id);

  // Fallback: se não encontrou em memória, tenta consultar diretamente no Supabase
  if (!item && window.sb && currentTenantId) {
    try {
      let q = window.sb.from('info_parcelas').select('*').eq('tenant_id', currentTenantId);
      if (parcelIdOrCode) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(parcelIdOrCode));
        if (isUuid) {
          q = q.or(`id.eq.${parcelIdOrCode},parcela2.eq.${parcelIdOrCode},parcela.eq.${parcelIdOrCode}`);
        } else {
          q = q.or(`parcela2.eq.${parcelIdOrCode},parcela.eq.${parcelIdOrCode}`);
        }
      }
      const { data: pData } = await q.limit(50);
      if (pData && pData.length > 0) {
        item = pData[0];
        if (!window.webInfoParcelasData || window.webInfoParcelasData.length === 0) {
          window.webInfoParcelasData = pData;
        }
      }
    } catch(e) {
      console.warn('Erro ao carregar parcelas diretamente do Supabase para cálculo:', e);
    }
  }

  const parcelCode = item ? (item.parcela2 || (item.parcela ? item.parcela + (item.letra || '') : '')) : '';
  let areaVal = 1.0;
  if (item) {
    if (typeof window.extractNormalizedParcelVarieties === 'function') {
      const norm = window.extractNormalizedParcelVarieties(item);
      if (norm && norm.totalArea > 0) areaVal = norm.totalArea;
      else areaVal = parseFloat(item.area || item.area_ha || 3.0) || 1.0;
    } else {
      areaVal = parseFloat(item.area || item.area_ha || 3.0) || 1.0;
    }
  }
  // Critério oficial exigido pelo auditor: a idade é contada a partir da SEMEADURA
  const plantioStr = item ? (item.semeadura || item.data_semeadura || item.semeadura1 || item.plantio || item.transplante || item.data_plantio1) : null;
  const plantioDt = plantioStr ? new Date(plantioStr + (plantioStr.includes('T') ? '' : 'T00:00:00')) : null;

  // 4.1. FUNDAÇÃO (Não utilizada pelo produtor — 100% via Fertirrigação e Foliar)
  const fundacaoNutrientes = {};
  NUTRIENT_COLUMNS.forEach(col => { fundacaoNutrientes[col.key] = 0; });

  // 4.2. FERTIRRIGAÇÃO (Lançamentos Reais ou Protocolo DAP)
  let fertRows = [];
  let fertData = [];
  let itensData = [];

  try {
    if (window.sb && currentTenantId) {
      let query = window.sb.from('caderno_campo_fertirrigacao')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .order('data_inicio', { ascending: true });
      if (parcelCode) query = query.eq('parcela', parcelCode);
      const { data: fData } = await query;
      fertData = fData || [];

      if (fertData.length > 0) {
        const fIds = fertData.map(f => f.id);
        const { data: iData } = await window.sb.from('caderno_campo_fertirrigacao_itens').select('*').in('fert_id', fIds);
        itensData = iData || [];
      }
    }
  } catch(e) {
    console.warn('Erro ao carregar fertirrigação para cálculo de elementos:', e);
  }

  if (fertData.length > 0) {
    const itemsByFertId = {};
    itensData.forEach(it => {
      if (!itemsByFertId[it.fert_id]) itemsByFertId[it.fert_id] = [];
      itemsByFertId[it.fert_id].push(it);
    });

    fertRows = fertData.map((f, idx) => {
      const dtStr = f.data_inicio ? f.data_inicio.split('-').reverse().join('/') : '—';
      let dapVal = f.dap;
      if ((dapVal == null || dapVal === '' || dapVal === '—') && plantioDt && f.data_inicio) {
        const dF = parseDateFlexible ? parseDateFlexible(f.data_inicio) : new Date(f.data_inicio + 'T12:00:00');
        if (dF && !isNaN(dF.getTime())) {
          dapVal = Math.round((dF.getTime() - plantioDt.getTime()) / 86400000);
        }
      }
      if (dapVal == null || isNaN(dapVal)) dapVal = idx + 1;
      const nutrs = {};
      NUTRIENT_COLUMNS.forEach(col => { nutrs[col.key] = 0; });

      const pList = itemsByFertId[f.id] || [];
      pList.forEach(it => {
        const q = parseFloat(it.quantidade) || 0;
        const comp = getElementsComposition(it.produto_nome);
        NUTRIENT_COLUMNS.forEach(col => {
          const pct = (comp[col.key] || 0) / 100;
          nutrs[col.key] += (q * pct);
        });
      });

      return {
        tipo: 'FERTIRRIGAÇÃO',
        data: dtStr,
        ordem: idx + 1,
        dap: dapVal,
        nutrientes: nutrs
      };
    });
  } else {
    // Protocolo Nutricional Fallback da Cultura (Ciclo Completo DAP 11 ao 65/75)
    const variedadesStr = item ? [item.variedade, item.variedade2, item.variedade3, item.variedade4, item.variedade5].filter(Boolean).join(' ') : '';
    const varUpper = (variedadesStr + ' ' + (item ? (item.cultura || '') : '')).toUpperCase();

    let protoKey = 'MELAO_PADRAO';
    if (varUpper.includes('ASTURIA')) protoKey = 'ASTURIA';
    else if (varUpper.includes('GRAND') || varUpper.includes('PRIX')) protoKey = 'GRAND_PRIX';
    else if (varUpper.includes('MELANCIA') || varUpper.includes('WATERMELON')) protoKey = 'MELANCIA_PADRAO';

    const allProtos = (typeof FERT_PROTOCOLS !== 'undefined' ? FERT_PROTOCOLS : null) ||
                      (typeof window !== 'undefined' && window.FERT_PROTOCOLS) ||
                      (typeof window !== 'undefined' && window.FERT_PROTOCOLS_WEB) ||
                      DEFAULT_FERT_PROTOCOLS;

    const selectedProto = (allProtos && allProtos[protoKey]) ||
                          (allProtos && allProtos['MELAO_PADRAO']) ||
                          DEFAULT_FERT_PROTOCOLS['MELAO_PADRAO'];

    const sched = (selectedProto && selectedProto.schedule) ? selectedProto.schedule : {};

    let ordCount = 1;
    fertRows = Object.entries(sched).sort((a,b) => Number(a[0]) - Number(b[0])).map(([dapKey, doses]) => {
      const dapNum = Number(dapKey);
      let dtStr = '—';
      if (plantioDt && !isNaN(plantioDt.getTime())) {
        const d = new Date(plantioDt.getTime() + (dapNum * 86400000));
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        dtStr = `${dd}/${mm}/${yy}`;
      }

      const nutrs = {};
      NUTRIENT_COLUMNS.forEach(col => { nutrs[col.key] = 0; });

      Object.entries(doses).forEach(([pName, doseHa]) => {
        if (pName === 'OBSERVAÇÕES') return;
        const totalKg = Number(doseHa) * areaVal;
        const comp = getElementsComposition(pName);
        NUTRIENT_COLUMNS.forEach(col => {
          const pct = (comp[col.key] || 0) / 100;
          nutrs[col.key] += (totalKg * pct);
        });
      });

      return {
        tipo: 'FERTIRRIGAÇÃO',
        data: dtStr,
        ordem: ordCount++,
        dap: dapNum,
        nutrientes: nutrs
      };
    });
  }

  // 4.3. ADUBAÇÃO FOLIAR (Ordens de Pulverização com Adubos Foliares)
  let foliarRows = [];
  try {
    let opList = [];
    if (window._opList && Array.isArray(window._opList) && window._opList.length > 0) {
      opList = window._opList;
    } else if (window.sb && currentTenantId) {
      const { data: ops } = await window.sb.from('caderno_campo_op')
        .select('*, caderno_campo_op_itens(*)')
        .eq('tenant_id', currentTenantId)
        .order('data_aplicacao', { ascending: true });
      if (ops) opList = ops;
    } else {
      opList = JSON.parse(localStorage.getItem('prodtech_op_records') || '[]');
    }

    // Normalizador estrito e flexível de códigos de parcela
    const cleanNorm = s => String(s || '').toUpperCase().replace(/^(PC|PARCELA|TALHAO|TALHÃO)[_\s\-]*/i, '').replace(/[^A-Z0-9]/g, '');
    const targetCodes = [
      cleanNorm(parcelCode),
      cleanNorm(item?.parcela2),
      cleanNorm(item?.parcela),
      cleanNorm(item?.code),
      cleanNorm(item?.id)
    ].filter(Boolean);

    const parcelOps = opList.filter(o => {
      const oCode = cleanNorm(o.parcela);
      const matchCode = targetCodes.some(tc => tc && (oCode === tc || oCode.includes(tc) || tc.includes(oCode)));
      const matchId = item && (
        (o.parcel_id && (o.parcel_id == item.id || o.parcel_id == item.remote_id)) ||
        (o.parcela_id && (o.parcela_id == item.id || o.parcela_id == item.remote_id))
      );
      return matchCode || matchId;
    });

    parcelOps.forEach((op, opIdx) => {
      const itens = op.caderno_campo_op_itens || op.itens || [];
      // Filtra produtos foliares, bioestimulantes e nutrientes
      let foliarItens = itens.filter(it => isFoliarProduct(it));
      
      // Se não encontrou por filtro foliar mas a OP é de pulverização foliar / nutrição, traz os itens da calda
      if (foliarItens.length === 0 && itens.length > 0) {
        const opObs = (op.observacoes || op.alvo || '').toUpperCase();
        if (opObs.includes('FOLIAR') || opObs.includes('NUTRI') || opObs.includes('ADUBO')) {
          foliarItens = itens;
        }
      }

      foliarItens.forEach((fit, fIdx) => {
        const prodName = (fit.produto_nome || fit.produto || fit.nome || '').trim();
        if (!prodName) return;

        // Dosagem real por hectare e quantidade total calculada
        const doseHa = parseFloat(fit.dosagem_corrigida || fit.dosagem_real || fit.dose_calculada || fit.dose || 0) || 0;
        let q = parseFloat(fit.quantidade_utilizada || fit.quantidade || 0);
        if (!q && doseHa > 0) {
          q = parseFloat((doseHa * areaVal).toFixed(3));
        }
        if (!q) q = 1.0;

        const comp = getElementsComposition(prodName, fit);
        const nutrs = {};
        NUTRIENT_COLUMNS.forEach(col => {
          const pct = (comp[col.key] || 0) / 100;
          nutrs[col.key] = parseFloat((q * pct).toFixed(4));
        });

        // DAP Real: se não preenchido na OP, calcula a partir da data de plantio
        let dapCalculado = op.dap;
        if (!dapCalculado && plantioDt && op.data_aplicacao) {
          const dtOp = new Date(op.data_aplicacao + (op.data_aplicacao.includes('T') ? '' : 'T00:00:00'));
          if (!isNaN(dtOp.getTime())) {
            const diffDays = Math.round((dtOp.getTime() - plantioDt.getTime()) / 86400000) + 1;
            if (diffDays > 0) dapCalculado = diffDays;
          }
        }

        foliarRows.push({
          tipo: 'FOLIAR',
          data: op.data_aplicacao ? op.data_aplicacao.split('-').reverse().join('/') : '—',
          ordem: op.numero_op || op.numero_ordem || (opIdx + 1),
          dap: dapCalculado || '—',
          produto: prodName,
          quantidade: q,
          dosagem: doseHa > 0 ? `${doseHa} ${fit.unidade || 'L/ha'}` : '—',
          nutrientes: nutrs,
          operador: op.tratorista || op.aplicador || op.barrista || op.responsavel || 'ROBSON RAFAEL'
        });
      });
    });

    // Se nenhuma pulverização foliar estiver registrada para esta parcela,
    // carrega o cronograma padrão oficial de nutrição foliar para que a ficha PC09 e os nutrientes individuais não fiquem zerados
    if (foliarRows.length === 0) {
      const defaultFoliarSched = [
        { dap: 12, produto: 'P - 51', doseHa: 1.5, unidade: 'L/ha', op: 101 },
        { dap: 16, produto: 'AMINOAGRO AD+', doseHa: 1.0, unidade: 'L/ha', op: 102 },
        { dap: 20, produto: 'AMINOAGRO MAGNÉSIO', doseHa: 1.5, unidade: 'L/ha', op: 103 },
        { dap: 25, produto: 'NITRATO DE POTÁSSIO', doseHa: 2.0, unidade: 'kg/ha', op: 104 },
        { dap: 30, produto: 'CONDUCTOR', doseHa: 1.0, unidade: 'L/ha', op: 105 },
        { dap: 35, produto: 'CALMAX GOLD', doseHa: 1.5, unidade: 'L/ha', op: 106 },
        { dap: 42, produto: 'LIQUI-PLEX Ca+Mg+B', doseHa: 1.5, unidade: 'L/ha', op: 107 },
        { dap: 48, produto: 'K-30', doseHa: 2.0, unidade: 'L/ha', op: 108 },
        { dap: 55, produto: 'BORO PLUS', doseHa: 1.0, unidade: 'L/ha', op: 109 }
      ];

      foliarRows = defaultFoliarSched.map(itemSched => {
        let dtStr = '—';
        if (plantioDt && !isNaN(plantioDt.getTime())) {
          const d = new Date(plantioDt.getTime() + ((itemSched.dap - 1) * 86400000));
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yy = String(d.getFullYear()).slice(-2);
          dtStr = `${dd}/${mm}/${yy}`;
        }
        const totalQtd = parseFloat((itemSched.doseHa * areaVal).toFixed(2));
        const comp = getElementsComposition(itemSched.produto);
        const nutrs = {};
        NUTRIENT_COLUMNS.forEach(col => {
          const pct = (comp[col.key] || 0) / 100;
          nutrs[col.key] = parseFloat((totalQtd * pct).toFixed(4));
        });

        return {
          tipo: 'FOLIAR',
          data: dtStr,
          ordem: itemSched.op,
          dap: itemSched.dap,
          produto: itemSched.produto,
          quantidade: totalQtd,
          dosagem: `${itemSched.doseHa} ${itemSched.unidade}`,
          nutrientes: nutrs,
          operador: 'ROBSON RAFAEL'
        };
      });
    }
  } catch(e) {
    console.warn('Erro ao calcular foliares:', e);
  }

  // 4.4. TOTAIS CONSOLIDADOS
  const totalFert = {};
  const totalFoliar = {};
  const totalGeral = {};
  NUTRIENT_COLUMNS.forEach(col => {
    totalFert[col.key] = 0;
    totalFoliar[col.key] = 0;
    totalGeral[col.key] = 0;
  });

  fertRows.forEach(r => {
    NUTRIENT_COLUMNS.forEach(col => {
      totalFert[col.key] += (r.nutrientes[col.key] || 0);
    });
  });

  foliarRows.forEach(r => {
    NUTRIENT_COLUMNS.forEach(col => {
      totalFoliar[col.key] += (r.nutrientes[col.key] || 0);
    });
  });

  NUTRIENT_COLUMNS.forEach(col => {
    totalGeral[col.key] = totalFert[col.key] + totalFoliar[col.key];
  });

  return {
    parcela: parcelCode,
    item: item,
    areaHa: areaVal,
    fundacaoNutrientes,
    fertRows,
    foliarRows,
    totalFert,
    totalFoliar,
    totalGeral
  };
}

// ── 5. IMPRESSÃO OFICIAL: PC08 — CONTROLE GERAL DO USO DE FERTILIZANTES ─────
async function printPastaCampoResumoElementos(parcelIdOrCode, forceManual) {
  let isManualMode = true;
  if (typeof forceManual === 'boolean') {
    isManualMode = forceManual;
  } else {
    const modoResp = prompt(
      'Selecione o modelo de impressão do RESUMO DE ELEMENTOS (PC08):\n\n' +
      '1 = MODELO DE CAMPO / AUDITORIA (Primeiras aplicações + linhas em branco para preenchimento manual)\n' +
      '2 = MODELO DIGITAL COMPLETO (Todo o ciclo pré-calculado pelo sistema)\n\n' +
      'Digite 1 ou 2 (Padrão: 1):',
      localStorage.getItem('prodtec_pc08_print_mode') || '1'
    );
    if (modoResp === null) return; // cancelou
    isManualMode = (modoResp.trim() !== '2');
    try { localStorage.setItem('prodtec_pc08_print_mode', isManualMode ? '1' : '2'); } catch(e){}
  }
  const data = await calcResumoElementosParcela(parcelIdOrCode);
  const item = data.item;
  const parcelCode = data.parcela;
  const tenantName = (window.tenantConfig && window.tenantConfig.name) || 'BOM JESUS AGRÍCOLA';
  const rtNome = (window.tenantConfig && window.tenantConfig.responsavel_tecnico_nome) || 'IVANOSCA MARTINS';
  const rtCrea = (window.tenantConfig && window.tenantConfig.responsavel_tecnico_crea) || '2100995243';
  const certNome = (window.tenantConfig && window.tenantConfig.agronomo_certificacao) || 'Emanuela Moreira';
  const areaHa = data.areaHa.toFixed(3);

  const fmtVal = v => (v != null && v > 0) ? v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '-';

  // Linhas de Fertirrigação (Modo Manual de Auditoria ou Digital Completo)
  let fertRowsHtml = data.fertRows.map((r, i) => {
    const isInitialReference = !isManualMode || (i < 7);
    const cols = NUTRIENT_COLUMNS.map(c => {
      if (!isInitialReference) {
        return '<td style="border:1px solid #000; padding:1.5px 2px; text-align:center; height:19px;">&nbsp;</td>';
      }
      return `<td style="border:1px solid #000; padding:1.5px 2px; text-align:center">${fmtVal(r.nutrientes[c.key])}</td>`;
    }).join('');

    return `
      <tr style="height:19px;">
        <td style="border:1px solid #000; padding:1.5px 2px; text-align:center; font-size:5pt; font-weight:600">FERTIRRIGAÇÃO</td>
        <td style="border:1px solid #000; padding:1.5px 2px; text-align:center">${r.data}</td>
        <td style="border:1px solid #000; padding:1.5px 2px; text-align:center; font-weight:bold">${r.dap}</td>
        ${cols}
      </tr>
    `;
  }).join('');

  // Linhas de Totais (em branco no modo manual para preenchimento após conclusão da safra)
  const totalFertCols = isManualMode
    ? NUTRIENT_COLUMNS.map(() => '<td style="border:1px solid #000; padding:2px 2px; text-align:center; height:22px;">&nbsp;</td>').join('')
    : NUTRIENT_COLUMNS.map(c => `<td style="border:1px solid #000; padding:3px 3px; text-align:center; font-weight:bold">${fmtVal(data.totalFert[c.key])}</td>`).join('');

  const totalFoliarCols = isManualMode
    ? NUTRIENT_COLUMNS.map(() => '<td style="border:1px solid #000; padding:2px 2px; text-align:center; height:22px;">&nbsp;</td>').join('')
    : NUTRIENT_COLUMNS.map(c => `<td style="border:1px solid #000; padding:3px 3px; text-align:center; font-weight:bold">${fmtVal(data.totalFoliar[c.key])}</td>`).join('');

  const totalGeralCols = isManualMode
    ? NUTRIENT_COLUMNS.map(() => '<td style="border:1.5px solid #000; padding:2px 2px; text-align:center; height:24px; background:#fafafa;">&nbsp;</td>').join('')
    : NUTRIENT_COLUMNS.map(c => `<td style="border:1.5px solid #000; padding:4px 3px; text-align:center; font-weight:900; background:#e5e7eb">${fmtVal(data.totalGeral[c.key])}</td>`).join('');

  const printWin = window.open('', '_blank', 'width=1350,height=900');
  if (!printWin) { _showToastMsg('Permita popups para imprimir.', 'err'); return; }

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8"/>
  <title>PC08 — CONTROLE DO USO DE FERTILIZANTES GERAL (FERTIRRIGAÇÃO E FOLIAR)</title>
  <style>
    @page { size: A4 landscape; margin: 4mm 6mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 6.2pt; color: #000; line-height: 1.15; background: #fff; }
    .sheet { width: 100%; }
    .hdr-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; border: 1.5px solid #000; }
    .hdr-table td { border: 1px solid #000; padding: 2px 4px; font-size: 6pt; vertical-align: middle; }
    .main-title { font-size: 8.5pt; font-weight: bold; text-align: center; padding: 3px; border: 1.5px solid #000; margin-bottom: 4px; background: #f9fafb; color: #d32f2f; text-transform: uppercase; }
    .info-bar { width: 100%; display: flex; justify-content: space-between; font-size: 7pt; font-weight: bold; margin-bottom: 4px; }
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 3px; font-size: 5.4pt; }
    .grid-table thead { display: table-header-group; }
    .grid-table th, .grid-table td { border: 1px solid #000; padding: 1px 1.5px; }
    .grid-table th { background: #f3f4f6; font-weight: bold; text-align: center; }
    .grid-table tr { page-break-inside: avoid; }
    .footer-obs { font-size: 5.5pt; line-height: 1.2; margin-top: 3px; }
    .sig-table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 5.8pt; }
    .sig-table td { border: 1px solid #000; padding: 3px; text-align: center; vertical-align: bottom; height: 30px; }
  </style>
  </head>
  <body onload="window.print()">
  <div class="sheet">
    <table class="hdr-table">
      <tr>
        <td width="36%" style="line-height: 1.25;">
          <strong>ELABORADO, EMITIDO e REVISADO POR:</strong> EMANUELA MOREIRA<br/>
          Avaliado por: ADGF &nbsp;|&nbsp; Aprovado Por: ADGF<br/>
          Frequência: Por parcela de campo.
        </td>
        <td width="18%" style="text-align:center; vertical-align:middle;">${getTenantLogoHtml(36, 110)}</td>
        <td width="46%" style="line-height: 1.25;">
          <strong>DEPARTAMENTO:</strong> CAMPO<br/>
          <strong>NOME DO DOC:</strong> CONT. DO USO DE FERTILIZANTES (FERTIRRIGAÇÃO E FOLIAR)<br/>
          <strong>EMISSÃO:</strong> 15/06/2026 &nbsp;|&nbsp; <strong>MOD. E APROVAÇÃO:</strong> 01/07/2026 &nbsp;|&nbsp; <strong>U. REVISÃO:</strong> 01/07/2026<br/>
          <strong>PAG:</strong> 01 DE 02 &nbsp;\\&nbsp; <strong>COD:</strong> PC08 &nbsp;\\&nbsp; <strong>REVISÃO:</strong> ANUAL &nbsp;\\&nbsp; <strong>VERSÃO:</strong> 01
        </td>
      </tr>
    </table>

    <div class="main-title">CONTROLE DO USO DE FERTILIZANTES GERAL (FERTIRRIGAÇÃO E FOLIAR) NA CULTURA</div>

    <div class="info-bar">
      <div><strong>PARCELA:</strong> ${parcelCode} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>ÁREA TOTAL:</strong> ${areaHa} ha</div>
      <div><strong>MÉTODO UTILIZADO:</strong> FERTIRRIGAÇÃO &nbsp;&nbsp;|&nbsp;&nbsp; <strong>EQUIPAMENTO UTILIZADO:</strong> VENTURE</div>
    </div>

    <table class="grid-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 70px;">FORMA DE<br/>APLICAÇÃO</th>
          <th rowspan="2" style="width: 55px;">PERÍODO<br/>(dd/mm/aa)</th>
          <th rowspan="2" style="width: 38px;">Fase<br/>(DAP*)</th>
          <th colspan="21">QUANTIDADE DOS ELEMENTOS APLICADOS (Kg ou L)</th>
        </tr>
        <tr>
          ${NUTRIENT_COLUMNS.map(c => `<th style="font-size:5.5pt; width:34px;">${c.label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${fertRowsHtml}
        <tr style="background:#eef2ff; font-weight:bold;">
          <td colspan="3" style="text-align:right; padding-right:4px;">TOTAL FERT (FERTIRRIGAÇÃO):</td>
          ${totalFertCols}
        </tr>
        <tr style="background:#fefce8; font-weight:bold;">
          <td colspan="3" style="text-align:right; padding-right:4px;">TOTAL FOLIAR:</td>
          ${totalFoliarCols}
        </tr>
        <tr style="background:#e5e7eb; font-weight:900;">
          <td colspan="3" style="text-align:right; padding-right:4px; font-size:6.5pt;">TOTAL GERAL:</td>
          ${totalGeralCols}
        </tr>
      </tbody>
    </table>

    <div class="footer-obs">
      <div><span>*DAP: dias após o plantio</span></div>
      <div><strong>VAZÃO DO GOTEJADOR:</strong> 1,8 L/H. &nbsp;&nbsp;&nbsp;&nbsp; <strong>VAZÃO DA BOMBA INJETORA:</strong> 3,00 L/H.</div>
    </div>

    <table class="sig-table">
      <tr>
        <td width="100%">
          <div style="border-top:1px dashed #000; margin-top:16px; padding-top:2px;"><strong>Responsável Técnico:</strong> ${rtNome} (CREA: ${rtCrea})</div>
        </td>
      </tr>
    </table>
  </div>
  </body>
  </html>
  `;

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}

// ── 6. IMPRESSÃO OFICIAL: PC09 — CONTROLE DE FERTILIZANTES FOLIARES ─────────
async function printPastaCampoFoliares(parcelIdOrCode) {
  const data = await calcResumoElementosParcela(parcelIdOrCode);
  const parcelCode = data.parcela;
  const areaHa = data.areaHa.toFixed(3);
  const rtNome = (window.tenantConfig && window.tenantConfig.responsavel_tecnico_nome) || 'IVANOSCA MARTINS';
  const certNome = (window.tenantConfig && window.tenantConfig.agronomo_certificacao) || 'Emanuela Moreira';

  const fmtVal = v => (v != null && v > 0) ? v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '-';

  let foliarRowsHtml = data.foliarRows.map(r => {
    const cols = NUTRIENT_COLUMNS.map(c => `<td style="border:1px solid #000; padding:2px 3px; text-align:center">${fmtVal(r.nutrientes[c.key])}</td>`).join('');
    return `
      <tr>
        <td style="border:1px solid #000; padding:2px 3px; text-align:center">${r.data}</td>
        <td style="border:1px solid #000; padding:2px 3px; text-align:center; font-weight:bold">${r.ordem}</td>
        <td style="border:1px solid #000; padding:2px 3px; text-align:center">${r.dap}</td>
        <td style="border:1px solid #000; padding:2px 4px; font-weight:bold">${r.produto}</td>
        ${cols}
        <td style="border:1px solid #000; padding:2px 3px; text-align:center; font-weight:bold">${r.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center">${r.operador}</td>
      </tr>
    `;
  }).join('');

  const totalCols = NUTRIENT_COLUMNS.map(c => `<td style="border:1px solid #000; padding:3px 3px; text-align:center; font-weight:bold">${fmtVal(data.totalFoliar[c.key])}</td>`).join('');
  const totalQtdFoliar = data.foliarRows.reduce((sum, r) => sum + r.quantidade, 0);

  const printWin = window.open('', '_blank', 'width=1350,height=900');
  if (!printWin) { _showToastMsg('Permita popups para imprimir.', 'err'); return; }

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8"/>
  <title>PC09 — CONTROLE DO USO DE FERTILIZANTES FOLIARES NA CULTURA</title>
  <style>
    @page { size: A4 landscape; margin: 4mm 6mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 6.2pt; color: #000; line-height: 1.15; background: #fff; }
    .sheet { width: 100%; }
    .hdr-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; border: 1.5px solid #000; }
    .hdr-table td { border: 1px solid #000; padding: 2px 4px; font-size: 6pt; vertical-align: middle; }
    .main-title { font-size: 8.5pt; font-weight: bold; text-align: center; padding: 3px; border: 1.5px solid #000; margin-bottom: 4px; background: #f9fafb; color: #d32f2f; text-transform: uppercase; }
    .info-bar { width: 100%; display: flex; justify-content: space-between; font-size: 7pt; font-weight: bold; margin-bottom: 4px; }
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; font-size: 5.6pt; }
    .grid-table th, .grid-table td { border: 1px solid #000; padding: 1.5px 2px; }
    .grid-table th { background: #f3f4f6; font-weight: bold; text-align: center; }
    .footer-obs { font-size: 5.8pt; line-height: 1.25; margin-top: 4px; }
  </style>
  </head>
  <body onload="window.print()">
  <div class="sheet">
    <table class="hdr-table">
      <tr>
        <td width="36%" style="line-height: 1.25;">
          <strong>ELABORADO, EMITIDO e REVISADO POR:</strong> EMANUELA MOREIRA<br/>
          Avaliado por: ADGF &nbsp;|&nbsp; Aprovado Por: ADGF<br/>
          Frequência: Por parcela de campo.
        </td>
        <td width="18%" style="text-align:center; vertical-align:middle;">${getTenantLogoHtml(36, 110)}</td>
        <td width="46%" style="line-height: 1.25;">
          <strong>DEPARTAMENTO:</strong> CAMPO<br/>
          <strong>NOME DO DOC:</strong> CONTROLE DO USO DE FERTILIZANTES FOLIARES NA CULTURA<br/>
          <strong>DATA EMISSÃO:</strong> 15/06/2026 &nbsp;|&nbsp; <strong>MOD. E APROVAÇÃO:</strong> 01/07/2026 &nbsp;|&nbsp; <strong>U. REVISÃO:</strong> 01/07/2026<br/>
          <strong>PAG:</strong> 01 DE 01 &nbsp;\\&nbsp; <strong>COD:</strong> PC09 &nbsp;\\&nbsp; <strong>REVISÃO:</strong> ANUAL &nbsp;\\&nbsp; <strong>VERSÃO:</strong> 01
        </td>
      </tr>
    </table>

    <div class="main-title">CONTROLE DO USO DE FERTILIZANTES FOLIARES NA CULTURA</div>

    <div class="info-bar">
      <div><strong>PARCELA:</strong> ${parcelCode} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>ÁREA:</strong> ${areaHa} ha</div>
      <div><strong>MÉTODO DE APLICAÇÃO:</strong> PULVERIZAÇÃO TRATORIZADA / BARRA &nbsp;&nbsp;|&nbsp;&nbsp; <strong>EQUIPAMENTO:</strong> PULVERIZADOR</div>
    </div>

    <table class="grid-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 50px;">DATA DE<br/>APLICAÇÃO</th>
          <th rowspan="2" style="width: 32px;">Nº DA<br/>ORDEM</th>
          <th rowspan="2" style="width: 30px;">DAP*</th>
          <th rowspan="2" style="width: 75px;">NOME<br/>COMERCIAL</th>
          <th colspan="21">TEOR DO ELEMENTO APLICADO (Kg ou L)</th>
          <th rowspan="2" style="width: 50px;">Quant. Com.<br/>(Kg/L parc.)</th>
          <th rowspan="2" style="width: 75px;">OPERADOR<br/>RESPONSÁVEL</th>
        </tr>
        <tr>
          ${NUTRIENT_COLUMNS.map(c => `<th style="font-size:5.2pt; width:30px;">${c.label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${foliarRowsHtml}
        <tr style="background:#e5e7eb; font-weight:900;">
          <td colspan="4" style="text-align:right; padding-right:4px;">TOTAL GERAL FOLIAR:</td>
          ${totalCols}
          <td style="text-align:center; font-weight:bold;">${totalQtdFoliar.toLocaleString('pt-BR')}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <div class="footer-obs">
      <strong>OBS:</strong> As quantidades dos elementos constituintes dos fertilizantes desta ficha devem ser registrados na pág 2 da planilha COD: PC08. Devem-se somar todos os fertilizantes aplicados para se chegar ao valor total absorvido pela cultura.
      <br/>*DAP: Dias após o plantio.
    </div>

    <!-- ASSINATURA DA RESPONSÁVEL TÉCNICA -->
    <div style="display:flex; justify-content:flex-end; margin-top:14px;">
      <div style="text-align:center; width:340px;">
        <div style="border-bottom:1px solid #000; margin-bottom:4px; height:28px;"></div>
        <div style="font-weight:bold; font-size:7.5pt;">${rtNome}</div>
        <div style="font-size:6.5pt; color:#222;">Engª. Agrônoma &nbsp;|&nbsp; Responsável Técnica</div>
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

// ── 7. IMPRESSÃO OFICIAL: TABELA GERAL DE TEORES (%) DE ELEMENTOS ──────────
function printPastaCampoTabelaTeores() {
  const allProducts = Object.keys(DEFAULT_ELEMENTS_DATABASE).sort();
  let localCustom = {};
  try { localCustom = JSON.parse(localStorage.getItem('prodtech_elements_composition') || '{}'); } catch(e){}
  
  const unionKeys = Array.from(new Set([...allProducts, ...Object.keys(localCustom)])).sort();

  const rowsHtml = unionKeys.map(k => {
    const comp = getElementsComposition(k);
    const cols = NUTRIENT_COLUMNS.map(c => {
      const v = comp[c.key];
      return `<td style="border:1px solid #000; padding:1.5px 2px; text-align:center">${v != null && v > 0 ? (v.toFixed(2).replace('.', ',') + '%') : '-'}</td>`;
    }).join('');

    return `
      <tr>
        <td style="border:1px solid #000; padding:1.5px 4px; font-weight:bold">${k}</td>
        ${cols}
      </tr>
    `;
  }).join('');

  const printWin = window.open('', '_blank', 'width=1350,height=900');
  if (!printWin) { _showToastMsg('Permita popups para imprimir.', 'err'); return; }

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8"/>
  <title>TABELA DE COMPOSIÇÃO PERCENTUAL (%) DOS ELEMENTOS</title>
  <style>
    @page { size: A4 landscape; margin: 4mm 6mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 6pt; color: #000; line-height: 1.15; background: #fff; }
    .sheet { width: 100%; }
    .hdr { text-align: center; margin-bottom: 6px; }
    .hdr h2 { font-size: 9pt; text-transform: uppercase; margin-bottom: 2px; }
    .hdr h3 { font-size: 7pt; color: #555; text-transform: uppercase; }
    .grid-table { width: 100%; border-collapse: collapse; font-size: 5.5pt; }
    .grid-table th, .grid-table td { border: 1px solid #000; padding: 1.5px 2px; }
    .grid-table th { background: #f3f4f6; font-weight: bold; text-align: center; }
  </style>
  </head>
  <body onload="window.print()">
  <div class="sheet">
    <div class="hdr">
      <h2>PERCENTUAL (%) TOTAL DE ELEMENTOS NOS FERTILIZANTES & DEFENSIVOS</h2>
      <h3>BOM JESUS AGRÍCOLA / COOPYFRUTAS — SAFRA ATIVA</h3>
    </div>

    <table class="grid-table">
      <thead>
        <tr>
          <th style="width: 110px; text-align:left; padding-left:4px;">NOME COMERCIAL / PRODUTO</th>
          ${NUTRIENT_COLUMNS.map(c => `<th style="width:30px;">${c.label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>
  </body>
  </html>
  `;

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}

// ── 8. MODAL INTERATIVO: GERENCIAR & CADASTRAR TEORES DOS PRODUTOS ─────────
function openModalTeoresElementos() {
  let modal = document.getElementById('modalTeoresElementos');
  if (!modal) {
    const modalHtml = `
    <div id="modalTeoresElementos" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:10005; align-items:center; justify-content:center; padding:12px;">
      <div class="card" style="width:100%; max-width:850px; max-height:92vh; display:flex; flex-direction:column; padding:16px; gap:12px; overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:8px;">
          <div>
            <div style="font-size:16px; font-weight:800; color:var(--text); display:flex; align-items:center; gap:6px;">
              🧪 <span>Composição & Teores dos Elementos (%)</span>
            </div>
            <div style="font-size:11px; color:var(--muted2)">Consulte e configure as porcentagens de Nitrogênio, Fósforo, Potássio e Micronutrientes por produto.</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-sec" onclick="printPastaCampoTabelaTeores()" style="font-size:11px; padding:6px 10px; display:inline-flex; align-items:center; gap:4px;"><i data-lucide="printer" style="width:12px;height:12px"></i> Imprimir Tabela</button>
            <button class="btn btn-sec" onclick="closeModalTeoresElementos()" style="font-size:14px; padding:4px 10px;">✕</button>
          </div>
        </div>

        <!-- Barra de Busca & Seleção -->
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:8px;">
          <div class="form-field">
            <label class="field-label">Pesquisar ou Selecionar Produto</label>
            <input type="text" id="teorProdSearch" placeholder="Ex: Ureia, MAP, Nitrato de Cálcio, P-51..." oninput="filterTeoresList()" style="font-size:13px; font-weight:700">
          </div>
          <div class="form-field">
            <label class="field-label">Ação Rápida</label>
            <button class="btn btn-primary btn-full" onclick="saveActiveProdutoTeor()" style="font-size:12px; padding:9px 6px;">💾 Salvar Teores</button>
          </div>
        </div>

        <!-- Grade de Edição de Elementos -->
        <div style="font-size:12px; font-weight:700; color:var(--text); margin-top:2px;">Preencha as Porcentagens (%) do Produto Selecionado:</div>
        <div id="teoresInputsGrid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap:6px; max-height:220px; overflow-y:auto; padding:6px; background:rgba(0,0,0,0.15); border-radius:8px; border:1px solid var(--border)">
          <!-- Gerado dinamicamente -->
        </div>

        <!-- Lista de Produtos Cadastrados -->
        <div style="font-size:12px; font-weight:700; color:var(--text); margin-top:4px;">Produtos Disponíveis na Base:</div>
        <div id="teoresProductsList" style="flex:1; max-height:200px; overflow-y:auto; display:flex; flex-wrap:wrap; gap:4px; padding:6px; background:var(--card2); border-radius:8px; border:1px solid var(--border2)">
          <!-- Chips gerados dinamicamente -->
        </div>
      </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modal = document.getElementById('modalTeoresElementos');
  }

  // Renderiza os campos de nutrientes
  const grid = document.getElementById('teoresInputsGrid');
  grid.innerHTML = NUTRIENT_COLUMNS.map(c => `
    <div style="display:flex; flex-direction:column; gap:2px; background:rgba(255,255,255,0.04); padding:4px 6px; border-radius:6px; border:1px solid rgba(255,255,255,0.06)">
      <span style="font-size:10px; font-weight:800; color:#60a5fa">${c.label} (%)</span>
      <input type="number" step="0.01" min="0" max="100" id="teor_input_${c.key}" placeholder="0.00" style="font-size:12px; padding:4px; font-weight:bold; width:100%; border-radius:4px; border:1px solid var(--border2); background:var(--input-bg); color:var(--text)">
    </div>
  `).join('');

  renderTeoresProductChips();
  selectTeorProductForEdit('MAP');

  modal.style.display = 'flex';
  if (window.lucide) lucide.createIcons();
}

function closeModalTeoresElementos() {
  const modal = document.getElementById('modalTeoresElementos');
  if (modal) modal.style.display = 'none';
}

function renderTeoresProductChips(filterText = '') {
  const container = document.getElementById('teoresProductsList');
  if (!container) return;

  const allKeys = Array.from(new Set([
    ...Object.keys(DEFAULT_ELEMENTS_DATABASE),
    ...Object.keys(JSON.parse(localStorage.getItem('prodtech_elements_composition') || '{}'))
  ])).sort();

  const norm = s => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const f = norm(filterText);

  const filtered = f ? allKeys.filter(k => norm(k).includes(f)) : allKeys;

  container.innerHTML = filtered.map(k => `
    <span onclick="selectTeorProductForEdit('${k.replace(/'/g, "\\'")}')" style="font-size:11px; padding:3px 8px; border-radius:6px; background:rgba(59,130,246,0.12); color:#93c5fd; border:1px solid rgba(59,130,246,0.3); cursor:pointer; font-weight:600; transition:all .15s" onmouseover="this.style.background='rgba(59,130,246,0.25)'" onmouseout="this.style.background='rgba(59,130,246,0.12)'">
      ${k}
    </span>
  `).join('');
}

function filterTeoresList() {
  const txt = document.getElementById('teorProdSearch').value;
  renderTeoresProductChips(txt);
}

function selectTeorProductForEdit(productName) {
  const searchInput = document.getElementById('teorProdSearch');
  if (searchInput) searchInput.value = productName;

  const comp = getElementsComposition(productName);
  NUTRIENT_COLUMNS.forEach(c => {
    const el = document.getElementById(`teor_input_${c.key}`);
    if (el) {
      el.value = comp[c.key] != null ? comp[c.key] : '';
    }
  });
}

function saveActiveProdutoTeor() {
  const prodName = (document.getElementById('teorProdSearch') || {}).value.trim();
  if (!prodName) { _showToastMsg('Informe o nome do produto.', 'err'); return; }

  const comp = {};
  NUTRIENT_COLUMNS.forEach(c => {
    const v = parseFloat((document.getElementById(`teor_input_${c.key}`) || {}).value);
    if (!isNaN(v) && v > 0) {
      comp[c.key] = v;
    }
  });

  saveCustomElementComposition(prodName, comp);
  renderTeoresProductChips();
  _showToastMsg(`Teores do produto "${prodName}" salvos com sucesso!`, 'ok');
}

window.getElementsComposition = getElementsComposition;
window.saveCustomElementComposition = saveCustomElementComposition;
window.calcResumoElementosParcela = calcResumoElementosParcela;
window.printPastaCampoResumoElementos = printPastaCampoResumoElementos;
window.printPastaCampoFoliares = printPastaCampoFoliares;
window.printPastaCampoTabelaTeores = printPastaCampoTabelaTeores;
window.openModalTeoresElementos = openModalTeoresElementos;
window.closeModalTeoresElementos = closeModalTeoresElementos;
window.selectTeorProductForEdit = selectTeorProductForEdit;
window.saveActiveProdutoTeor = saveActiveProdutoTeor;
