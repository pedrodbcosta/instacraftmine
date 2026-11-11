# Instacraftmine — instruções para qualquer chat

Aplicação React 19 + TypeScript + Vite (PWA) para gerir mundos, servidores e coordenadas de
Minecraft. Interface em português de Portugal, dados no dispositivo (IndexedDB) e base de dados
comum no Supabase (`supabase/schema.sql`: contas, sincronização do acervo por conta, Instacraft,
partilha e chat).

## Regra obrigatória: uma versão nova por cada alteração

**Qualquer alteração a esta aplicação sobe a versão BETA em uma unidade, na mesma resposta em que
a alteração é feita.** Não é opcional e não depende de o utilizador pedir.

- Um pedido do utilizador = uma versão nova (não uma por cada ficheiro editado).
- A versão atual vive **só** em `src/lib/appVersion.ts` (`APP_VERSION` e `APP_VERSION_NUMBER`).
- Subir a versão com o script, nunca à mão:

```bash
npm run version:bump                # BETA 0.5 → BETA 0.6
npm run version:bump -- "BETA 1.0"  # versão concreta
npm run version:bump -- --dry-run   # ver sem escrever
```

O script atualiza `src/lib/appVersion.ts`, `package.json` e `package-lock.json` de uma vez.

- **Nunca** escrever números de versão da aplicação em componentes, HTML, docs ou configs. O
  rodapé (`src/components/Layout.tsx`) e Definições → Sobre (`src/pages/SettingsPage.tsx`) leem
  `APP_VERSION`. O teste `tests/appVersion.test.ts` falha se alguém voltar a fixar a versão num
  ficheiro ou se o `package.json` divergir.
- Só a fase e o número mudam (`BETA 0.5` → `BETA 0.6` → … → `BETA 1.0`). Ao chegar a 0.99, o
  próximo passo é `BETA 1.0`.

## Antes de terminar a resposta

1. `npm run version:bump` (se o pedido alterou alguma coisa na aplicação).
2. `npm run publicar` — reconstrói `dist/` e mostra a pasta a publicar. **O site publicado é a
   pasta `dist/`, não um zip**: sem reconstruir, o utilizador não vê alteração nenhuma. O comando
   confirma que o `index.html` de `dist/` é autónomo (com o JavaScript e o CSS lá dentro) e falha
   se o build deixar de funcionar aberto por duplo clique.
3. `npm run typecheck` e `npm test` — o build de produção (`npm run build`) corre o `tsc` primeiro.
4. Dizer no resumo final qual é a versão nova (ex.: «agora BETA 0.6»).

## Comandos úteis

```bash
npm run dev         # servidor de desenvolvimento (Vite, porta 5180)
npm run build       # tsc --noEmit + vite build (dist/)
npm run serve:dist  # serve a versão de produção em http://127.0.0.1:4173
npm test            # vitest
npm run publicar    # build + mostra/abre a pasta dist/ a publicar
npm run verificar:file # abre dist/index.html por file:// num Edge headless e confirma que arranca
npm run sitemap     # reescreve public/sitemap.xml a partir do campo `homepage` do package.json
```

## Abrir por duplo clique (`file://`) — regra que não se quebra

O utilizador quer poder abrir **`dist/index.html` com dois cliques**, sem servidor local: os dados
ficam no IndexedDB do navegador e as contas, o Instacraft e o chat falam diretamente com o Supabase.
Isso impõe restrições ao build:

- **O `index.html` tem de ser autónomo**: o JavaScript vai num `<script type="module">` inline e o
  CSS num `<style>` (plugin `inlineAppPlugin()` em `vite.config.ts`). Em `file://` o navegador
  bloqueia por CORS tanto os módulos externos (`src="./assets/…js"`) como o `fetch`. Se o plugin
  deixar de correr, `npm run publicar` falha com uma mensagem a dizer isso.
- **Nada de `fetch` para ficheiros locais**: as tabelas de biomas viajam em base64 dentro de
  `src/lib/worldgen/mc/tabelasEmbutidas.ts` (gerado por `npm run mc:embutir` a partir de
  `tools/mc-tables/*.bin`). Por isso as `.bin` **não** vivem em `public/`: se voltarem para lá
  ninguém as consegue ler em `file://`, e o mapa da seed fica sem tabelas.
- **O service worker só é registado em `http(s)`** (o `sw.js` não existe em `file://`). O
  `manifest.webmanifest` continua a dar um aviso de CORS no `file://` — é inofensivo e é o preço de
  ter a app instalável quando publicada.
- `file://` é contexto seguro no Chromium: `crypto.subtle`, `crypto.randomUUID` e IndexedDB
  funcionam (verificado com `tools/verificar-file.mjs`). O que **não** funciona é carregar ficheiros
  locais por `fetch`/XHR e módulos externos.
- A pasta `dist/` serve para as duas coisas: publicar (arrastar a pasta) e testar (duplo clique).
  Não criar um segundo artefacto (zip ou outra build) para o utilizador "perceber" — houve um zip
  e um `site-para-netlify/` que só causavam confusão e ficaram desatualizados.
- Testar sempre com `npm run verificar:file` depois de mexer no build, no `index.html` ou no
  `vite.config.ts`: os testes unitários não apanham CORS.

- O mapa do site (`public/sitemap.xml`) e a linha `Sitemap:` do `public/robots.txt` são a
  porta de entrada para a Google Search Console. O endereço do site vive **só** no campo
  `homepage` do `package.json`: mudou o domínio, corre `npm run sitemap`. Como a aplicação usa
  encaminhamento por hash, as secções (`#/mundos`, …) **não** entram no mapa; entram a raiz e as
  páginas HTML a sério (`PAGE_PATHS` em `scripts/gerar-sitemap.mjs`, hoje só `/sobre.html`).

## SEO e ficheiros para máquinas

O site é uma aplicação construída no navegador: o HTML que um motor de busca recebe tem pouco
texto. Tudo o que faz o site aparecer (no Google e nas respostas de IA) está nos ficheiros abaixo —
mexer em qualquer um deles exige correr `npm test`, porque `tests/seo.test.ts` vigia tudo isto.

- **`public/llms.txt`** é o ficheiro para qualquer IA que entre no site (formato
  [llms.txt](https://llmstxt.org)): diz o que a aplicação é, o que faz, os endereços das secções, o
  que o mapa da seed tem de exato, onde ficam os dados e o que a aplicação **não** faz. Regras:
  - **sem números de versão** (ficam velhos no dia seguinte; `tests/appVersion.test.ts` falha);
  - os endereços absolutos têm de ser do domínio do `homepage` do `package.json` — mudou o domínio,
    atualiza o `llms.txt` e corre `npm test` (o teste diz o que está mal);
  - não inventar funcionalidades: o que não existe escreve-se que não existe.
- **`sobre.html`** (na raiz) é a mesma explicação em HTML, sem JavaScript: é a página que os
  motores de busca conseguem rastrear e indexar. Está em `PAGE_PATHS` (o mapa do site) e é ligada
  no rodapé das duas interfaces. Uma página indexável nova tem de:
  1. entrar em `PAGE_PATHS` (`scripts/gerar-sitemap.mjs`) e no `vite.config.ts`
     (`build.rollupOptions.input`) — senão não é publicada;
  2. ter `<link rel="canonical">` com o marcador `%SITE_URL%`, título e descrição próprios;
  3. ficar ligada a partir de outra página (uma página sem ligações não é encontrada).
- **`%SITE_URL%`** nos HTML é trocado no build *e* no `npm run dev` pelo `homepage` do
  `package.json` (`siteUrlPlugin()` em `vite.config.ts`, que lê o `package.json` como JSON —
  `resolveJsonModule` no `tsconfig.json`). Nunca escrever o domínio à mão nos HTML: é assim que a
  canónica fica a apontar para um site que já não existe. Se depois do build aparecer
  `%SITE_URL%` em `dist/`, o plugin deixou de correr.
- **`public/og/og-image.png`** é o cartão 1200×630 que aparece nas partilhas (WhatsApp, Discord,
  redes) e ao lado do resultado do Google. É gerado por `npm run icons` (`og_image()` em
  `tools/gen_assets.py`): desenhado a 400×210 e ampliado 3× sem suavização, para a pixel art
  continuar quadrada. Mudou o texto do cartão? Volta a correr o script.
- **`index.html`** leva a canónica, `og:*`, `twitter:*`, os dados estruturados (schema.org:
  `WebSite`, `Organization`, `WebApplication`) e um `<noscript>` com a explicação em texto. Nos
  dados estruturados não entram avaliações, notas nem preços inventados — só factos.
- **`public/robots.txt`** não bloqueia nada e nomeia explicitamente os rastreadores de IA (GPTBot,
  ClaudeBot, PerplexityBot, …). O site vive de ser encontrado: **não** acrescentar `Disallow`. É
  também lá que se anuncia o `llms.txt` e o mapa do site.

## Convenções

- **Duas interfaces, uma aplicação**: `src/lib/device.ts` decide telemóvel ou computador e
  `src/state/DeviceProvider.tsx` marca o `<html>` com `data-device`. O CSS da versão de telemóvel
  vive todo em `src/styles/mobile.css`, debaixo de `html[data-device='mobile']`; a versão de
  computador não pode ser afetada. A escolha manual (`settings.uiMode`: `auto`/`desktop`/`mobile`)
  é por dispositivo e é preservada na sincronização (como o `deviceId`). A componente de estrutura é
  `src/components/mobile/MobileLayout.tsx` e o início tem uma página própria
  (`src/pages/MobileHomePage.tsx`).
- Português de Portugal em código visível (textos, mensagens de erro, comentários).
- O nome antigo («Blocos & Coordenadas») sobrevive **de propósito** em identificadores internos e
  não se mudam: a base IndexedDB (`DB_NAME = 'blocos-coordenadas'`), o `schema` dos ficheiros de
  cópia de segurança (`BACKUP_SCHEMA`), as chaves de `localStorage` da sincronização e o domínio dos
  emails sintéticos das contas (`<utilizador>@blocos.local`). Mudá-los perderia dados locais,
  invalidaria cópias antigas e trancaria contas existentes.
- O ícone da marca é gerado por `python tools/gen_assets.py` (ou `npm run icons`) a partir de um
  mapa de 16×16 em `tools/gen_assets.py`: favicons 16/32/48/96, `.ico`, SVG, 192/512 e maskable. O
  bloco da marca tem de continuar legível a 16 px — é o que o Google mostra ao lado do resultado.
- Estilo visual: pixel art Minecraft (classes `mc-*`, `PixelIcon`, texturas em `src/assets`).
- Acessibilidade: cada botão/ícone precisa de rótulo, os formulários usam `Field` com `htmlFor` e
  erros associados.
- Sincronização por conta: com sessão iniciada, mundos, servidores, locais, categorias e preferências
  seguem a conta em qualquer dispositivo. O motor é `src/lib/sync.ts` e a parte do servidor é a
  secção 12 de `supabase/schema.sql` (ou `supabase/patch-02-sincronizacao.sql`). Sem conta, os dados
  ficam no dispositivo e exportar/importar JSON continua a ser o caminho.
- Alterações à sincronização que mudem tabelas/colunas exigem SQL novo no Supabase; a app mostra uma
  mensagem clara quando a tabela ou a função faltam. Não prometer sincronização sem essa parte.

## Minecraft AI (conta automática do Instacraft)

- `src/lib/instacraftAi.ts` é **identidade e texto**: nome, menção, deteção de pergunta, molduras das
  publicações (`composeDailyPost`, `composeNewsPost`) e `composeReply`. Não decide conteúdo.
- **Não existe base de regras nem resposta de recurso** — foi apagada a pedido do dono da aplicação.
  Quem escreve a dica, as novidades e as respostas é **um modelo** (Gemini no Google, Ollama no PC).
  Não reintroduzir `KNOWLEDGE`, `DAILY_TIPS`, `answerFor`/`findKnowledge` nem um «fallback» de texto:
  sem modelo, a IA **não publica** (a menção fica pendente para a ronda seguinte). `tests/iaGas.test.ts`
  procura esses nomes no `Codigo.gs` e falha se voltarem.
- A **identidade** vive só no servidor (`supabase/patch-04-ia-minecraft.sql`, secção 14 do
  `schema.sql`). Nunca pôr credenciais da conta `MinecraftAI` no cliente: a chave do Supabase é
  pública.
- As escritas passam por `minecraft_ai_status()` e `minecraft_ai_run(jsonb)`, que reservam o dia em
  `ai_runs (day)`. A ronda **não corre no browser** (um modelo no cliente exigiria a chave no bundle):
  corre no runner do Google (`scripts/ia-gas/`) ou no do PC (`scripts/ia-diaria/`). O cartão do
  Instacraft é só leitura (`useMinecraftAi`), sem botão de «correr».
- Regras que não se mudam sem pensar: a IA **ignora menções sem pergunta**, **nunca escreve a
  própria menção** numa resposta (ciclo infinito) e **só fala de uma versão uma vez** (`ai_versions`).
  Uma versão pode ser anunciada numa ronda em que a dica já saiu: a marca é `ai_versions`, não
  `ai_runs`.
- **Uma dica por dia é garantida duas vezes**: pela reserva em `ai_runs (day)` e pelo trigger
  `posts_ai_one_tip_per_day` (`supabase/patch-08-uma-dica-por-dia.sql`, secção 18 do `schema.sql`).
  A reserva sozinha não chegava: apagada a linha no Table Editor, a ronda voltava a correr no mesmo
  dia (aconteceu a 8 e 9 de novembro — o feed ficou com a dica repetida). O trigger recusa a segunda
  publicação com o formato `Dica do dia — …` e **devolve `null`** (cancela a linha e deixa a ronda
  responder às menções). Não trocar por `raise exception`: isso perderia as respostas do dia. É também
  por isso que o prefixo da dica não muda sem atualizar o patch.
- Há ainda uma terceira rede, em código: os runners olham para `postedToday` (a IA já publicou hoje?)
  e não voltam a publicar a dica. Cobre as bases de dados onde o patch 08 ainda não foi corrido.
- As secções 14 e 18 do `schema.sql` são cópias dos patches; `tests/sqlPatches.test.ts` falha se as
  duas divergirem.

## IA diária com modelo local (`scripts/ia-diaria/`)

- A divisão é deliberada: **modelo só fora do browser**. Uma chave de API no bundle seria uma chave
  pública (a chave do Supabase é pública por desenho). O Ollama é local e não tem chave; as
  credenciais de sessão vivem em `%USERPROFILE%\.instacraftmine\ia.env`, **fora do repositório**
  (`ia.env` está no `.gitignore`).
- **O modelo é obrigatório**: `escolherResposta` devolve `{ answer: null, origem: 'erro' }` quando
  falha e `run.mjs` termina sem publicar nada. `--sem-modelo` foi removido; não voltar a criar um
  caminho «sem IA».
- As decisões de conteúdo vivem em `scripts/ia-diaria/modelo.mjs`: `buildQuestionPrompt`,
  `buildTipPrompt` (a IA escolhe o tema, com as últimas publicações à frente para não repetir),
  `buildNewsPrompt` (pesquisa + formato `NOVO: <versão>` / `SEM NOVIDADE`), `validatePost`,
  `parseNewsReply` e `sanitizeAnswer`. Mudou o prompt? `npm run ia:gas` e `npm test`.
- `parseNewsReply` e `validatePost` são a única barreira contra um modelo que inventa: tamanho,
  menções, links, listas e formato. Não afrouxar.
- O Ollama e as APIs compatíveis com OpenAI **não pesquisam na Internet**: no PC as novidades ficam
  desligadas (`IA_PESQUISAR=0` por omissão). Quem pesquisa é o runner do Google.
- O runner é idempotente: o servidor reserva o dia (`ai_runs`), por isso o agendamento pode ter duas
  entradas (arranque + tarefa diária) sem duplicar.
- `run.mjs` importa `src/lib/instacraftAi.ts` diretamente — só funciona porque o Node 20+ remove os
  tipos e porque o único import de runtime desse ficheiro tem extensão (`./instacraft.ts`). Não
  remover essa extensão.
- Só se testa com `npm run ia:simular` ou `tests/iaDiaria.test.ts` (que corre contra um Ollama falso
  local). Nunca apontar os testes para a base de dados real: publicaria no feed.
- **Arranque automático**: `scripts/agendar-ia-diaria.ps1` põe um `.cmd` na pasta de Arranque do
  utilizador (corre ao iniciar sessão, sem privilégios) e cria uma tarefa diária de segurança.
  Nesta máquina `schtasks /sc onlogon` devolve **«Acesso negado»** sem administrador — não trocar a
  pasta de Arranque por um gatilho de início de sessão do Agendador. Como o PC acabou de ligar, o
  runner espera pela rede (`IA_ESPERA_REDE`, 180 s) e pelo Ollama (`IA_ESPERA_MODELO`, 90 s) e sai
  com código 3 se continuar sem rede, para o Windows poder repetir.

## IA no Google Apps Script (`scripts/ia-gas/`)

- Existe para a ronda **não depender de nenhum PC**: um trigger diário no Google chama
  `rondaDiaria`, que fala com o Supabase por `UrlFetchApp` e com o Gemini por API (plano gratuito,
  chave nas Propriedades do script). Passo a passo em `scripts/ia-gas/README.md`.
- **`scripts/ia-gas/Codigo.gs` é ficheiro gerado — nunca editar à mão.** É o que se cola no Google e
  é produzido por `npm run ia:gas` (`build.mjs`: esbuild junta `nucleo.mjs` +
  `src/lib/instacraftAi.ts` + `scripts/ia-diaria/modelo.mjs`, e acrescenta `ambiente.js`).
  `tests/iaGas.test.ts` falha se o ficheiro do repositório divergir do gerado e corre o ficheiro a
  sério num `vm` com um `UrlFetchApp` falso. Mudou o prompt ou o texto das publicações? `npm run
  ia:gas` e cola a versão nova no Google.
- **A pesquisa das novidades** vai no pedido do modelo (`tools: [{ google_search: {} }]`) e não se
  combina com o «pensamento» desligado. Se a conta/modelo não tiver pesquisa, o pedido falha, o núcleo
  trata isso como «hoje não há novidade» e o resto da ronda segue.
- **Nenhum nome de modelo do Gemini está escrito no código.** A Google aposenta modelos para chaves
  novas: o `gemini-2.5-flash`, que era o nome fixo, passou a responder `HTTP 404 "no longer available
  to new users"` e a ronda ficou sem dica. Agora o `ambiente.js` lê `/v1beta/models`, a escolha
  (versão mais alta, estável antes de `preview`, `flash` antes de `pro`/`lite`, fora
  embeddings/imagem/vídeo/áudio) é a função pura `candidatosGemini` em `modelo.mjs`, e um 404 faz
  passar ao modelo seguinte em vez de perder o dia. `GEMINI_MODELO` é só para **fixar** um modelo
  (vai à frente; se falhar, os outros continuam a ser tentados) e `verModelos()` mostra o que a chave
  tem. **Não voltar a pôr um nome fixo a valer sozinho.**
- **O Apps Script é síncrono** (a execução termina quando a função de entrada retorna, portanto
  `async`/`await` não serve). Daí `nucleo.mjs` ser síncrono e existir `escolherRespostaSync` ao lado
  de `escolherResposta`; o teste compara as duas decisões para não divergirem.
- **Orçamento de tempo**: 6 min por execução numa conta pessoal. `PRAZO_SEGUNDOS` (240) é o limite
  interno; passado ele, as menções que sobram ficam **pendentes** (nunca em `ignored`, senão
  perdiam-se para sempre) e não recebem resposta de conserva.
- **Segredos só nas Propriedades do script** (`SUPABASE_*`, `CONTA`, `SENHA`, `GEMINI_KEY`). O teste
  proíbe o endereço do projeto e a chave publicável dentro do `Codigo.gs`.
- Sem `Intl` no caminho da dica: `formatDayLong` usa uma tabela de meses (senão o Google escrevia
  «November 9» e a legenda deixava de ser reconhecida pelo trigger do patch 08).
- Google e PC são idempotentes entre si (o servidor reserva o dia), mas **só um deve estar ligado**:
  com o do Google validado, o do PC sai com `npm run ia:agendar -- -Remover`.

## Conta oficial («Instacraftmine»)

- Publica as atualizações da aplicação e tem o crachá **OFICIAL** (`src/components/instacraft/Tags.tsx`,
  `isOfficialChannel` em `src/lib/instacraft.ts`).
- Ao publicar, a conta oficial escolhe entre **informação** e **atualização** (`posts.kind`,
  `supabase/patch-09-publicacoes-oficiais.sql`, secção 19 do `schema.sql`):
  - **informação** — publicação normal do canal oficial, com **título** (`posts.title`) e corpo;
  - **atualização** — **de que versão para qual** (`version_from` → `version_to`) e **o que há de
    novo** (as linhas do corpo; as que começam por «-» aparecem como pontos da lista).
  - **As fotografias e o vídeo existem nos dois casos** — não tirar o carregamento de imagens do
    compositor para «arrumar» o formulário.
  - Só o canal oficial pode gravar `kind = 'update'`: o trigger `posts_kind_official_only` recusa o
    resto. O cliente não decide isto — decidir no cliente voltaria a abrir a porta a qualquer conta.
- A conta oficial é também a **moderadora** do Instacraft: pode apagar publicações de qualquer
  conta (`supabase/patch-10-moderacao-publicacoes.sql`, secção 20 do `schema.sql`). Quem decide é a
  base de dados, não o botão:
  - `public.is_official_account()` (security definer, lê `channels.official`) é a única fonte da
    verdade; a política `posts_delete_own_or_official` deixa o autor apagar as suas e a conta
    oficial apagar qualquer uma;
  - a política `storage_media_delete` passa a incluir a conta oficial, senão a publicação de outra
    conta desaparecia do feed e as fotografias ficavam no Storage para sempre;
  - não abrir `delete` a `anon` nem trocar isto por uma regra no cliente. O `PostCard` só mostra o
    botão quando `post.mine || moderator`; o `moderator` vem de `isOfficialChannel` sobre o canal de
    quem tem sessão.
  - `api.deletePost` pede as linhas apagadas (`select('id')`) e **falha com uma mensagem clara** se
    vierem zero: um DELETE barrado pelo RLS não devolve erro nenhum, e sem isto a interface dizia
    «apagada» e a publicação voltava ao recarregar.
- O crachá vem da coluna `channels.official` (`supabase/patch-05-conta-oficial.sql`, secção 15 do
  `schema.sql`), que está fora do alcance das contas por privilégios de coluna: com sessão só se
  escrevem `name`, `bio`, `avatar_path` e `banner_path`. Não devolver `insert/update` da tabela
  `channels` ao `authenticated` — isso voltaria a permitir que qualquer conta se promovesse a
  oficial. O crachá tem ainda a rede de segurança do endereço do canal, para bases de dados antigas.
- As leituras do feed usam `*` nas publicações: `kind`/`title`/`version_from`/`version_to` podem
  ainda não existir (patch 09 por correr) e uma lista fixa de colunas fazia o PostgREST recusar o
  pedido todo — o feed ficava vazio por causa de uma etiqueta.
- **Nunca guardar a palavra-passe da conta oficial** no repositório, em `.env`, em docs ou no
  `dist/`. É gerada no computador de quem administra com `npm run conta:oficial`
  (`scripts/conta-oficial-senha.mjs`) e criada pelo formulário de «Criar conta»; `tests/sqlPatches.test.ts`
  e `tests/contaOficial.test.ts` vigiam isso.

## Publicações antigas (limpeza automática, 10 dias)

- O Instacraft **não é um arquivo**: uma publicação com mais de **10 dias** sai da base de dados do
  Supabase (com os gostos e os comentários, por cascata) e as fotografias e os vídeos dela saem do
  Storage. O prazo está em `src/lib/retention.ts` (`POST_RETENTION_DAYS`) **e** na função SQL
  `public.posts_retention_days()` (`supabase/patch-12-publicacoes-antigas.sql`, secção 22 do
  `schema.sql`) — `tests/sqlPatches.test.ts` falha se os dois números divergirem.
- Quem apaga é a base de dados: `public.purge_old_posts()` (security definer, **sem parâmetros** —
  o browser não encurta o prazo para apagar publicações recentes de outras contas). A app só pede a
  limpeza, com sessão iniciada: ao arrancar (`src/App.tsx`, no máximo uma vez por hora) e ao abrir o
  Instacraft (`runHousekeeping({ force: true })`). Tudo em `src/lib/housekeeping.ts`, que falha em
  silêncio (sem rede, sem sessão, sem patch) e volta a tentar.
- **Os ficheiros não se apagam por SQL.** A Supabase é explícita: apagar a linha de `storage.objects`
  deixa o objeto órfão no bucket (continua a ocupar espaço e a ser servido). Por isso a função deixa
  os caminhos numa fila, `public.posts_purge_media`, e é a app que a esvazia pelo API do Storage
  (`api.purgeOldPosts`). Se a limpeza falhar a meio, as linhas ficam na fila e outra abertura da app
  acaba o trabalho — a fila vive na base de dados de propósito.
- A política `storage_media_delete` (patch 10) passa a deixar apagar **o que está na fila**, senão a
  limpeza corria em nome de quem tem a app aberta (que não é o autor) e o Storage recusava. As contas
  só leem a fila e apagam linhas dela: `insert`/`update` não são concedidos, senão qualquer conta
  punha lá o caminho da fotografia de outra pessoa e passava a poder apagá-la.
- O feed, o canal e as contagens filtram por `created_at >= retentionCutoff()` e a publicação aberta
  por link devolve 404 quando passou o prazo: a app nunca mostra o que devia ter saído, mesmo numa
  base de dados onde o patch 12 ainda não correu (aí aparece um aviso com o ficheiro SQL a correr).
- Uma fotografia repetida em duas publicações **não** entra na fila enquanto a publicação mais recente
  a usar — o `purge_old_posts()` ignora o que `posts` dentro do prazo ainda referencia.

## Contas verificadas (visto azul)

- São **outra coisa** do crachá OFICIAL e não se podem confundir: OFICIAL é dourado e é da conta da
  aplicação (`channels.official`); o verificado é azul, com visto, e é dado **pessoa a pessoa** em
  `profiles.verified` (`supabase/patch-06-verificados.sql`, secção 16 do `schema.sql`).
- Quem manda é a base de dados: o administrador marca a coluna no Table Editor ou com um `update`.
  Nunca tornar o verificado automático (por número de publicações, por nome, por seguidores).
- A coluna está fora do alcance das contas: `revoke insert, update on public.profiles from
  authenticated, anon`. Não devolver permissões de escrita na tabela `profiles` sem excluir
  `verified` — é isso que impede alguém de se verificar sozinho. A app só **lê** perfis (o perfil é
  criado pelo trigger `handle_new_user`, que corre como dono da tabela).
- Na interface, OFICIAL substitui o verificado (não aparecem os dois); o visto aparece nas
  publicações, no canal, na lista de canais e nos comentários. Os comentários mostram o visto porque
  a consulta passa a trazer o perfil (`profiles(*)`).

## Reportes de bugs e sugestões (botão «Reportar»)

- O botão vive no cabeçalho (ícone de bug) e em Definições → «Bugs e sugestões»;
  `src/state/ReportsProvider.tsx` guarda o estado e as duas janelas. Os reportes vão para
  `public.reports` (`supabase/patch-07-reportes.sql`, secção 17 do `schema.sql`).
- **A lista é só da conta oficial** (a dona do canal OFICIAL). Não é o verificado, não é «quem tem
  mais publicações»: `can_manage_reports()` olha só para `channels.official`. O cliente esconde o
  botão da lista no cabeçalho, o atalho no formulário e os botões em Definições, e nem monta a
  janela da lista (`ReportListDialog`) para as outras contas. Não mostrar a lista a mais ninguém.
- **Enviar exige sessão iniciada.** Não há cópia em `localStorage`: um reporte que fica no
  dispositivo nunca chega à conta oficial, por isso o formulário avisa e recusa o envio sem conta.
  O `author` é sempre `auth.uid()` e o `username` vai como cópia do nome.
- RLS + GRANT: cada conta lê só a linha que enviou (é o que permite o `insert ... returning` do
  PostgREST); a lista completa é da conta oficial. A conta insere só em nome próprio
  (`grant insert (author, username, kind, title, body)`) e nunca escreve `done`/`done_at`; a conta
  oficial só pode escrever `done` e `done_at`. Não abrir a tabela a `anon` nem devolver
  `insert/update` da tabela inteira.
- O Excel é gerado no cliente (`src/lib/xlsx.ts`, ZIP + OOXML, **sem dependências**) e tem de manter:
  bugs com linha vermelha, melhorias com linha verde, linhas feitas **rasuradas**, fundos claros com
  letra escura (legibilidade), cabeçalho fixo e filtros. `tests/reportsExcel.test.ts` vigia as cores,
  o rasurado e as colunas. O botão do Excel só aparece à conta oficial.


## Mapa do mundo (motor próprio)

- `src/lib/worldgen/mc/` é o motor de biomas do Minecraft **Java 1.18+** (Xoroshiro128++, Perlin
  duplo, clima, spline de profundidade e árvore de parâmetros). É validado contra o `cubiomes`, que
  é a referência usada pelos mapas de seed; não embutir sítios externos no mapa.
- As tabelas binárias por versão (`tools/mc-tables/btree-*.bin`) vêm dos dados do jogo e são
  geradas com `node scripts/build-mc-biome-tables.mjs --cubiomes <pasta-do-cubiomes>`. De seguida,
  `npm run mc:embutir` (parte do `npm run build`) transforma-as em base64 dentro de
  `src/lib/worldgen/mc/tabelasEmbutidas.ts` — é essa cópia que a app usa, porque abrir por
  `file://` não permite `fetch` de ficheiros locais. `tests/mcTables.test.ts` falha se as duas
  versões divergirem.
- O fixture `tests/fixtures/biomes.json` é gerado por
  `node scripts/build-biome-fixtures.mjs --oracle <oracle.exe>` (oráculo C do cubiomes) e o teste
  `tests/worldgen-real.test.ts` exige 100% de coincidência. Não alterar o motor sem manter este teste
  verde.
- O **Nether** (`mc/nether.ts`, 1.16+) e o **End** (`mc/end.ts`, 1.13+) também são reais e
  validados contra o oráculo (`tests/nether-real.test.ts`, `tests/end-real.test.ts`). A simulação
  (`src/lib/worldgen/biomes.ts`) fica para versões anteriores a 1.18 e para o **Bedrock** (não existe
  motor Bedrock aberto — não prometer fidelidade aí).
- Desempenho: uma amostra de clima custa ~5–10 µs; o renderizador limita o número de amostras por
  frame (orçamento) e usa resolução mais baixa durante o arrasto. Não amostrar mais fino do que a
  grelha de 4×4 blocos.
- Estruturas: as tentativas usam as mesmas constantes do jogo (`spacing`, `separation`, `salt`,
  `spread`) e a viabilidade é exata para 20 conjuntos (pirâmides, templos, cabanas, iglus, naufrágios,
  ruínas oceânicas, monumentos, mansões, postos, portais, tesouros, ruínas, minas, poços do deserto,
  geodos, aldeias, cidades antigas, câmaras de provas, complexos do Nether e cidades do End), validada contra
  o oráculo em `tests/structures-real.test.ts` (fixture
  `tests/fixtures/structures.json`). Inclui a verificação de terreno por profundidade (pirâmides,
  templos e mansões) e as variantes/jigsaw da peça inicial (aldeias, cidades antigas, câmaras de
  provas e a distinção fortaleza/bastião). As cidades do End verificam também a altura do terreno
  (`mc/endSurface.ts`: ruído de superfície do End + `getSurfaceHeight`). Limite conhecido: faltam os
  gateways do End. Não chamar "exato" a esse caso enquanto não estiver feito.
