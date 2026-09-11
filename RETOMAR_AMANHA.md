# 💾 Salvamento de Sessão — Fertirrigação Avançada

**Data:** 10/09/2026 — 07:57  
**Conversa ID:** `524dfe73-5b42-4a28-bcde-5969845af9ca`  
**Status:** ✅ Plano aprovado / pronto para execução

---

## 🎯 O Que Precisa Ser Feito AGORA

### Contexto Completo

O módulo de fertirrigação **existe** no PWA mas é básico (só campos manuais).  
A sessão anterior ficou incompleta por reinicializações do computador.

O objetivo é implementar o módulo **completo e inteligente** com:
1. Seleção de protocolo (variedade)
2. DAP calculado automaticamente pela data de plantio da parcela
3. Sugestão automática de doses com base no DAP × vazão base
4. Aba de histórico de aplicações por parcela
5. SQL de migração das tabelas no Supabase

---

## 📁 Arquivos Chave

| Arquivo | Descrição |
|---|---|
| `campo/index.html` | PWA de campo — módulo de fertirrigação está nas linhas **1806-4072** |
| `scratch/fert_data.json` | Dados extraídos das planilhas .xlsm (4 protocolos completos) |
| `scratch/extract_fert_rules.py` | Script que gerou o fert_data.json |
| `campo/field_migration.sql` | SQL de migração (precisa adicionar tabelas de fertirrigação) |

---

## 📊 Protocolos Disponíveis (do fert_data.json)

4 protocolos extraídos das planilhas Excel:
- `MELAO_PADRAO` — DAP 11 a 65 (Melão padrão, ex: Yellow King)
- `MELANCIA_PADRAO` — DAP 16 a 65
- `ASTURIA` — DAP 11 a 65 (variedade Astúria)
- `GRAND_PRIX` — DAP 11 a ~65 (variedade Grand Prix)

Fertilizantes: `MAP`, `UREIA`, `ACIDO BORICO`, `NIT. CALCIO`, `SULF. MAG.`, `SULF. POTASSIO`, `FERT`, `OBSERVAÇÕES`

O fator na planilha é um **multiplicador × B13** onde B13 é a vazão base (L/h).

---

## 🛠️ Implementação Planejada

### A) campo/index.html — Reformular Tela de Fertirrigação

**O que muda na seção HTML (linha ~1806-1892):**
- Adicionar tabs: "📋 Novo Lançamento" | "📅 Histórico"
- Adicionar campo `<select>` de **Protocolo** (MELAO_PADRAO / MELANCIA_PADRAO / ASTURIA / GRAND_PRIX)
- Adicionar campo **"Vazão Base (L/h)"** — padrão: `200`
- Mostrar card com **DAP calculado automaticamente** (data_plantio da parcela)
- Mostrar card **"Sugestão Automática"** com doses e botão "Aplicar"

**Novas funções JS a criar:**
```
FERT_PROTOCOLS = { ... }  // objeto com dados do fert_data.json embarcados
calcFertDap(parcelaId)     // calcula DAP pela data_plantio da parcela
suggestFertDoses(protocol, dap, vazaoBase)  // retorna doses calculadas
applyFertSuggestion()      // preenche inputs com sugestão
onFertParcelChange()       // ao trocar parcela: recalcula DAP e sugestão
loadFertHistory(parcelaId) // carrega histórico do Supabase
```

**Alterar `saveFertRecord()`:**
- Salvar também: `protocolo`, `dap`, `vazao_base`
- Salvar `sugerido` (valor sugerido) em cada item além do `quantidade` real

### B) campo/field_migration.sql — Adicionar tabelas

```sql
CREATE TABLE IF NOT EXISTS caderno_campo_fertirrigacao (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  parcel_id   BIGINT,
  parcela     TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim    DATE NOT NULL,
  receita     TEXT,
  protocolo   TEXT,   -- MELAO_PADRAO / MELANCIA_PADRAO / ASTURIA / GRAND_PRIX
  dap         INTEGER,
  vazao_base  NUMERIC,
  operador    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS caderno_campo_fertirrigacao_itens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fert_id      UUID NOT NULL REFERENCES caderno_campo_fertirrigacao(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL,
  produto_nome TEXT NOT NULL,
  quantidade   NUMERIC NOT NULL,
  sugerido     NUMERIC,
  unidade      TEXT DEFAULT 'kg',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
-- + RLS policies padrão (tenant_id isolation)
```

---

## ▶️ Para Retomar

1. **Abrir este arquivo** como contexto
2. **Dizer ao agente:** "vamos retomar a implementação do módulo de fertirrigação — o plano está no RETOMAR_AMANHA.md"
3. O agente vai implementar tudo direto no `campo/index.html` + atualizar o SQL

---

## ✅ Checklist de Execução

- [ ] Embutir `FERT_PROTOCOLS` no JS do campo/index.html
- [ ] Reformular HTML da tela de fertirrigação (tabs + protocolo + vazão base + DAP + sugestão)
- [ ] Criar funções: `calcFertDap`, `suggestFertDoses`, `applyFertSuggestion`, `onFertParcelChange`, `loadFertHistory`
- [ ] Atualizar `loadFertSelects()` para incluir protocolo e vazão base
- [ ] Atualizar `saveFertRecord()` para salvar protocolo/dap/vazao_base/sugerido
- [ ] Atualizar `pushFertirrigacao()` para sync offline dos novos campos
- [ ] Adicionar tabelas SQL ao `campo/field_migration.sql`
- [ ] Executar SQL no Supabase
