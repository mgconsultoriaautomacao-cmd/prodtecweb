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

---

## 6. Modelo Oficial de Preenchimento Manual para Auditoria de Campo (PC07 & PC08)

1. **Exigência da Auditoria GlobalGAP / Empresa:**
   - A auditoria externa exigiu que o controle de fertirrigação seja comprovadamente preenchido de forma manual no campo pelo operador (fertirrigador), evitando que a ficha saia 100% pré-impressa pelo computador para todo o ciclo.
2. **Implementação do Modelo de Campo / Auditoria (Padrão Ativo):**
   - **Topo com Guia de Dosagem:** As primeiras aplicações (DAP 11 ao 17) saem pré-preenchidas com as datas calculadas, DAP, ordem e quilos calculados para a área da parcela (ex: 4.160 ha), servindo como referência técnica exata de cada produto para o operador se basear.
   - **Linhas em Branco Pautadas:** As linhas subsequentes (~19 a 20 linhas) são geradas em branco, com altura confortável (22 a 23px) e bordas nítidas para escrita manual à caneta.
   - **Totais em Branco:** A linha de "TOTAL GERAL DO CICLO DA PARCELA" possui células em branco para o somatório manual e conferência ao final da safra.
   - **100% em 1 Página A4 Retrato (PC07):** A ficha PC07 cabe em exatamente 1 página ("PAG: 01 DE 01"), sem transbordar.
3. **Preservação Integral da Lógica Digital:**
   - A metodologia digital de cálculo completo (DAP 11 ao 65/75) permanece 100% ativa no sistema para gráficos, indicadores e telas.
   - Ao clicar em imprimir (tanto na PC07 quanto na PC08), o sistema apresenta a opção rápida (com Enter padrão = 1 para o modelo manual de auditoria e 2 para o modelo digital completo), gravando a preferência do usuário.

---

## 7. Extensão do Calendário de Fertirrigação até Idades Avançadas (DAP 55 ao 65)

1. **Ajuste Solicitado pelo Usuário:**
   - O usuário solicitou que a tabela manual não ficasse restrita a vinte e poucos dias, mas sim que estendesse os dados de idade (DAP) cobrindo todo o ciclo ("cinquenta e poucos dias, igual ao original"), mantendo as informações de dosagem expostas apenas no início e deixando as colunas de produtos em branco para as idades subsequentes.
2. **Implementação Realizada:**
   - Em [campo/index.html](file:///c:/Users/mgcon/Desktop/prodtecweb/campo/index.html), [index.html](file:///c:/Users/mgcon/Desktop/prodtecweb/index.html) (PC07) e [campo/resumoElementos.js](file:///c:/Users/mgcon/Desktop/prodtecweb/campo/resumoElementos.js) (PC08):
     - Todas as 55 linhas do ciclo (DAP 11 ao 65 para Melão Padrão) são geradas na tabela com sua Data do Calendário e o respectivo DAP.
     - **Linhas Iniciais (DAP 11 ao 17):** Apresentam os quilos calculados expostos como modelo de partida e referência de dosagem.
     - **Linhas Subsequentes (DAP 18 ao 65):** Apresentam Data, Ordem e DAP preenchidos, porém com as células de dosagem/elementos totalmente **em branco** para anotação manual diária pelo fertirrigador.
     - **Paginação A4 Perfeita:** Configurada com `thead { display: table-header-group; }` e `tr { page-break-inside: avoid; }`, dividindo o documento com precisão em exatamente 2 páginas ("PAG: 01 DE 02").

---

## 8. Início do Ciclo de Fertirrigação: 1 Dia Após o Plantio (DAP 1)
1. **Solicitação do Usuário:**
   - O usuário orientou via áudio: *"Pronto, em relação à fertirrigação, o processo, né, deve se iniciar um dia depois do plantio já. Certo? A gente precisa colocar isso aí: um dia depois do plantio já começar o processo."*
2. **Diagnóstico Técnico:**
   - Anteriormente, os protocolos de fertirrigação (`FERT_PROTOCOLS`, `FERT_PROTOCOLS_WEB`, `DEFAULT_FERT_PROTOCOLS`) estavam indexados pelas idades biológicas das mudas em viveiro (chaves `"11"` a `"65"` para melão, `"16"` a `"65"` para melancia).
   - Como resultado, para a Parcela 16 M (plantada no campo em 26/08/2026), a primeira ordem de fertirrigação pulava os 10 primeiros dias e iniciava em 05/09/2026 com "DAP 11".
3. **Implementação Realizada:**
   - **Reindexação dos Protocolos:** Todas as doses dos protocolos foram reindexadas sequencialmente a partir do DAP 1:
     - `MELAO_PADRAO`: DAP 1 ao 55 (55 aplicações).
     - `MELANCIA_PADRAO`: DAP 1 ao 50 (50 aplicações).
     - `ASTURIA`: DAP 1 ao 65 (65 aplicações).
     - `GRAND_PRIX`: DAP 1 ao 60 (60 aplicações).
   - **Cálculo de Data do Calendário:** Ajustado para `plantioDt + (dapNum * 86400000)`, garantindo que a Ordem 1 (DAP 1) inicie exatamente no dia seguinte ao plantio (`27/08/2026` para plantio em `26/08/2026`).
   - **Modelo de Auditoria de Campo (PC07 & PC08):**
     - **Ordem 1 a 7 (DAP 1 ao 7 - 27/08 a 02/09):** Doses de referência calculadas e preenchidas no topo da tabela.
     - **Ordem 8 a 55 (DAP 8 ao 55 - 03/09 a 20/10):** Data, Ordem e DAP preenchidos, com células de produtos em branco para anotação diária à caneta pelo operador.
   - **Arquivos Sincronizados:** [campo/resumoElementos.js](file:///c:/Users/mgcon/Desktop/prodtecweb/campo/resumoElementos.js), [campo/index.html](file:///c:/Users/mgcon/Desktop/prodtecweb/campo/index.html) e [index.html](file:///c:/Users/mgcon/Desktop/prodtecweb/index.html).
