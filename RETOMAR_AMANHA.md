# 💾 Salvamento de Sessão & Diagnóstico Técnico — PRODTEC Web & Python

**Data:** 12/10/2026 — 17:35  
**Conversa ID:** `2f6e02c5-98eb-4bed-8fc8-957404dae82f`  
**Status da Sessão:** 🔍 **Análise Completa Realizada e Mapeada para Execução Imediata na Retomada.**

---

## 📋 Diagnóstico dos 3 Pontos Levantados pelo Usuário

### 1. Dashboards Detalhados (Versão Local / Desktop Python)
* **Demanda:**
  * Exibir informações muito mais completas e discriminadas nos dashboards:
    * Quantidade de caixas com erro / refugo / penalidade;
    * Porcentagem de produtividade (%) por colaborador e global;
    * Porcentagem de qualidade (%);
    * Média de caixas embaladas por hora (caixas/h);
    * Discriminação detalhada por período, colaborador e linha.
* **Diagnóstico no Código:**
  * **Backend Python (`packinghouse-app/python_app/app_service.py`):**
    * A função `dashboard_get_stats()` (linha ~807) já possui consultas agregadas de `penalty_count`, `qualityBreakdown`, `avgPerHour`, `totalBoxes`, `targets`, `yieldPct`.
    * Necessita enriquecer o payload com:
      * Taxa percentual de erro global (`(penaltyCount / (totalBoxes + penaltyCount)) * 100`);
      * Taxa de qualidade global (`100% - taxa_erro`);
      * Média de caixas/hora real calculada sobre o intervalo ativo;
      * Tabela analítica completa com colunas: Colaborador, Função, Caixas Produzidas, Caixas com Erro, Produtividade (%), Qualidade (%) e Ritmo Médio (cx/h).
  * **Frontend UI (`packinghouse-app/src/renderer/index.html` e `renderer.js`):**
    * Atualizar o template `tpl-dashboards` e a função `initDashboards()` para renderizar novos cards KPI de destaque e tabela detalhada.

---

### 2. Resumo dos Elementos (PC08 / PC09) na Versão Web — Falha na Seleção da Parcela
* **Demanda:**
  * Ao abrir a aba de Resumo dos Elementos na Web, nenhuma parcela aparece para seleção no dropdown, impossibilitando puxar os dados tanto da fertirrigação quanto da pulverização.
* **Causas Raízes Identificadas:**
  * **Causa A — Carregamento tardio em `index.html`:**
    * Ao clicar na aba "Resumo de Elementos" (`showCcTab('elementos')` na linha 15535), a função `loadWebResumoElementosUI()` lê `window.webInfoParcelasData`.
    * No entanto, `window.webInfoParcelasData` só é carregada se o usuário tivesse clicado antes na aba "Plantios" (`loadWebPlantios()`). Como o usuário entra direto em "Elementos", a lista está `[]` (vazia), gerando um `<select id="webElementosParcelSelect">` sem nenhuma opção.
  * **Causa B — Erros ocultos em `campo/resumoElementos.js`:**
    * Na linha 429: uso de `tenantId` sem checagem de escopo (`ReferenceError` se a variável não estiver no escopo global).
    * Na linha 442: chamada a `isFoliarProduct(it)`, porém a função `isFoliarProduct` **não existe** no arquivo (`ReferenceError` capturado silenciosamente no `try/catch`).
    * Leitura de produtos da calda: o código buscava `it.produto`, mas o schema de `caderno_campo_op_itens` armazena no campo `it.produto_nome`.
  * **Causa C — Falta de busca direta no Supabase:**
    * `calcResumoElementosParcela(parcelIdOrCode)` não tentava carregar as parcelas da tabela `info_parcelas` diretamente caso as variáveis na memória do navegador estivessem vazias.

---

### 3. Versão Local Python — Tela Preta / Fechamento ao Selecionar o Painel
* **Demanda:**
  * Ao iniciar o aplicativo Python via `INICIAR_PRODTEC_PYTHON.bat`, ocorre tela preta ou, ao selecionar a rota "Painel", a janela apaga / fecha (crash).
* **Causas Raízes Identificadas:**
  * **Aceleração Gráfica no QWebEngine (PyQt6):**
    * Em placas Intel HD / integradas comuns no ambiente Windows, conflitos de composição de software e GPU (`--disable-gpu-compositing`, `--disable-software-rasterizer`) podem provocar render crash no processo Chromium interno do Qt (`QtWebEngineProcess.exe`).
  * **Navegação do Painel (`initPainel` em `renderer.js`):**
    * Em `renderer.js`, a função `must(id)` lança `Error` não capturado se qualquer elemento não existir.
    * A inicialização de `window.api.stateGet()` ou `totalsNow()` pode gerar travamento se o WebChannel ainda não tiver completado o handshake antes da rota ser trocada.

---

## 🛠️ Roteiro de Ações Executadas e Validadas

1. **Paliativo de Relógio do PC Local & Remoção de Bloqueio de 1s (`app_service.py` e `db_python.py`):**
   - [x] Removido o bloqueio anti-duplicata de 1s em `scan_submit` que descartava caixas subsequentes quando o relógio do Windows voltava no tempo.
   - [x] Implementado relógio monotônico em `db_python.py` (`now_ms()` ancorado na inicialização ao `max(time.time(), MAX(scan_events.ts))` e incrementado via `time.monotonic()`), garantindo carimbos estritamente crescentes sem regressão.

2. **Estabilidade e Correção do Crash ao Clicar em "Painel" (`app_service.py` e `app.py`):**
   - [x] Corrigido `NameError: name '_one' is not defined` em `app_service.py:360` e `app_service.py:385` em `parcel_fruits_list` e `parcel_varieties_list`.
   - [x] Instalado `sys.excepthook` seguro em `app.py` para prevenir que qualquer exceção em slots do Qt derrube o aplicativo.
   - [x] Ajustadas as flags de inicialização do QWebEngine no `app.py` e `INICIAR_PRODTEC_PYTHON.bat`, removendo a flag conflituosa `--disable-software-rasterizer` que causava tela preta.

3. **Correção do Resumo dos Elementos Web (`index.html` + `campo/resumoElementos.js`):**
   - [x] `loadWebResumoElementosUI()` agora consulta diretamente o Supabase em `info_parcelas` caso a memória esteja vazia e expõe globalmente em `window.webInfoParcelasData`.
   - [x] Em `calcResumoElementosParcela()`, adicionada validação de regex para UUID, evitando que códigos alfanuméricos como `01A` ou `PC08` causem erro 400 no PostgreSQL (`invalid input syntax for type uuid`).
   - [x] Implementada a função `isFoliarProduct()` e padronizada a leitura de produtos nutricionais.

4. **Correção do Drawer de Colaboradores no Web Admin (`index.html`):**
   - [x] Corrigido `ReferenceError: start is not defined` em `openEmpDrawer`.
   - [x] Corrigidas colunas do Supabase: `production_scans` usa `raw_barcode` (não `employee_barcode`); `employee_absences` e `quality_audits` usam apenas `employee_barcode` (removido filtro inválido por `employee_name`).

5. **Dashboard Individual de Colaboradores no Desktop Python Local (`packinghouse-app`):**
   - [x] Corrigida falha de consulta em `dashboard_get_stats` quando `employee_id` era filtrado (ajuste de aliases de tabela em `quality_audits`).
   - [x] Aumentado limite de colaboradores de 10 para 100 para exibir todos os funcionários cadastrados.
   - [x] Adicionado cálculo real da cadência média de bipes (`avgScanGapSec`) em segundos.
   - [x] Adicionado Banner Individual do Colaborador (`#collabSelectedBanner`) com foto, função, caixas líquidas, qualidade, ritmo (cx/h), cadência e botão "✖ Ver Geral".
   - [x] Tornadas interativas todas as linhas da tabela analítica e cards de ranking (hover e cursor pointer).
   - [x] Implementado Modal de Raio-X Individual do Colaborador (`window.openCollaboratorModal(empId)`), exibindo foto, métricas completas, caixas por modelo, caixas por parcela, defeitos de auditoria e histórico recente de leituras.

6. **Carrossel Rotativo de 2 Minutos no Painel (`collabShowcaseOverlay` em `renderer.js` + `index.html` + `styles.css`):**
   - [x] Redesenhado completamente o card do carrossel rotativo que surge na TV/Painel a cada 2 minutos com dados individuais discriminados.
   - [x] Exibe posição no ranking (🏆 1º Lugar, 🥈 2º Lugar...), foto com anel colorido pela qualidade, crachá, ID, meta horária e atingimento (%).
   - [x] Grid Bento analítico com: Caixas Líquidas vs Brutas, Caixas com Erro e Taxa de Erro, Qualidade (%), Ritmo Médio (cx/h), Cadência Média entre bipes (s) e Peso Total em kg/toneladas.
   - [x] Detalhamento dos calibres e modelos de caixas produzidos pelo colaborador no dia.
   - [x] Barra de progresso animada (8s por slide) e controles de navegação (◀ Anterior, ⏸ Pausar, ▶ Próximo, ✖ Fechar).
   - [x] Fechamento instantâneo por bipe: qualquer leitura com o leitor de código de barras ou tecla digitada encerra o overlay imediatamente para não interromper a operação.
