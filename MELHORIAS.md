# Relatório de Auditoria e Plano de Melhorias — PRODTECH

## FASE 0: AUDITORIA DO SISTEMA

### (a) Pontos de Inserção de Texto sem Escape (XSS e Quebra de Sintaxe em onclick/innerHTML)
1. **PWA Campo (`campo/index.html`)**:
   - `toggleFEmp(${e.id}, '${e.name}')`: Nomes com apóstrofo (ex.: D'Ávila, O'Connor) ou aspas quebram a string de JavaScript gerando erro de sintaxe no `onclick` e brecha XSS.
   - `renderOpHistoryList`: Campos `setor`, `operacao`, `registrado_por`, `parcela` e nomes de produtos sendo inseridos diretamente em `innerHTML` sem sanitização/escape.
   - `renderMipHistory`: Campos `praga`, `parcela` interpolados diretamente no HTML.
   - `renderCcIdiarnTable`: Campos `documento`, `parcela`, `produtos` interpolados sem escape.
   - `renderCcFichaOpTable` e `renderCcOpTable`: Atributos e textos interpolados diretamente sem escape.
2. **Painel Web (`index.html`)**:
   - Tabela de usuários, empresas, romaneio, histórico de produção e relatórios com interpolação direta de nomes de usuários, razões sociais e observações em `innerHTML` e atributos `onclick`.

### (b) CDNs sem Versão Fixa
1. **Unpkg Lucide**: `https://unpkg.com/lucide@latest` (carrega versão instável/flutuante em `index.html`, `campo/index.html`, `info.html`, `bomjesus.html`).
2. **Unpkg HTML5-QRCode**: `https://unpkg.com/html5-qrcode` (sem tag de versão fixa).
3. **JsDelivr Supabase-JS**: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` (versão major `@2` flutuante).
4. **JsDelivr Chart.js**: `https://cdn.jsdelivr.net/npm/chart.js` (sem tag de versão fixa em `index.html`).
5. **Google Fonts**: `@import` e `<link href="https://fonts.googleapis.com/css2...">` dependem da internet para renderizar a tipografia.

### (c) Arquivos que Estão Sendo Publicados Indevidamente
1. `check_schema.js`: Script Node.js interno de checagem contendo chave do Supabase hardcoded.
2. `check_syntax.js`: Script Node.js de checagem sintática local.
3. `field_migration.sql`: Arquivo de migração de banco de dados SQL.
4. Pastas temporárias/desenvolvimento: `scratch/`, `test_assets/`, `.vscode/`.

### (d) Cobertura do Service Worker (`campo/sw.js`)
- **O que cacheia**:
  - Pré-cache estático limitado: `./`, `./index.html`, `./manifest.json`, `./dragDropTouch.js`.
  - Cache dinâmico (estratégia cache-first) para requisições do próprio domínio.
- **O que NÃO cacheia ou falha**:
  - `fieldOp.js`, `infoParcelasData.js`, `campo-theme.css`, ícones e imagens.
  - Dependências de CDNs externas (`supabase-js`, `lucide`, `html5-qrcode`, `Google Fonts`) são ignoradas ou falham ao iniciar a aplicação totalmente offline pela primeira vez.
  - Requisições que não sejam de método `GET`.
  - Não possui mecanismo de notificação "Nova versão disponível" / atualização controlada de SW.

### (e) Outros Bugs de Funcionalidade Identificados
1. **Gravação em duas etapas no PWA Campo (`field_services` + `field_service_employees`)**:
   - Em modo online, se a segunda etapa (`field_service_employees`) falhar após a criação do registro pai (`field_services`), a sessão pai permanece órfã no banco sem rollback ou limpeza.
2. **Tamanho excessivo de favicons e assets**:
   - `favicon.ico` (~480 KB) e `logo.png` (~480 KB) são arquivos pesados que atrasam o carregamento inicial.
3. **Verificação de RLS**:
   - As tabelas `field_services` e `field_service_employees` precisam de confirmação de suporte a RLS (Row Level Security) no Supabase.

---
