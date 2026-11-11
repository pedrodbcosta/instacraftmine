# Instacraftmine

Gestor de **mundos**, **servidores** e **coordenadas** de Minecraft, com interface em pixel art
inspirada na interface clássica do jogo. Funciona como **site** e como **aplicação instalável (PWA)**,
guarda tudo **no dispositivo** e continua a funcionar **sem internet**. Com **sessão iniciada**, o
mesmo acervo fica na conta e aparece em qualquer dispositivo onde entrares.

![Página inicial](tests/screenshots/01-inicio-vazio.png)

---

## Versão

A versão da aplicação — hoje em fase **BETA** — vive num único sítio: `src/lib/appVersion.ts`.
O rodapé e Definições → Sobre leem dessa fonte, por isso não há números duplicados no código.

**Cada alteração à aplicação sobe a versão em uma unidade**:

```bash
npm run version:bump                # uma unidade (BETA 0.5 → BETA 0.6)
npm run version:bump -- "BETA 1.0"  # versão concreta
```

O script atualiza `src/lib/appVersion.ts`, `package.json` e `package-lock.json`; o teste
`tests/appVersion.test.ts` falha se ficarem dessincronizados. A regra completa (e o resto das
convenções do projeto) está em [AGENTS.md](AGENTS.md).

### Interface de computador e de telemóvel

A aplicação **deteta o dispositivo ao abrir** (`src/lib/device.ts`) e usa uma interface diferente em
cada um:

- **Computador:** menu no topo, duas colunas e listas e detalhes lado a lado.
- **Telemóvel e tablet:** barra superior fina com seta de voltar, menu em baixo ao alcance do
  polegar, uma coluna, cartões compactos, o mundo dividido em separadores **Mapa · Locais · Resumo**
  e formulários em ecrã inteiro com o botão de guardar sempre à vista.

A deteção usa o `navigator.userAgentData.mobile`, o `userAgent`, o tipo de ponteiro e a largura do
ecrã; um iPad a pedir o «site para computador» também é reconhecido. Uma janela de computador muito
estreita recebe a versão de telemóvel, que é a que cabe melhor. Em **Definições → Preferências →
Versão da interface** podes forçar *Automática*, *Computador* ou *Telemóvel*; a escolha fica guardada
**neste dispositivo** e não segue para a conta (tal como o identificador do dispositivo).

Ao tocar num campo ou num botão, a página **não amplia**: os campos têm 16 px (o mínimo para o Safari
do iPhone não fazer zoom ao escrever) e os elementos tocáveis usam `touch-action: manipulation`, que
desliga o zoom de duplo toque. O zoom de pinça continua disponível.

![Início no telemóvel](tests/screenshots/ui-check/mobile-02-inicio.png)
![Mundo no telemóvel, separador de locais](tests/screenshots/ui-check/mobile-04-mundo-locais.png)
![Início no computador](tests/screenshots/ui-check/desktop-01-inicio.png)

---

## 1. Como executar

Requisitos: **Node.js 20+** (testado com Node 24). Python 3 com Pillow é necessário apenas para
regerar ícones/texturas.

```bash
npm install        # instalar dependências
npm run dev        # servidor de desenvolvimento em http://localhost:5180
```

Para a versão de produção **com contas e Instacraft**, basta preparar o `.env` (secção
seguinte) e:

```bash
npm run build      # verifica os tipos e gera a pasta dist/
npm run publicar   # build + mostra (e abre) a pasta que se publica
```

**O mais simples de tudo: duplo clique em `dist\index.html`.** O `index.html` é autónomo — o
JavaScript e o CSS vão dentro do próprio ficheiro, as tabelas de biomas viajam embutidas e o
service worker só é registado em `http(s)` — por isso a aplicação arranca sem servidor nenhum,
com os dados no IndexedDB do navegador e as contas/Instacraft a falarem diretamente com o
**Supabase**. É também a mesma pasta (`dist/`) que se publica.

As contas, o Instacraft, os servidores partilhados e o chat não precisam de servidor local: a
aplicação fala diretamente com o **Supabase** (Auth, Postgres, Storage e Realtime). Sem as
variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no build, a app continua a
funcionar em modo local — mundos, servidores e coordenadas ficam no navegador — e explica que a
parte partilhada precisa da base de dados.

**No Windows, `iniciar-aplicacao.cmd`** faz o mesmo que o duplo clique, mas servindo os ficheiros
por HTTP (`http://127.0.0.1:4173`): instala as dependências na primeira vez, prepara a versão de
produção e abre o navegador. Só é preciso quando queres o service worker/PWA (instalação e
funcionamento offline) antes de publicar.

> **Dentro da app:** nos dois casos os dados ficam no navegador. Em `file://` o navegador trata
> todos os ficheiros locais como a mesma origem, por isso o armazenamento é partilhado entre
> sites abertos assim; para separar dados, usa a versão servida por HTTP.

> **Nota sobre HTTPS:** a instalação da PWA e o service worker exigem `https://` ou `localhost`/
> `127.0.0.1`. Se publicares o site num domínio, usa HTTPS.

### Publicar na internet

O site é estático e vai para a **Netlify**; as contas, o Instacraft, os servidores partilhados e o
chat vivem num projeto **Supabase** (gratuito). O passo a passo está em **[PUBLICAR.md](PUBLICAR.md)**.

| Onde | O que serve |
|---|---|
| **Netlify** (`netlify.toml`) | A interface: `npm run publicar` → arrastar a pasta `dist/` |
| **Supabase** (`supabase/schema.sql`) | Contas, sincronização do acervo por conta, Instacraft (posts/likes/comentários), servidores partilhados, chat e imagens |
| **Ligação** | `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no build |

Os dados privados (mundos, servidores, coordenadas) ficam sempre no navegador de cada pessoa — cópia
local que funciona offline — e, com sessão iniciada, também na conta (uma linha por entidade, visível
apenas para o próprio pelas políticas RLS).

### Aparecer nos motores de busca e nas IAs

O site é uma aplicação construída no navegador, por isso o HTML que um motor de busca recebe tem
pouco texto. Isto é o que faz o site ser encontrado:

| Ficheiro | Para quem | O que é |
| --- | --- | --- |
| [`public/llms.txt`](public/llms.txt) | assistentes de IA | resumo do site no formato [llms.txt](https://llmstxt.org): o que a aplicação é, o que faz e o que **não** faz |
| [`sobre.html`](sobre.html) | motores de busca e pessoas | a mesma explicação em HTML, sem JavaScript, com perguntas frequentes |
| [`public/sitemap.xml`](public/sitemap.xml) | Google e Bing | os endereços a indexar (`/` e `/sobre.html`); `npm run sitemap` reescreve-o |
| [`public/robots.txt`](public/robots.txt) | todos | nada bloqueado e os rastreadores de IA nomeados |
| [`public/og/og-image.png`](public/og/og-image.png) | redes sociais | cartão 1200×630 das partilhas (gerado por `npm run icons`) |
| [`index.html`](index.html) | todos | canónica, `og:*`, `twitter:*` e dados estruturados (schema.org) |

O endereço do site vive **só** no campo `homepage` do [`package.json`](package.json): nos HTML é
escrito como `%SITE_URL%` e trocado no build (ver `vite.config.ts`). As regras completas estão em
[AGENTS.md](AGENTS.md); o passo a passo da Search Console e do Bing está em
[PUBLICAR.md](PUBLICAR.md).

### Como instalar como aplicação

| Plataforma | Passos |
| --- | --- |
| Computador (Chrome/Edge) | Abre o site → ícone **Instalar** na barra de endereço, ou menu ⋮ → *Instalar aplicação* |
| Android (Chrome) | Menu ⋮ → *Adicionar ao ecrã principal* / *Instalar aplicação* |
| iPhone/iPad (Safari) | Botão **Partilhar** → *Adicionar ao ecrã principal* |

A app fica com ícone próprio (bloco de relva), abre em ecrã inteiro (sem barra de endereço) e funciona
offline. Em **Definições → Instalar a aplicação** existe um botão de instalação quando o navegador o
permite, e instruções quando não permite.

---

## 2. Funcionalidades

### Página inicial

- Destaque em céu com nuvens pixeladas e faixa de relva.
- Resumo com o número de **mundos**, **servidores**, **localizações** e **favoritos** (cada bloco abre a secção).
- Localizações recentes (com «Abrir» para o mundo respetivo), favoritos, distribuição dos locais por dimensão.
- Estado inicial explicativo com passos e opção de carregar **dados de exemplo**.

### Os meus mundos

- Nome, ícone (12 ícones pixel art), edição (Java/Bedrock/Outra), versão, modo de jogo
  (Sobrevivência, Criativo, Aventura, Espetador, Hardcore, Outro), descrição, estado
  (Ativo, Em pausa, Arquivado), notas pessoais, privado/público e favorito.
- **Seed** do mundo e **imagem de capa** (aparece no cartão e no topo do menu do mundo).
- Criar, consultar, editar, eliminar (com confirmação e aviso de cascata), pesquisar e filtrar
  por estado, edição, modo, visibilidade e favoritos, com ordenação.
- Cada cartão mostra quantas localizações o mundo tem e abre o **menu do mundo**.

### Menu do mundo (`#/mundos/<id>`)

Abrir um mundo dá acesso a um ecrã próprio, com endereço partilhável e tudo o que é daquele mundo:

- **Mapa do mundo**: **esboço local pela seed** com marcadores de todas as localizações guardadas
  (X/Z), separado por dimensão (Overworld, Nether, End), com zoom, arrastar para deslocar e
  «Recentrar». O mesmo par seed + dimensão desenha sempre o mesmo esboço, em qualquer dispositivo.
- **Mapa verdadeiro, com estruturas**: botão **«Abrir mapa real ↗»** que abre o
  [Chunk Base](https://www.chunkbase.com/apps/seed-map) com a **seed** e a **plataforma**
  (Java/Bedrock) já preenchidas, mais **«Copiar seed»** para colar onde quiseres.
- **Coordenadas do mundo**: lista agrupada por dimensão, com destaque `X | Y | Z`, cópia num clique,
  favoritos e acesso aos detalhes.
- **Resumo**: número de locais por dimensão, seed (com botão de copiar), datas e notas.
- Ações rápidas: adicionar localização já associada a este mundo, editar mundo (seed e imagem),
  eliminar ou abrir a lista global de coordenadas filtrada por este mundo.

> **Sobre o mapa:** o desenho dentro da app é uma **interpretação procedural da seed** (ruído
> determinístico com biomas, oceanos, rios, montanhas, Nether e End) e está identificado como
> «esboço local» — serve para dar contexto visual às coordenadas. **Não é a geração real do
> Minecraft**, porque isso exigiria o motor do jogo, versão a versão e edição a edição (em Bedrock
> não há forma fiável de o prever a partir da seed). Por isso o mapa verdadeiro — com biomas e
> **estruturas** reais — é aberto numa ferramenta dedicada, com a seed já levada de lá. Sem seed
> definida, o esboço é derivado do identificador do mundo (cada mundo fica na mesma com um desenho
> estável).

![Esboço local e ligação ao mapa real](tests/screenshots/10b-mapa-real.png)

### Os meus servidores

- Nome, descrição, edição, versão, endereço IP/domínio (**opcional**), porta, tipo de servidor, lista de
  jogadores/amigos, notas, estado, privado/público e **imagem de capa**.
- **O estado é sempre registado manualmente pelo utilizador.** A aplicação não contacta servidores:
  não há verificação em tempo real e a interface diz isso de forma explícita (etiqueta `manual`,
  aviso próprio e data da última atualização do estado).
- Porta sugerida automaticamente conforme a edição (25565 Java / 19132 Bedrock).
- Lista de jogadores com etiquetas (adicionar com Enter) e colagem de lista em bloco.

### Menu do servidor (`#/servidores/<id>`)

Cada servidor abre um menu próprio, no mesmo estilo do menu do mundo:

- **Capa** (imagem ou textura), nome, estado, edição/versão, tipo, visibilidade e favorito.
- **Chat do servidor** — ver secção seguinte.
- **Partilha e colaboradores** — partilhar o servidor, convidar pessoas e gerir membros.
- **Estado registado**, **jogadores/amigos**, **notas** e **informação** (endereço, tipo, datas).

### Chat do servidor (texto e fotografias)

- **Privado entre as pessoas do servidor**: só quem é membro lê e escreve.
- **Partilhar servidor**: o dono cria a versão partilhada e **convida colaboradores pelo nome de
  utilizador** — só contas que já existam na aplicação (não há convites por email nem lista pública
  de contas; se o nome não existir, a aplicação diz isso).
- O colaborador entra na sua conta, vê o servidor em **«Servidores partilhados contigo»** e adiciona-o
  para participar.
- **Mensagens em direto** (sem recarregar), com **fotografias** (reduzidas no dispositivo antes do
  envio). `Enter` envia, `Shift+Enter` muda de linha.
- **Recupera o que falhou**: se a ligação cair ou o separador estiver inativo, ao voltar/reconectar
  vai buscar as mensagens que faltam (`?after=<última>`) — não é preciso recarregar. Se não conseguir
  ligar, o chat diz o motivo e tem **«Tentar de novo»** (401/403 param de tentar).
- As fotografias do chat **não são públicas**: são servidas apenas a membros do servidor.
- O dono pode remover colaboradores, e «Deixar de partilhar» apaga o chat e as fotografias.
- O histórico guarda as últimas 400 mensagens por servidor (as mais antigas e as respetivas
  fotografias são removidas automaticamente).
- **Uma conta por navegador**: a sessão é guardada no navegador, por isso duas abas são a mesma
  pessoa. Para conversar com outra conta ao mesmo tempo, usa outro navegador ou uma **janela
  privada** — se a conta mudar noutra aba, os restantes separadores acompanham.

![Chat do servidor com fotografias](tests/screenshots/17-chat-servidor.png)
![Chat visto pela segunda conta](tests/screenshots/22-chat-bruno.png)

### Coordenadas (dentro de cada mundo **ou servidor**)

O menu de cima tem **cinco secções**: Início, Mundos, Servidores, Instacraft e Favoritos (mais
Definições). As **coordenadas vivem dentro do mundo ou do servidor** a que pertencem — cada um tem a
sua lista, o seu formulário e, nos mundos, o seu mapa. Endereços antigos `#/coordenadas…` passam a
abrir a lista de mundos.

- Nos **servidores**, a mesma lista de coordenadas aparece no menu do servidor, com um atalho
  **«Nova coordenada»** no topo (o mapa é do mundo, por isso um servidor não tem mapa próprio). Um
  local pertence sempre a um mundo **ou** a um servidor, nunca aos dois.
- **Coordenadas privadas e públicas nos servidores:** o painel tem dois separadores. As **privadas**
  ficam na tua conta (com categoria, imagem e favorito). As **públicas** ficam no servidor partilhado
  e são vistas por **todos os colaboradores**, com o nome de quem as acrescentou; só o autor (ou o
  dono do servidor) as edita ou apaga. As públicas são simples de propósito — nome, coordenadas,
  dimensão e notas — para não transportarem imagens para a base de dados.
- As coordenadas públicas precisam do servidor partilhado (painel do chat) e da tabela criada por
  `supabase/patch-11-coordenadas-partilhadas.sql` (secção 21 do `schema.sql`, para instalações novas).
  Sem essa atualização, a app avisa e as coordenadas privadas continuam a funcionar.
- Nome, **X, Y e Z** em campos separados, dimensão (Overworld/Nether/End), categoria,
  descrição/notas, favorito e datas.
- **Colar coordenadas:** aceita `120 68 -340`, `X: 120, Y: 68, Z: -340`, `(120, 68, -340)` e
  `/tp @s 120 68 -340` — preenche os campos automaticamente.
- Coordenadas sempre visíveis no formato `X: 120 | Y: 68 | Z: -340`.
- **Copiar coordenadas** num clique (formato pastável no jogo `120 68 -340`), além de
  *Copiar /tp* e *Copiar legível* no detalhe.
- Lista **agrupada por dimensão**, com contagem por grupo e atalho «adicionar» em cada grupo.
- **Imagem por localização** (fotografia ou captura de ecrã): aparece na lista, nos cartões e no detalhe.
- Categorias: Base, Estrutura, Aldeia, Mina, Portal do Nether, Portal do End, Fortaleza, Cidade Antiga,
  Monumento oceânico, Mansão da floresta, Posto de saqueadores, Fazenda, Local de recursos,
  Ponto de interesse e Outro — todas renomeáveis, com ícone e cor, e é possível criar novas.
- Avisos (não bloqueantes) quando o Y está fora do intervalo habitual do jogo.
- Atalhos a partir de outros ecrãs: «Nova localização» abre o mundo predefinido (ou o primeiro servidor,
  se ainda não houver mundos) já com o formulário aberto; nas listas da página inicial e dos favoritos,
  «Abrir» leva ao local dentro do mundo (`#/mundos/<id>?local=<id>`) ou do servidor
  (`#/servidores/<id>?local=<id>`).

### Tarefas (mundos e servidores)

Cada mundo e cada servidor tem uma **lista de tarefas** («o que falta fazer»), no painel dos
detalhes:

- **Mundos:** tarefas simples — escrever, marcar como feita, eliminar. Ficam guardadas dentro do mundo
  e viajam com ele na sincronização da conta.
- **Servidores:** dois separadores:
  - **Privadas** — ficam na tua conta, como as tarefas dos mundos; mais ninguém as vê.
  - **Públicas** — ficam no servidor partilhado e são vistas por **todos os colaboradores**, que também
    podem marcar como feitas. Fica registado quem marcou. Só o autor (ou o dono do servidor) pode
    apagar.
- As públicas precisam do servidor partilhado (painel do chat) e da tabela criada por
  `supabase/patch-03-tarefas.sql` (já incluída na secção 13 do `schema.sql`, para instalações novas).
  Sem essa atualização, a app avisa e as tarefas privadas continuam a funcionar.
- As tarefas mostram quantas faltam e quantas estão feitas, e as feitas ficam no fim da lista, com o
  rasto de quem as marcou.

### Favoritos

- Separadores para localizações, mundos e servidores, com contagem.
- Remover dos favoritos, editar e eliminar sem sair da página.

### Instacraft (rede social de Minecraft)

O menu **Instacraft** é a rede social da aplicação (substituiu os antigos projetos públicos):

- **Feed público**: qualquer pessoa vê as publicações, mesmo sem conta. Ordenado das mais recentes
  para as mais antigas, com paginação por cursor.
- **Sem arquivo**: passados **10 dias**, a publicação é apagada da base de dados (com os likes e os
  comentários) e as fotografias e os vídeos que tiver saem do Storage. O prazo está na base de dados
  (`public.purge_old_posts()`, `supabase/patch-12-publicacoes-antigas.sql`) e não vem do browser; a
  app só pede a limpeza ao abrir, com sessão iniciada. Ver `AGENTS.md` → «Publicações antigas».
- **Publicações com fotografia, vídeo ou só texto**: legenda até 900 caracteres, **até 8 fotografias**
  (comprimidas no dispositivo) e **vídeo por link** — YouTube, Vimeo, TikTok ou ficheiro `.mp4/.webm`.
  O vídeo é validado no servidor e mostrado em `embed`/`<video>` dentro do cartão.
- **Várias fotografias deslizam para o lado**, como no Instagram: uma de cada vez, com indicadores de
  posição, setas (rato/teclado) e abertura em grande com o mesmo gesto de deslize.
- Contém ainda **mundo**, **versão** e **coordenadas opcionais** (X/Y/Z + dimensão) como referência.
- **Likes** (um por conta, sem duplicar) e **comentários** (públicos; apagáveis pelo autor do
  comentário ou pelo dono da publicação).
- **Canais**: cada conta tem o seu canal (`#/instacraft?canal=<nome>`), com nome, descrição, avatar,
  banner e todas as suas publicações. A lista de canais aparece na barra lateral; o canal é criado
  automaticamente na primeira publicação.
- **Página própria por publicação** (`#/instacraft?publicacao=<id>`) para partilhar o link.
- O autor apaga a publicação (com confirmação) — likes, comentários e a fotografia são removidos do
  servidor.
- Nota honesta: **os vídeos não são carregados** para o servidor (só o link), para não haver custos de
  armazenamento nem limites de tamanho. As **fotografias** são carregadas e servidas pelo servidor.

#### Minecraft AI (a conta automática)

O Instacraft tem uma conta de serviço com canal próprio: **Minecraft AI** (`@MinecraftAI`,
`#/instacraft?canal=minecraftai`). Quem escreve é **um modelo de IA** — o do Google (Gemini, grátis)
ou um modelo local no PC — e a base de dados só guarda a identidade e a marca de água do dia.

- **Uma vez por dia, responde a todas as menções** `@MinecraftAI`: lê o texto, procura uma pergunta
  (ponto de interrogação ou palavras como *como / onde / qual / porque / explica*) e comenta a
  resposta na mesma publicação. **Se não houver pergunta, fica calada** — fica registado que a menção
  foi vista para não ser reavaliada todos os dias.
- **A dica do dia é escolhida pela IA.** Ela recebe as últimas publicações da conta (para não
  repetir) e escreve a dica ou o facto; a moldura — `Dica do dia — <data>` + convite a mencionar —
  é que é fixa.
- **As novidades são pesquisadas pela IA**: ela procura na Internet as versões e anúncios recentes e
  só fala do que encontrar, **uma única vez por versão** (`ai_versions`). Se não houver nada, não
  publica nada.
- **Sem IA não há publicação.** A antiga base de regras (respostas e dicas escritas à mão) foi
  apagada de propósito. Se o modelo falhar — quota, chave, rede — a dica desse dia não sai e as
  menções com pergunta ficam **pendentes** para a ronda seguinte; não recebem uma resposta de
  conserva.
- **Uma ronda por dia, garantida pelo servidor**: o dia é reservado com `insert … on conflict do
  nothing` em `ai_runs (day)`, e quem corre a ronda é o runner do Google ou o do PC (nunca o
  browser, que não pode ter a chave de um modelo). Chegar tarde devolve «já correu hoje».
- **E garantida outra vez na tabela** (`supabase/patch-08-uma-dica-por-dia.sql`): um trigger recusa
  uma segunda publicação com o formato da dica no mesmo dia. A reserva em `ai_runs` só protege
  enquanto a linha existir — se for apagada no Table Editor, a ronda volta a correr no mesmo dia. Foi
  o que aconteceu a 8 e 9 de novembro (o feed ficou com a mesma dica repetida); o patch limpa essas
  repetições e fecha o caminho.
- A conta **não tem login utilizável**: o patch cria-a em `auth.users` com um hash de uma
  palavra-passe aleatória e sem identidade de email, e as escritas passam por funções
  `SECURITY DEFINER` (`minecraft_ai_status()`, `minecraft_ai_run()`) que só aceitam menções reais e
  recusam respostas que contenham `@MinecraftAI` (senão responderia a si própria para sempre).
- O limite é de 12 respostas por ronda, 600 caracteres por comentário e 900 por publicação.
- O cartão do Instacraft mostra só o estado do dia (o que ela já fez e as menções à espera): a ronda
  corre fora do browser.
- **Requer** `supabase/patch-04-ia-minecraft.sql` e `supabase/patch-08-uma-dica-por-dia.sql` (já
  incluídas nas secções 14 e 18 do `schema.sql`, para instalações novas). Sem o patch 04, o cartão do
  Minecraft AI explica o que fazer e o resto do Instacraft continua a funcionar.

![Cartão do Minecraft AI no Instacraft](tests/screenshots/24-instacraft-minecraft-ai.png)

#### IA a correr no teu PC (modelo local, grátis)

Alternativa ao Google: o modelo corre **no teu PC**, com o [Ollama](https://ollama.com) (grátis,
offline, sem chaves de API), **uma vez por dia**, sozinho. A dica e as respostas continuam a ser
escritas pelo modelo — aqui não há base de regras nenhuma.

Limite honesto desta opção: o Ollama **não pesquisa na Internet**, por isso no PC as novidades ficam
desligadas (`IA_PESQUISAR=0` por omissão). Quem pesquisa as atualizações é o runner do Google.

**1. Instalar o modelo**

```powershell
winget install Ollama.Ollama     # ou o instalador de https://ollama.com
ollama pull qwen2.5:3b           # ~2 GB; com 16 GB de RAM, qwen2.5:7b responde melhor
```

**2. Configuração (fora do projeto, nunca no código)**

Cria `%USERPROFILE%\.instacraftmine\ia.env`:

```
IA_SUPABASE_URL=https://o-teu-projeto.supabase.co
IA_SUPABASE_KEY=sb_publishable_...
IA_CONTA=nome_de_utilizador
IA_SENHA=palavra_passe
```

`IA_CONTA`/`IA_SENHA` são de **qualquer** conta da app (serve só para ter sessão; quem escreve é
sempre o Minecraft AI). Se preferires, cria uma conta só para isto com `npm run conta:oficial`.
Opções: `IA_MODELO`, `IA_OLLAMA_URL`, `IA_PROVEDOR=openai` para uma API compatível (Groq,
OpenRouter, LM Studio), `IA_CHAVE`, `IA_PESQUISAR=1` (só com um modelo que pesquise).

**3. Testar sem publicar e ligar o automático**

```powershell
npm run ia:simular     # mostra a dica e as respostas que seriam publicadas
npm run ia:diaria      # corre a ronda agora
npm run ia:agendar     # passa a correr sozinha quando ligares o PC
```

O que o `ia:agendar` faz:

- **Arranque com o Windows** (o principal): põe `Instacraftmine IA.cmd` na pasta de Arranque
  (`shell:startup`). Corre **30 segundos depois de iniciares sessão** — sem administrador e sem
  guardar a tua palavra-passe do Windows em lado nenhum.
  - Antes disso o Windows ainda não tem rede nem o Ollama ligados, por isso o próprio programa
    **espera pela internet (até 3 min) e pelo Ollama (até 90 s)** antes de desistir.
  - `-Atraso 60` aumenta a espera inicial; `IA_ESPERA_REDE` / `IA_ESPERA_MODELO` no `ia.env`
    controlam as esperas internas.
- **Tarefa diária às 09:05** (rede de segurança, no Agendador de Tarefas): cobre o caso de a ronda
  do arranque ter falhado. Se o dia já correu, não faz nada.
- Correr mais do que uma vez **não duplica nada**: o servidor reserva o dia (`ai_runs`) e o trigger
  do patch 08 recusa uma segunda dica no mesmo dia mesmo que a reserva desapareça.
- Registo de cada execução: `%LOCALAPPDATA%\Instacraftmine\ia-diaria.log`.
- Desligar tudo: `npm run ia:agendar -- -Remover`.

> Nota de Windows: as tarefas com gatilho «ao iniciar sessão» no Agendador de Tarefas são
> **recusadas sem privilégios de administrador** nesta máquina (`schtasks` devolve «Acesso negado»).
> A pasta de Arranque não tem esse problema e dá o mesmo resultado: a ronda acontece quando ligas o
> PC. Uma tarefa «ao arrancar» (antes do login) exigiria guardar a palavra-passe do Windows e correria
> sem rede — não vale a pena.

#### IA no Google Apps Script (sem PC nenhum)

Se não quiseres que a ronda dependa do teu computador, ela corre **no Google**:
`npm run ia:gas` gera `scripts/ia-gas/Codigo.gs` (o núcleo do projeto + a cola do Apps Script, num
só ficheiro) e tu colas-o em <https://script.google.com>. Passo a passo em
[`scripts/ia-gas/README.md`](scripts/ia-gas/README.md).

- Um **trigger diário** chama `rondaDiaria` à hora que escolheres — sem PC, sem Ollama.
- O modelo é por **API** (Gemini em plano gratuito, com a chave nas propriedades do script). É ele que
  escolhe a dica, escreve as respostas e — com a **pesquisa do Google** ligada — procura as novidades
  do jogo: sem modelo, esta ronda não publica nada.
- O `ai_runs` e o trigger do patch 08 continuam a garantir **uma ronda por dia**, seja o Google seja
  o PC a chamar. Só um dos dois deve ficar ligado: o do PC desliga-se com
  `npm run ia:agendar -- -Remover`.
- Limites honestos: **6 minutos** por execução (conta Google pessoal) e as quotas do plano gratuito
  do modelo. Quando o tempo acaba, as menções que sobram ficam **pendentes** para o dia seguinte em
  vez de serem dadas por vistas.
- O `Codigo.gs` é **gerado**: mudou a base de conhecimento, as dicas ou os prompts? `npm run ia:gas`,
  `npm test` (que compara o ficheiro do repositório com o gerado) e cola a versão nova no Google.


#### Conta oficial (Instacraftmine)

Há uma conta marcada como **OFICIAL**, para as novidades da aplicação: `Instacraftmine`
(`#/instacraft?canal=instacraftmine`).

- As publicações dela têm uma **faixa dourada** e o crachá **OFICIAL**; o canal mostra um aviso a dizer
  que é ali que saem as atualizações; na lista de canais aparece em destaque.
- O crachá **não** é decidido pelo nome nem pelo cliente: vem da coluna `channels.official`
  (`supabase/patch-05-conta-oficial.sql`). Essa coluna foi tirada do alcance das contas através de
  privilégios por coluna — quem tem sessão só pode escrever `name`, `bio`, `avatar_path` e
  `banner_path` no próprio canal, por isso **ninguém se consegue promover a oficial** (nem com um
  pedido direto ao Supabase). Só o SQL Editor o faz.
- O crachá aparece também por comparação do endereço do canal (`instacraftmine`) enquanto a coluna
  não existir, para a base de dados antiga não ficar sem crachá.
- **A palavra-passe não existe no código.** É gerada no teu computador com
  `npm run conta:oficial` (24 caracteres, ~147 bits, `node:crypto`; nunca `Math.random`), mostrada
  uma vez no terminal e criada no Supabase pelo formulário normal de «Criar conta» — o código-fonte
  só sabe gerar palavras-passe, não sabe qual é a tua. Se a perderes:
  `npm run conta:oficial -- --redefinir` imprime o SQL de troca de palavra-passe.
  O script recusa-se a gravar credenciais dentro do projeto.

##### Informação ou atualização

Ao publicar no canal oficial, aparece uma escolha que as outras contas não têm:

- **Informação** — uma publicação normal, mas com **título** e **corpo**. Serve para avisos,
  explicações e novidades que não são uma versão.
- **Atualização** — o formulário muda: **de que versão para qual** (por exemplo, a versão anterior
  para a que a app mostra agora em Definições → Sobre) e **o que há de novo**, uma alteração por
  linha. As linhas que começam por «-» aparecem como pontos da lista, e a publicação mostra um
  crachá dourado **Atualização** com as duas versões.

**As fotografias continuam iguais nos dois casos** (até 8, tal como em qualquer publicação), e o
vídeo também. Uma atualização pode levar imagens das novidades.

Isto vive em quatro colunas de `public.posts` (`kind`, `title`, `version_from`, `version_to`) —
[`supabase/patch-09-publicacoes-oficiais.sql`](supabase/patch-09-publicacoes-oficiais.sql). Sem esse
patch, o feed continua a funcionar (as publicações antigas são posts normais), mas as informações e
atualizações não se gravam: a app diz exatamente qual é o ficheiro a correr. Quem garante que só a
conta oficial publica atualizações é um **trigger** na base de dados, não o formulário.

##### Apagar publicações de qualquer conta

A conta oficial é também a **moderadora** do Instacraft: em qualquer publicação aparece o botão de
apagar, mesmo nas de outras contas, com os likes, os comentários e os ficheiros dela. A janela de
confirmação diz de que canal é a publicação, para não haver enganos.

Quem manda é a base de dados,
[`supabase/patch-10-moderacao-publicacoes.sql`](supabase/patch-10-moderacao-publicacoes.sql):

- `public.is_official_account()` responde «sim» só a quem tem o canal marcado como oficial;
- a política `posts_delete_own_or_official` deixa o autor apagar as suas e a conta oficial apagar
  qualquer uma;
- a política dos ficheiros (`storage_media_delete`) passa a incluir a conta oficial — sem isso a
  publicação desaparecia do feed e as fotografias ficavam no Storage para sempre.

Nenhuma conta se promove a moderadora: `channels.official` continua fora do alcance das contas.
Sem o patch, o botão aparece só nas publicações da própria conta (a base de dados recusa o resto).

#### Contas verificadas (visto azul)

Há um **visto azul** de conta verificada, que **não** é o crachá OFICIAL — são coisas diferentes:

| | Crachá | Quem tem | Onde vive |
|---|---|---|---|
| Conta oficial | **OFICIAL**, dourado | a conta da aplicação (uma só) | `channels.official` |
| Conta verificada | **✓ VERIFICADO**, azul | quem tu quiseres | `profiles.verified` |
| Conta automática | **IA**, cinzento | o Minecraft AI | conta criada pelo patch 04 |

- **És tu que decides, na base de dados.** Depois de correr
  [`supabase/patch-06-verificados.sql`](supabase/patch-06-verificados.sql), basta marcar a caixa da
  coluna `verified` em **Table Editor → profiles**, ou usar uma linha de SQL:

  ```sql
  update public.profiles set verified = true  where username_lower = 'pedro';  -- dar
  update public.profiles set verified = false where username_lower = 'pedro';  -- tirar
  select username, verified from public.profiles where verified;                -- quem tem
  ```

- O visto aparece ao lado do nome **nas publicações, no canal, na lista de canais e nos
  comentários** — os comentários também passam a mostrar o perfil de quem escreveu.
- **Ninguém se verifica a si próprio**: a coluna foi retirada do alcance das contas com privilégios
  por coluna (`revoke insert, update on public.profiles`), por isso não há forma de o ligar pela
  consola do browser nem por um pedido direto ao Supabase.
- Bases de dados sem o patch continuam a funcionar: o feed lê `profiles(*)` e o visto aparece quando
  a coluna existir.

![Visto de verificado numa publicação](tests/screenshots/25-instacraft-verificado.png)

> Sai do dispositivo o que precisas de partilhar: contas, o acervo sincronizado da conta, publicações,
> likes, comentários e imagens no **Supabase**. Sem base de dados configurada, a aplicação continua a
> funcionar em modo local e explica que a rede social e a sincronização estão indisponíveis.

![Compor uma publicação com várias fotografias](tests/screenshots/15a-instacraft-fotos.png)
![Instacraft](tests/screenshots/15-instacraft.png)
![Comentários no Instacraft](tests/screenshots/16-instacraft-comentarios.png)

### Definições

- **Conta e versão do jogo**: conta com **nome de utilizador e palavra-passe** (entrar, criar conta,
  sair) e **versão do jogo predefinida**, que por omissão **segue sempre a versão mais recente**:
  - a versão Java é detetada no **manifesto público da Mojang** (`/api/game-versions`, com cache de
    6 horas); sem internet, usa a versão conhecida pela aplicação e diz isso no ecrã;
  - o **Bedrock** não tem manifesto público, por isso usa a referência da aplicação (e o ecrã avisa);
  - **mudar é sempre possível**: desliga «Usar sempre a versão mais recente» e escreve a versão que
    quiseres (essa passa a ser a predefinição).
  - a edição e a versão escolhidas pré-preenchem novos mundos e servidores, incluindo a **porta
    sugerida** (25565 Java / 19132 Bedrock).
- Perfil (nome de jogador), dimensão e mundo predefinidos, densidade das listas, animações,
  confirmação antes de eliminar e **versão da interface** (automática, computador ou telemóvel).
  Esta última é uma preferência deste dispositivo e não é sincronizada para a conta.
- Gestão de categorias (criar, renomear, mudar ícone/cor, eliminar — as predefinidas não são elimináveis).
- **Dados:** uso do armazenamento, exportar cópia de segurança em JSON, importar (modos *Juntar* ou
  *Substituir*), carregar dados de exemplo e apagar tudo (com confirmação).
- **Sincronização com a conta:** estado, última sincronização, alterações por enviar, «Sincronizar
  agora» e a escolha a fazer quando o dispositivo tem dados de outra conta.
- **Instalação** da PWA e estado do armazenamento (motor, persistência, alterações por enviar).

![Conta e versão do jogo](tests/screenshots/18-definicoes-conta.png)

### Bugs e sugestões (reportar)

- Botão no **cabeçalho** (ícone de bug) e em **Definições → Bugs e sugestões**.
- Formulário simples: **Bug** ou **Melhoria**, título e mensagem, assinado com o nome de utilizador
  da conta. É preciso ter sessão iniciada — sem conta o envio é recusado, para o reporte não ficar
  invisível no dispositivo.
- **A lista é só da conta oficial** (Instacraftmine): o botão no cabeçalho, o atalho no formulário e
  os botões em Definições só aparecem quando entras com essa conta. Todas as outras contas enviam
  reportes mas não veem a lista.
- **Lista** com filtros (bugs, melhorias, esconder feitos) e o estado de cada reporte. A conta
  oficial marca o que já fez e a linha fica **rasurada**.
- **Descarregar Excel** (`.xlsx`): nome de utilizador, tipo, título, mensagem, estado e data. Os bugs
  ficam com a linha **vermelha** e as melhorias com a linha **verde** — em fundos claros, para o texto
  se ler bem — e as linhas já feitas vão **rasuradas**.
- Os reportes seguem para a tabela `reports` do Supabase
  ([`supabase/patch-07-reportes.sql`](supabase/patch-07-reportes.sql)).

---

## 3. Onde ficam os dados

**No dispositivo:** tudo o que é teu — mundos, servidores, localizações, notas e imagens — fica em
**IndexedDB** (base `blocos-coordenadas`). Sobrevive a recarregamentos, fecho do separador e reinício,
funciona sem internet e é a cópia de que a interface lê. Em alternativa (navegador sem IndexedDB), a
app usa memória e avisa que os dados não serão guardados.

**Na conta (com sessão iniciada):** o mesmo acervo fica em `library_records` no Supabase — uma linha
por mundo, servidor, local, categoria e para as preferências. As políticas RLS só deixam cada conta ver
as suas linhas. É isto que faz com que entres na conta no telemóvel e tenhas lá tudo o que criaste no
computador. Ver a secção seguinte.

**Na base de dados partilhada:** além do acervo de cada conta, **contas** (nome de utilizador e
palavra-passe gerida pelo Supabase Auth, nunca guardada em claro), **publicações do Instacraft**
(likes e comentários), **servidores partilhados**, **tarefas e coordenadas públicas** desses
servidores, **mensagens** e as **imagens** dessas publicações (no Storage). A segurança está nas
políticas RLS de `supabase/schema.sql`. As sessões são renovadas automaticamente e podem ser
terminadas em «Sair».

A aplicação pede ao navegador **armazenamento persistente** para reduzir o risco de despejo por falta
de espaço; o resultado é mostrado nas Definições.

### Sincronização entre dispositivos

Com sessão iniciada, o acervo segue-te para qualquer dispositivo. O motor está em `src/lib/sync.ts` e
a parte do servidor é a secção 12 de `supabase/schema.sql` (ou `supabase/patch-02-sincronizacao.sql`):

- **Fila de envio local:** cada escrita ou eliminação deixa um registo em `changes`, que só é apagado
  depois de a conta confirmar. Sem internet, a fila espera.
- **Conflitos:** «último a escrever ganha» pelo `updatedAt` de cada entidade. O servidor responde sempre
  com a versão que ficou guardada, por isso o dispositivo que perdeu corrige-se sozinho.
- **Eliminações:** viajam como lápides (`deleted`), para que apagar num dispositivo apague nos outros.
- **Incremental:** cada linha tem uma revisão (`rev`); o dispositivo guarda a última que viu e só pede o
  que veio depois. Outra instância da mesma conta avisa por *Realtime*; há ainda uma revisão ao voltar à
  página e a cada 2 minutos.
- **Contas diferentes no mesmo navegador:** os dados locais têm um dono. Ao entrar com outra conta, a
  aplicação não mistura acervos — perguntas se queres carregar os dados da conta ou enviar os deste
  dispositivo (com confirmação, porque o acervo local é substituído).
- **Apagar tudo** com sessão iniciada apaga também na conta (`stamp + 1` nas sementes para vencer as
  lápides): os outros dispositivos ficam vazios na sincronização seguinte.

Sem conta, nada disto acontece: os dados ficam no dispositivo e o caminho para os levar a outro continua
a ser **Exportar/Importar** (JSON versionado).

---

## 4. Tecnologia e estrutura

- **React 19 + TypeScript + Vite** — componentes reutilizáveis, interface separada da lógica.
- **CSS próprio** (sem framework): variáveis, relevos de botões, texturas pixel art e `image-rendering: pixelated`.
- **IndexedDB** com camada de repositório genérica (`src/lib/repository.ts`).
- **PWA** com `vite-plugin-pwa` (Workbox): manifesto, ícones, atalhos e *precache* de todos os ficheiros.
- **Tipografia Monocraft** (licença MIT, inspirada na fonte do Minecraft), incluída no pacote.

```
src/
  components/        # UI reutilizável (botões, painéis, formulários, cartões, janelas)
    entities/        # cartões e detalhes de mundos, servidores e localizações (+ mapa)
    forms/           # formulários de mundo, servidor, localização e categoria
    instacraft/      # carrossel de fotografias das publicações (deslize + vista em grande)
    chat/            # chat do servidor e imagens protegidas
    ui/              # primitivas de interface
  lib/               # lógica pura: tipos, validação, formatação, pesquisa, exportação, mapa, API
  pages/             # uma página por secção do menu
  state/             # contexto de dados, conta, notificações, encaminhamento, instalação
  styles/            # base, componentes, páginas, chat e Instacraft
  assets/            # fonte e texturas geradas
supabase/
  schema.sql         # tabelas, políticas RLS, triggers e buckets do Storage
public/icons/        # favicon e ícones da aplicação instalável
public/og/           # cartão de partilha (Open Graph, 1200×630)
public/llms.txt      # resumo do site para assistentes de IA
sobre.html           # página de texto (SEO e IAs), publicada ao lado do index.html
scripts/             # servidor estático, versão, mapa do site e empacotamento para a Netlify
tools/               # geração de texturas/ícones/cartão de partilha e verificações (Python)
tests/               # testes unitários (vitest) e capturas usadas neste README
netlify.toml         # site estático na Netlify (build, fallback da SPA, cabeçalhos)
PUBLICAR.md          # guia de publicação (Supabase + Netlify)
.env.example         # VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
```

### Elementos visuais

- Céu azul em gradiente com nuvens pixeladas animadas e faixa de relva no fundo do ecrã.
- Botões cinzentos com relevo, contorno preto e sombra sólida; **verde** no hover e no estado ativo.
- Painéis escuros translúcidos, contornos pretos, sombras simples e aspeto de blocos.
- Ícones desenhados à mão em pixel art (56 sprites), renderizados em SVG (sem imagens desfocadas).
- Texturas de terra, relva, pedra, calçada, tábuas e ardósia geradas com ruído determinístico.

---

## 5. Verificação

```bash
npm run typecheck   # TypeScript sem erros
npm test            # testes unitários (vitest)
npm run build       # build de produção
npm run publicar    # build + mostra a pasta dist/ (é esta que se publica)
npm run verificar:file  # abre dist/index.html por file:// num Edge headless
```

Os testes unitários cobrem a leitura/escrita de coordenadas, os filtros e a pesquisa (incluindo
acentos), a validação de todos os formulários, a **versão do jogo predefinida** (versão mais recente
detetada, versão fixa, edição e porta sugerida, leitura e cache do manifesto da Mojang), a
exportação/importação de cópias, a camada de armazenamento IndexedDB, a integridade dos sprites, a
validação de imagens, a **determinismo do mapa** e os formatos do Instacraft.

Os ficheiros que fazem o site aparecer nos motores de busca e nas IAs também são testados
(`tests/seo.test.ts` e `tests/sitemap.test.ts`): a canónica e os dados estruturados do `index.html`
apontam para o domínio do `package.json`, o `llms.txt` segue o formato e não inventa
funcionalidades, a imagem de partilha tem 1200×630 e o mapa lista exatamente as páginas que existem.

A parte partilhada (contas, Instacraft, servidores e chat) é validada contra o Supabase e sobretudo
pelas **políticas RLS** de `supabase/schema.sql`: escrita sem sessão é recusada, cada pessoa só
altera o que é seu, e servidores e mensagens só ficam visíveis para os membros.

As imagens em `tests/screenshots/` são capturas das principais vistas da aplicação, usadas ao longo
deste README.

![Menu do mundo com mapa pela seed](tests/screenshots/10-mundo-mapa.png)

![Coordenadas em telemóvel](tests/screenshots/12-telemovel-coordenadas.png)

---

## 6. Regerar ícones e texturas

Os ícones da aplicação (favicon, 192/512, maskable, atalhos), as texturas e o **cartão de partilha**
(`public/og/og-image.png`) são gerados pelo mesmo script:

```bash
python tools/gen_assets.py      # texturas, ícones em public/icons e o cartão em public/og
python tools/check_sprites.py   # valida a grelha dos ícones pixel art
python tools/fix_encoding.py    # deteta/corrige texto com codificação dupla
npm run icons                   # equivalente ao primeiro comando
```

A favicon é um bloco de relva em pixel art, usado também como ícone da aplicação instalável. O
cartão de partilha usa o mesmo bloco, desenhado a 400×210 e ampliado 3× sem suavização (pixéis
quadrados) — é o que aparece no WhatsApp, no Discord e ao lado do resultado do Google.

### Imagens nos mundos e nas localizações

As imagens são reduzidas e comprimidas **no dispositivo** (WebP, com JPEG como alternativa) antes de
serem guardadas, para não encherem o armazenamento: limite de 4 MB no ficheiro original e cerca de
1,2 milhões de caracteres já guardados. Ficam dentro da própria entidade (data URL), por isso
continuam disponíveis offline, viajam nas cópias de segurança em JSON e seguem na sincronização da
conta (enviadas em lotes separados, para os pedidos não ficarem enormes). Podem ser trocadas ou
removidas em qualquer momento, no formulário do mundo ou da localização.

> A favicon criada numa conversa anterior não estava disponível neste projeto, pelo que foi recriada
> no mesmo estilo (bloco de relva). Se quiseres a versão original, basta substituir os ficheiros de
> `public/icons/` — o manifesto e o `index.html` continuam a funcionar sem alterações.

---

## 7. Resolução de problemas

| Sintoma | Causa e solução |
| --- | --- |
| Fica em «A gerar o mundo…» | A pasta `dist/` está incompleta (por exemplo, um build interrompido). Corre `npm run build` e abre outra vez `dist/index.html`. |
| «A aplicação não arrancou» | Falhou o carregamento dos ficheiros (por exemplo, depois de atualizar a pasta `dist/` com a página aberta). Usa **Limpar cache e recarregar** no ecrã de erro, ou `Ctrl+Shift+R`. |
| «Os dados demoraram demasiado a abrir» | Armazenamento bloqueado (janela privada) ou outra aba a bloquear a base de dados. Fecha as outras abas da aplicação e recarrega. |
| A porta 4173 está ocupada | O `scripts/serve.mjs` usa automaticamente a porta seguinte e mostra o endereço correto na janela. |
| Alterações não aparecem depois de atualizar | A versão nova do service worker assume no carregamento seguinte; recarrega uma vez mais. |

---

## 8. Limitações conhecidas

- **Sincronização**: precisa de conta e da tabela `library_records` criada no Supabase (secção 12 do
  `schema.sql`); sem isso, a aplicação avisa e continua a funcionar só neste dispositivo.
- **Tarefas públicas dos servidores**: precisam da tabela `shared_server_tasks` (secção 13 do
  `schema.sql` ou `patch-03-tarefas.sql`). Sem ela, as tarefas privadas continuam a funcionar e a app
  explica o que falta.
- **Coordenadas públicas dos servidores**: precisam da tabela `shared_server_locations` (secção 21 do
  `schema.sql` ou `patch-11-coordenadas-partilhadas.sql`). Sem ela, as coordenadas privadas continuam
  a funcionar e a app explica o que falta.
- **Sem verificação do estado dos servidores**: depende de um serviço externo e de CORS; o estado é
  manual e assim é apresentado.
- Pedir armazenamento persistente pode ser recusado pelo navegador; as Definições mostram o resultado
  e recomenda-se exportar cópias de segurança.
- A instalação como aplicação depende do navegador (Safari em iOS usa *Adicionar ao ecrã principal*).
