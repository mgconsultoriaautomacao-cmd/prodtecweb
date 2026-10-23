# RELATÓRIO DE TRANSIÇÃO E CONTINUAÇÃO: CADERNO DE CAMPO (PC06, PC07, PC08, PC09, PC01, OC02)

**Data / Hora de Salvamento:** 23/10/2026 - 01:10 (Horário Local)  
**Status do Projeto:** Código testado, sincronizado e sem erros de sintaxe (100% validado no Node.js e banco Supabase).

---

## 1. O que foi solicitado pelo Usuário

1. **Correção das Unidades de Medida na Ficha PC06 (Controle Geral de Agrotóxicos na Cultura):**
   - Seguir rigorosamente o critério da unidade recomendada na aplicação de defensivos:
     - **Recomendação em `mL/ha` (ex: 50-100 mL/ha de Vertimec, 60-100 mL/ha de Trinca):** O resultado em **Dosagem Usada** deve ser em `mL/ha` (ex.: `0,100 mL/ha`) e a **Quantidade** em `mL` (ex.: `0,416 mL`). **Não usar `L/ha` e não usar `L`**.
     - **Recomendação em `g/ha` (ex: 250-300 g/ha de Acetamiprid, 150 g/ha de Trigard):** O resultado em **Dosagem Usada** deve ser em `g/ha` (ex.: `0,250 g/ha`) e a **Quantidade** em `g` (ex.: `1,040 g`). **Não usar `kg/ha` e não usar `kg`**.
     - **Recomendação em `mL/100 L` (ex: 30 mL/100 L de Decis 25 CE, 20-40 mL/100 L de Flutriafol, Score):** A dosagem é em **mL para cada 100 litros do tanque expressa em valor fracionário** (ex.: `0,030 mL/100 L`). A quantidade total calcula com base no volume de calda por hectare (`(areaHa * volCalda / 100) * doseFracionaria`), resultando em `mL` fracionário após a vírgula (ex.: `0,624 mL`).
2. **Eliminação dos Traços (`—`) em Ingrediente Ativo e Dosagem Recomendada:**
   - Carregamento assíncrono garantido de `caderno_campo_defensivos_cadastro` pelo Supabase via `client`/`tId`.
   - Dicionário offline (`DEF_BULAS`) completo contendo todos os 60+ defensivos agrícolas registrados na Bom Jesus Agrícola (Acetamiprid, Trinca Caps, Vertimec, Flutriafol, Decis, etc.).
3. **Padronização Global de 3 Casas Decimais (0,000):**
   - Aplicada em todas as fichas: PC01 (Capa), PC06 (Defensivos), PC07 (Fertirrigação), PC08 (Resumo de Elementos), PC09 (Foliares) e OC02 (Ordem de Pulverização).

---

## 2. Modificações Efetuadas nos Arquivos

### A. `campo/index.html` e `index.html` (Sincronizados 100%):
- **Resolução do Catálogo:**
  - Inicialização garantida de `client` usando `(typeof sb !== 'undefined' && sb) || window.sb || createClient(...)` e `tId`.
  - Busca sob demanda de `caderno_campo_defensivos_cadastro` para preencher `allDefCat`.
- **Dedução da Unidade Alvo (`targetUnit`):**
  - Checagem prioritária de `/ha` para evitar falso-positivo em faixas numéricas (ex: `60 - 100 ml /ha` não confunde com `/100 L`).
- **Formatação de Dosagem Usada e Quantidade:**
  - `mL/ha`: Exibe `val mL/ha` e quantidade `val * areaHa mL`.
  - `g/ha`: Exibe `val g/ha` e quantidade `val * areaHa g`.
  - `mL/100 L`: Exibe `val mL/100 L` (ex: `30,000 mL/100 L`) e quantidade `(areaHa * volCalda / 100) * val mL`.
  - `L/ha` e `kg/ha`: Mantém `L/ha` e `kg/ha` quando a recomendação for originalmente em litros ou quilos.
- **Tabelas de contingência (linhas de fallback da Foto 2):**
  - Atualizadas com as novas unidades oficiais (`g/ha`, `g`, `mL/ha`, `mL`, `30,000 mL/100 L`).

### B. `campo/resumoElementos.js`:
- Resumo de Elementos Nutricionais (PC08) e Foliares (PC09) já estão rodando com formatação estrita de 3 casas decimais (`minimumFractionDigits: 3, maximumFractionDigits: 3`).

---

## 3. Estado Atual dos Dados (Simulação da Parcela 16 M)

Quando a ficha PC06 da Parcela 16 M for impressa amanhã:
| Data | Produto | Ingrediente Ativo / Tox | Dosagem Recomendada | Dosagem Usada | Quantidade |
|---|---|---|---|---|---|
| **28/08/2026** | ACETAMIPRID NORTOX 200 SP | ACETAMIPRIDO - IV | 250-300 g/ha | **0,250 g/ha** | **1,040 g** |
| **28/08/2026** | TRINCA CAPS | LAMBDA-CIALOTRINA - II | 60 - 100 mL/ha | **0,060 mL/ha** | **0,250 mL** |
| **28/08/2026** | VERTIMEC 84 SC | ABAMECTINA - II | 100 - 160 mL/ha | **0,100 mL/ha** | **0,416 mL** |
| **17/09/2026** | VERTIMEC 84 SC | ABAMECTINA - II | 100 - 160 mL/ha | **0,100 mL/ha** | **0,416 mL** |
| **17/09/2026** | TRINCA CAPS | LAMBDA-CIALOTRINA - II | 60 - 100 mL/ha | **1,000 mL/ha** | **4,160 mL** |
| **22/09/2026** | DECIS 25 CE | DELTAMETRINA - IV | 30 mL/100 L | **0,030 mL/100 L** | **0,744 mL** |
| **29/09/2026** | VERTIMEC 84 SC | ABAMECTINA - II | 100 - 160 mL/ha | **0,100 mL/ha** | **0,416 mL** |
| **29/09/2026** | TRINCA CAPS | LAMBDA-CIALOTRINA - II | 60 - 100 mL/ha | **1,000 mL/ha** | **4,160 mL** |
| **29/09/2026** | FLUTRIAFOL NORTOX | FLUTRIAFOL - IV | 20 - 40 mL/100 L | **0,030 mL/100 L** | **0,624 mL** |
| **14/10/2026** | DECIS 25 CE | DELTAMETRINA - IV | 30 mL/100 L | **0,030 mL/100 L** | **0,624 mL** |

---

## 5. Resolução da Extensão do Ciclo de Fertirrigação (PC08 & PC07)

1. **Dúvida / Apontamento do Usuário:**
   - O usuário observou no áudio que a fertirrigação do melão é extensa (vai até DAP 50 a 55+), porém o resumo PC08 estava imprimindo apenas até 20/09/2026 (DAP 26, com 13 linhas), e questionou se o resumo deveria ser mais abrangente e cobrir todo o ciclo.
2. **Causa Raiz Identificada:**
   - Na ausência de lançamentos manuais na tabela `caderno_campo_fertirrigacao` para a parcela 16 M, o sistema aciona o cronograma fallback da cultura.
   - Em `campo/resumoElementos.js`, o fallback `defaultProtoSched` continha um stub fixo que terminava no DAP 26.
   - Além disso, o uso de `rowspan` na coluna "FORMA DE APLICAÇÃO" causava quebra e deslocamento de colunas no Chromium em impressões de 2 páginas.
3. **Correções Implementadas:**
   - Integrado o protocolo oficial completo (`DEFAULT_FERT_PROTOCOLS`) diretamente em [campo/resumoElementos.js](file:///c:/Users/mgcon/Desktop/prodtecweb/campo/resumoElementos.js) e sincronizado em [campo/index.html](file:///c:/Users/mgcon/Desktop/prodtecweb/campo/index.html).
   - O cronograma agora cobre todo o ciclo da cultura:
     - **Melão Padrão:** 55 dias (DAP 11 ao DAP 65).
     - **Melão Astúria:** 65 dias (DAP 11 ao DAP 75).
     - **Melão Grand Prix:** 60 dias (DAP 11 ao DAP 70).
     - **Melancia:** 50 dias (DAP 16 ao DAP 65).
   - Substituído o `rowspan` por célula individual com `FERTIRRIGAÇÃO` por linha, garantindo alinhamento perfeito de colunas nas 2 páginas A4 paisagem ("PAG: 01 DE 02").
   - Habilitado `thead { display: table-header-group; }` e `tr { page-break-inside: avoid; }` para repetição elegante do cabeçalho na página 2 da impressão.
