# PRODTECH — Relatório de Auditoria, Correções e Identidade Visual

**Branch:** `melhoria-visual`  
**Status:** Concluído (Fases 0, 1, 2 e 3) — pronto para validação local, sem deploy em produção.

---

## 📋 1. Auditoria Geral (Fase 0)

### (a) XSS e Concorrência de Aspas em Interpolações HTML/onclick
- **Identificado:** Em `campo/index.html` e `campo/fieldOp.js`, chamadas como `onclick="toggleFEmp('${e.id}', '${e.name}')"` quebravam o manipulador sempre que um nome de colaborador continha apóstrofo/aspas (ex.: *D'Ávila*), além de abrir brechas de XSS em listagens dinâmicas.
- **Outros pontos:** Listagens de histórico, setores, operações e registros continham variáveis diretamente interpoladas em templates `innerHTML`.

### (b) CDNs Sem Versão Fixa
- **Identificado:** Scripts carregavam `@latest` do Lucide (`https://unpkg.com/lucide@latest`), bem como Supabase JS e html5-qrcode por URLs genéricas de CDN. Isso causava risco de quebra por breaking changes e impedia a inicialização 100% offline a partir do zero.

### (c) Arquivos Sensíveis / Internos Expostos na Publicação
- **Identificado:** Arquivos de manutenção interna (`check_schema.js`, `check_syntax.js`, `field_migration.sql`) ficavam acessíveis via Web. O arquivo `check_schema.js` continha uma chave anônima hardcoded em código.

### (d) Cobertura do Service Worker (`campo/sw.js`)
- **Identificado:** O `sw.js` utilizava cache v11 e não incluía arquivos locais essenciais (scripts de apoio, ícones reais PNG, fontes locais e vendor), impossibilitando a abertura offline do app sem cache prévio. Também não havia notificação de atualização para o usuário quando uma nova versão do SW estava disponível.

### (e) Inserção em Duas Etapas (`field_services` e `field_service_employees`)
- **Identificado:** Ao registrar um serviço de campo online em `pushFieldService`, se a inserção dos funcionários (`field_service_employees`) falhasse após a criação do cabeçalho (`field_services`), o registro principal ficava órfão no Supabase.

---

## 🛠️ 2. Correções de Funcionalidade (Fase 1)

1. **Escape de Texto & Refatoração de `toggleFEmp`:**
   - Criada/unificada a função `esc(str)` para sanitizar caracteres HTML (`& < > " '`).
   - Refatorada a chamada `toggleFEmp`: agora passa apenas o ID do colaborador (`toggleFEmp('${e.id}')`), buscando o nome diretamente na memória (`employees`/`dbState`). Isso eliminou a quebra por apóstrofos e preveniu XSS.
2. **Gravação em Duas Etapas com Rollback:**
   - Implementada exclusão de limpeza (`DELETE`) no `pushFieldService` e `pushFertirrigacao` caso a segunda etapa de inserção online falhe, evitando dados órfãos e alertando o usuário.
3. **Service Worker Robusto (`campo/sw.js` v12):**
   - Atualizado para a versão `prodtech-campo-v12`.
   - Restrito para interceptar **apenas requisições GET**.
   - Incluídos no pré-cache todos os arquivos locais necessários para abertura offline do zero (`vendor/`, fontes, ícones, CSS).
   - Adicionada estratégia *Stale-While-Revalidate* para assets estáticos locais.
   - Adicionada notificação *"Nova versão disponível. Atualizar"* ao detectar novo Service Worker aguardando ativação.
4. **Vendor Scripts Locais (Versões Fixadas):**
   - Baixados e hospedados localmente em `/vendor/` e `/campo/vendor/`:
     - Supabase JS Client v2.49.1 (`vendor/supabase.js`)
     - Lucide Icons v0.344.0 (`vendor/lucide.min.js`)
     - HTML5 QR Code v2.3.8 (`vendor/html5-qrcode.min.js`)
5. **Manifest.json & Ícones PWA Reais:**
   - Gerados ícones PNG reais e otimizados: `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`.
   - Favicon reduzido de ~480 KB para **1.7 KB**.
   - Removido o ícone genérico com emoji `🌿`.
   - Ajustadas as propriedades `id`, `scope`, `theme_color` (`#1f7a4d`) e `background_color` (`#0e1311`).
6. **Fonte Local IBM Plex Sans:**
   - Hospedada localmente em `assets/fonts/ibm-plex-sans-latin.woff2`.
   - Substituído o `@import` do Google Fonts por `@font-face` local para funcionamento 100% offline.
7. **Segurança na Publicação (`.vercelignore`):**
   - Criado `.vercelignore` para ignorar `check_schema.js`, `check_syntax.js`, `field_migration.sql`, `MELHORIAS.md`, `.git`, `scratch/` e `test_assets/`.
   - Removida a chave hardcoded do `check_schema.js`, passando a ler de `process.env.SUPABASE_KEY`.
8. **📍 Geolocalização GPS no MIP (Manejo Integrado de Pragas - Etapa 1):**
   - Integrada a API de Geolocation (`navigator.geolocation`) no PWA (`campo/index.html`).
   - Adicionado indicador visual e botão *"📍 Obter GPS"* na ficha de amostragem MIP.
   - Gravadas automaticamente as coordenadas `latitude`, `longitude`, `accuracy` e o array `ponto_coords` para cada um dos 10 pontos de amostragem.
   - Atualizado o script `campo/field_migration.sql` com colunas idempotentes `latitude`, `longitude`, `accuracy` e `ponto_coords` (JSONB) na tabela `caderno_campo_mip`.

---

## 🎨 3. Identidade Visual (Fase 2)

- **Direção Visual:** Sistema de gestão agrícola sóbrio e confiável (referências: Climate FieldView e John Deere Operations Center).
- **Remoção de Vícios de UI Genérica de IA:**
  - Removidos fundos azul-marinho genéricos (`#030712`, `#0f172a`), degradês, efeitos de vidro/blur, brilhos/glows e sombras coloridas.
- **Sistema de Design Aplicado:**
  - **Paleta Oficial:** Verde Agrícola `#1f7a4d` (Tema Claro) e `#4cc38a` (Tema Escuro), com neutros esverdeados sóbrios. Cores de estado (vermelho/âmbar) restritas a alertas e status.
  - **Tipografia:** IBM Plex Sans local com números tabulares (`font-variant-numeric: tabular-nums`) para perfeita leitura de tabelas e valores.
  - **Geometria:** Espaçamentos em múltiplos de 4/8px, raio de borda suave (6 a 8px) e bordas sutis de 1px.
- **Otimização do PWA para Uso a Céu Aberto (`campo/campo-theme.css`):**
  - Contraste elevado (mínimo 4.5:1).
  - Alvos de toque ajustados para no mínimo **48px** de altura/largura.
  - Campos de entrada e selects com fonte de **14px ou superior**.
  - Tema Claro definido como **padrão inicial**, mantendo o botão de alternância para Tema Escuro e preservando a chave `prodtech_campo_theme` no `localStorage`.

---

## 🔍 4. Itens Identificados e NÃO Alterados (com Motivo)

1. **Regras de Negócio e Cálculos Agrícolas:**
   - Nenhum cálculo de rateio de carrocão, custo por funcionário, amostragem MIP ou fertirrigação foi alterado, conforme as Regras Inegociáveis.
2. **Esquema de Banco e IndexedDB:**
   - Nenhuma tabela, coluna ou estrutura do Dexie/IndexedDB foi renomeada ou removida para garantir zero perda de dados.
3. **RLS (Row Level Security) no Supabase:**
   - **Nota de Segurança:** As tabelas `field_services` e `field_service_employees` possuem criação de tabela via SQL em `field_migration.sql`, mas o script SQL local não explicita se `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` foi executado. Recomenda-se conferir no painel do Supabase se o RLS está ativado nessas tabelas para evitar leituras/escritas anônimas não autorizadas.

---

## 🧪 5. Roteiro para Validação e Testes Manuais

Para testar todas as melhorias na sua máquina local:

### 1. Verificação de Sintaxe
No terminal na raiz do projeto, execute:
```bash
node check_syntax.js
```
*Resultado esperado:* Sucesso em 100% dos blocos de código sem erros de sintaxe.

### 2. Autenticação e Troca de Empresa
1. Abra `index.html` ou `campo/index.html` no navegador.
2. Faça login com um usuário válido ou selecione uma empresa (Tenant).
3. Verifique se a empresa é salva corretamente no `localStorage`.

### 3. Teste de Funcionários com Apóstrofo / Caracteres Especiais
1. Acesse o PWA no menu de lançamento de serviços de campo (`campo/index.html`).
2. Cadastre ou selecione um colaborador com apóstrofo no nome (ex.: *D'Ávila* ou *D'Angelo*).
3. Clique sobre o funcionário na lista: o clique deve selecionar/desselecionar sem quebrar a tela ou disparar erro de JavaScript no console (F12).

### 4. Gravação de Registros e Teste de Rollback
1. Crie um registro de serviço de campo com colaboradores selecionados.
2. Salve o registro e verifique na aba de histórico se os dados foram renderizados corretamente.

### 5. Modo Offline (DevTools)
1. No navegador, abra o DevTools (F12) > aba **Application** > **Service Workers** (ou aba **Network**).
2. Marque a opção **Offline**.
3. Recarregue a página do PWA (`/campo/index.html`).
4. Verifique se a aplicação abre instantaneamente do zero offline (graças ao Service Worker v12 e scripts/fontes locais em `vendor/` e `assets/fonts/`).
5. Faça um lançamento offline: verifique a notificação de registro salvo offline e a atualização do contador no badge de sincronização.
6. Desmarque o modo Offline no DevTools: verifique a sincronização automática dos dados acumulados.

### 6. Alternância de Temas (Claro / Escuro)
1. Alterne o tema através do botão de alternância no PWA ou Painel.
2. Verifique se a preferência `prodtech_campo_theme` é mantida ao recarregar a página e se todas as telas permanecem legíveis em ambos os temas.

### 7. Layout de Impressão
1. Abra a página `preview_fichas.html` ou acione o recurso de geração de laudo/PDF.
2. Verifique se o layout oficial de impressão permanece intacto sem desformatar.
