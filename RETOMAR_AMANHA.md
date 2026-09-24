# 💾 Salvamento de Sessão — ProdTec Campo & Web Admin

**Data:** 24/09/2026 — 08:45  
**Conversa ID:** `e0cc517c-5e3d-489e-b209-9a44bd1370f3`  
**Status:** ✅ Auditoria completa realizada nas 5 fichas oficiais enviadas pelo usuário. Pronto para implementação ao retornar!

---

## 🎯 Diagnóstico e Auditoria das 5 Fichas (GlobalGAP / ADGF)

O usuário enviou as fotos dos modelos físicos oficiais para validação e conformidade no sistema:

### 1. **PC05 — CONTROLE DE PREPARO DO SOLO / TRATOS CULTURAIS NA CULTURA**
* **Função Atual:** `printPastaCampoTratos(id)` em `index.html`.
* **Ajustes Mapeados:**
  - Remover trava/bloqueio que impede a impressão quando não há registros no banco.
  - Implementar cabeçalho oficial de 3 caixas (Emanuela Moreira / ADGF / Dep. Campo / Cod: PC05 / Versão 01).
  - Título vermelho centralizado.
  - Ajustar colunas da tabela para: `DATA DD/MM/AA` | `ATIVIDADES` | `IMPLEMENTO AGRÍCOLA` | `NÚMERO DO IMPLEMENTO` | `NOME DO OPERADOR RESPONSÁVEL`.
  - Pré-carregar o checklist das 22 operações padrão (Gradagem, Subsolagem, Aração, Mulching, TNT, Abelhas, etc.).
  - Incluir nota de rodapé obrigatória da auditoria.

### 2. **PC04 — CALENDÁRIO DE PLANTIO DA PARCELA COM A CULTURA**
* **Função Atual:** ❌ **Inexistente** (o sistema rotulava erroneamente a Fertirrigação como PC04).
* **Ajustes Mapeados:**
  - Criar função dedicada `printPastaCampoCalendario(id)` em `index.html` e `campo/index.html`.
  - Cabeçalho oficial `COD: PC04 | CALENDÁRIO DE PLANTIO | VERSÃO: 01`.
  - Quadro de variedades e áreas (Jadeal, Goldex, Grand Prix, Asturia, Goldmine, Total Ha, Data Plantio, Previsão Colheita).
  - Grid diário bicolunado de 1 a 90 dias (MIP, Pulverização, Previsão Colheita, Colheita Realizada, Obs).
  - Legenda colorida oficial (Transplantio, MIP, Pulverização, Previsão Colheita, Colheita Realizada).
  - Nota de rodapé técnica obrigatória.
  - Adicionar botão "Calendário (PC04)" nas listagens de parcelas/plantios e renomear o botão de Fertirrigação para `PC07`.

### 3. **PC03 — IDENTIFICAÇÃO DE SEMENTE, MUDAS, ADUB. DE FUND.**
* **Função Atual:** `printPastaCampoSementes(id)` em `index.html`.
* **Ajustes Mapeados:**
  - Estruturar em dois blocos com títulos em vermelho:
    1. `IDENTIFICAÇÃO DA SEMENTE`
    2. `CONTROLE DO USO DE MATÉRIA ORGÂNICA, FERTILIZANTES NA FUNDAÇÃO E EM COBERTURA`
  - Na Tabela de Sementes: Coluna 1 `Data da Compra: DD/MM/AAAA`, Coluna 9 `Germinação DIAS`, e subdivisão em `Nome do Defensivo` e `Dosagem`.
  - Na Tabela de Adubação: Coluna `Quant. Com. Kg / Parcela`, `Equipamento Utilizado`, `Método de Aplicação`, `Nome do Operador Responsável`.
  - Adicionar campos `OBS EXTRA:` em ambas as seções.

### 4. **PC11 — AUTORIZAÇÃO PARA COLHEITA DE FRUTOS LIVRE DE EXCEDENTE DE RESÍDUOS QUÍMICOS**
* **Função Atual:** `printPastaCampoAutColheita(itemStr)` em `index.html` e `campo/index.html`.
* **Ajustes Mapeados:**
  - Atualizar cabeçalho com `MODELO E APROVAÇÃO: 01/07/2026 | ULTIMA REVISÃO: 01/07/2026`.
  - Trocar tabela fechada de cortes pelo formato oficial de linhas abertas sublinhadas: `( ) PRIMEIRO / DATA _____/_____/_____ Autorização: ___________`.
  - Colorir o parágrafo de advertência obrigatório em **vermelho**.
  - Ajustar linha de assinatura inferior para `CARIMBO - ASSINATURA`.

### 5. **OC:05 (OC05) — ORDEM E REGISTRO DE TRATAMENTO PÓS-COLHEITA**
* **Função Atual:** `printPosColheitaReport(itemStr)` em `index.html`.
* **Ajustes Mapeados:**
  - Transformar no formato contínuo de Packing House (modelo oficial da foto 5).
  - Cabeçalho: `DEP: PACKING - HOUSE | COD: OC:05 | REGISTRO DE TRATAMENTO PÓS COLHEITA`.
  - Título vermelho: `ORDEM E REGISTRO DE TRATAMENTO PÓS-COLHEITA`.
  - Grade com 7 colunas: Aplicação, Carroções, Produto (Nome/i.a.), Quantidade (mL Produto/L Água), Carência, Justificativa (ex: Antracnose em vermelho), Nº Aplicadores.
  - Bloco de Recomendação Técnica: Graduate A+ (4 mL/L), Pincelamento do pedúnculo com garrafas plásticas.
  - Tabela dos aplicadores: Antonio Kerginildo e Erico Victor.
  - Caixa de advertência: "SOBRAS DE MISTURA, GUARDAR EM LOCAL SEGURO, ADEQUADO E IDENTIFICADO."

---

## 📁 Arquivos a Modificar no Retorno
1. [`index.html`](file:///c:/Users/mgcon/Desktop/prodtecweb/index.html) — Web Admin
2. [`campo/index.html`](file:///c:/Users/mgcon/Desktop/prodtecweb/campo/index.html) — PWA Campo

---

## ▶️ Como Retomar
Basta dar o comando: *"Pode aplicar as alterações nas 5 fichas"* ou *"Continuar"* para que os geradores sejam atualizados e sincronizados automaticamente.
