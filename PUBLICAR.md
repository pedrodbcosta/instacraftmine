# Publicar

Duas peças, ambas gratuitas:

| Peça | Onde | Para quê |
|---|---|---|
| Site (React + PWA) | **Cloudflare Pages** (ou Netlify) | Os ficheiros; mundos, servidores e coordenadas ficam no navegador e, com sessão iniciada, na conta |
| Contas, sincronização, Instacraft, chat, imagens | **Supabase** | Base de dados, autenticação, ficheiros e tempo real |

Não há servidor próprio: o browser fala diretamente com o Supabase e quem protege
os dados são as políticas RLS de [`supabase/schema.sql`](supabase/schema.sql).

## 1. Supabase (só uma vez)

1. Cria um projeto em [supabase.com/dashboard](https://supabase.com/dashboard)
   (região mais próxima, por exemplo Frankfurt).
2. **Authentication → Sign In / Providers → Email** → desliga **Confirm email**
   (a app não pede email; usa `<utilizador>@blocos.local`).
3. **SQL Editor → New query** → cola [`supabase/schema.sql`](supabase/schema.sql)
   → **Run**. Deve terminar com *Success*.
   - Projeto que já tinha o schema antigo: corre também
     [`supabase/patch-02-sincronizacao.sql`](supabase/patch-02-sincronizacao.sql)
     (cria a tabela `library_records` e a função `push_library` da sincronização).
   - Para ter o **Minecraft AI** (conta automática do Instacraft): corre
     [`supabase/patch-04-ia-minecraft.sql`](supabase/patch-04-ia-minecraft.sql). Cria a conta
     `MinecraftAI`, o canal «Minecraft AI» e as funções da ronda diária. Sem este patch o
     Instacraft funciona na mesma; o cartão da IA explica que falta a atualização.
4. **Settings → API Keys** → copia o **Project URL** e a chave
   **publishable**.

### 1.1 Conta oficial «Instacraftmine» (recomendado)

Serve para publicares as atualizações da aplicação com um crachá **OFICIAL**:

1. No projeto, corre **`npm run conta:oficial`**. O script gera uma palavra-passe forte e mostra-a
   **uma única vez** no terminal — copia-a para um gestor de palavras-passe. Ela não é escrita em
   nenhum ficheiro. (Se preferires, usa uma palavra-passe tua do gestor: o script é só uma
   conveniência.)
2. Cria a conta, à escolha:
   - **na app publicada**: sai da tua conta e usa **Instacraft → Criar conta** com o nome
     `Instacraftmine`;
   - **no Supabase** (sem sair da tua conta): **Authentication → Users → Add user** com o email
     `instacraftmine@blocos.local`, a palavra-passe e, em *User Metadata*,
     `{"username":"Instacraftmine"}`. O email tem de ser exatamente esse — a app transforma o nome em
     `<nome>@blocos.local` para entrar.
3. Em **SQL Editor**, corre [`supabase/patch-05-conta-oficial.sql`](supabase/patch-05-conta-oficial.sql)
   para ligar o crachá ao canal.
4. Em **SQL Editor**, corre
   [`supabase/patch-09-publicacoes-oficiais.sql`](supabase/patch-09-publicacoes-oficiais.sql): é o
   que permite escolher entre **informação** (post normal com título e corpo) e **atualização** (de
   que versão para qual e o que há de novo) ao publicar nesse canal. Sem este patch o feed funciona
   na mesma, mas a app avisa que falta a atualização quando tentas publicar uma informação ou uma
   atualização.
5. Em **SQL Editor**, corre
   [`supabase/patch-10-moderacao-publicacoes.sql`](supabase/patch-10-moderacao-publicacoes.sql): dá à
   conta oficial o poder de apagar **qualquer** publicação (e os ficheiros dela). Sem este patch o
   botão de apagar só aparece nas publicações da própria conta.

> Perdeste a palavra-passe? `npm run conta:oficial -- --redefinir` gera outra e imprime o `update` a
> correr no SQL Editor. Não é preciso apagar a conta (nem as publicações dela).

### 1.2 Contas verificadas (visto azul)

1. Em **SQL Editor**, corre [`supabase/patch-06-verificados.sql`](supabase/patch-06-verificados.sql).
2. Para dar o verificado a alguém: **Table Editor → profiles → coluna `verified`** (marcar a caixa),
   ou `update public.profiles set verified = true where username_lower = 'pedro';`.
3. Para tirar, o mesmo com `false`. Não há mais nada a fazer: a app mostra o visto azul ao lado do
   nome nas publicações, no canal, na lista de canais e nos comentários.

> O visto **não** é o crachá OFICIAL: o OFICIAL é dourado e é só da conta da aplicação
> (`channels.official`). Este é azul e é dado pessoa a pessoa. Nenhuma conta se pode verificar a si
> própria — a coluna está fora do alcance das contas por privilégios de coluna.

### 1.3 Bugs e sugestões (botão «Reportar»)

1. Em **SQL Editor**, corre [`supabase/patch-07-reportes.sql`](supabase/patch-07-reportes.sql). Cria a
   tabela `reports` e a função `can_manage_reports()`.
   - **Já tinhas corrido este patch?** Volta a correr: a função passou a dar acesso **só à conta
     oficial** (antes também dava às contas verificadas). O patch pode ser corrido mais do que uma vez.
2. A lista de reportes é **só da conta oficial** (o canal **OFICIAL**, secção 1.1). O perfil
   **verificado** (secção 1.2) **não** dá acesso aos reportes. Para veres a lista, entra como
   `Instacraftmine`.
3. Sem este patch a app continua a funcionar, mas o envio avisa que falta a atualização da base de
   dados. Enviar exige **sessão iniciada** — sem conta o reporte não é guardado em lado nenhum.

O botão está no cabeçalho (ícone de bug) e em Definições → «Bugs e sugestões». Só a conta oficial vê
a lista, com o estado de cada reporte; «Descarregar Excel» gera um `.xlsx` com os bugs a vermelho, as
melhorias a verde e as linhas já feitas rasuradas.

### 1.4 IA diária com modelo local (opcional)

Se quiseres respostas escritas por um modelo em vez da base de regras, corre tudo **no teu PC**, uma
vez por dia:

```powershell
winget install Ollama.Ollama
ollama pull qwen2.5:3b
npm run ia:agendar        # cria as tarefas no Agendador de Tarefas
```

A configuração (URL, chave pública, conta) vive em `%USERPROFILE%\.instacraftmine\ia.env` — **nunca**
neste repositório. Passo a passo completo no README, secção «IA a correr no teu PC». Sem isto, a app
continua a funcionar: a ronda corre no browser quando alguém abre o Instacraft.

## 2. Configurar o build

Cria um ficheiro `.env` na raiz (não vai para o repositório):

```
VITE_SUPABASE_URL=https://o-teu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

> A chave publishable é pública por desenho. Nunca ponhas aqui a `service_role`.

## 3. Gerar o site

```powershell
npm run publicar    # build + confirmação da pasta a publicar
```

O site publicado é a **pasta `dist/`** — não há zip. O comando reconstrói a pasta, confirma que
o `index.html` é autónomo e mostra o caminho completo. Sem esta reconstrução, o alojamento
continua a servir a versão antiga.

Antes de publicar, abre **`dist/index.html` com duplo clique**: o ficheiro leva o JavaScript, o
CSS e as tabelas do mapa dentro dele, por isso a aplicação arranca sem servidor (`file://`). A
versão por HTTP (`iniciar-aplicacao.cmd` ou `npm run serve:dist`) só é necessária para o service
worker e para instalar a app (PWA).

## 4. Publicar (Cloudflare Pages, hoje)

O site está em **Cloudflare Pages**: <https://minstacraft.pages.dev>.

- **Atualizar**: abre o projeto em [dash.cloudflare.com](https://dash.cloudflare.com) →
  **Workers & Pages** → o projeto → **Create deployment** → **Upload assets** (ou *Direct
  Upload*) → arrasta a pasta `dist/`. O endereço `minstacraft.pages.dev` mantém-se;
  cada publicação gera também um endereço novo do tipo `<hash>.minstacraft.pages.dev`, que é
  **temporário** (muda a cada envio e serve só para pré-visualizar).
- **Primeira vez**: o mesmo caminho, criando o projeto de raiz.
- O domínio do projeto vive **só** no campo `homepage` do `package.json`. Mudou de alojamento
  ou de domínio? Atualiza-o, corre `npm run sitemap` para o mapa e o `robots.txt`, e acerta os
  endereços de `public/llms.txt` (o `npm test` diz o que ficou para trás).

### 4.1 Publicar na Netlify (alternativa, plano Free com limite de créditos)

- **Primeira vez**: [app.netlify.com/drop](https://app.netlify.com/drop) e arrasta a pasta
  `dist/`.
- **Atualizar um site existente**: abre o site → separador **Deploys** → arrasta a pasta
  `dist/` para *«Drag and drop your site output folder here»*. O endereço mantém-se.

> Se o site estiver publicado nos dois sítios ao mesmo tempo, o mesmo conteúdo aparece em dois
> domínios (conteúdo duplicado para o Google). Mantém só um, ou põe uma canónica a apontar para
> o principal — é o que o `homepage` já faz.

## 4.2 O logótipo «Powered by Netlify»

Em projetos **públicos novos no plano Free** (criados a partir de 19/08/2026), a Netlify injeta
um pequeno **«Powered by Netlify»** no canto inferior direito. **Não faz parte da aplicação**:
chega no HTML servido pelo edge, dentro de um *frame* isolado — por isso o CSS e o JavaScript da
app não o conseguem esconder nem mover. É também por isso que, no telemóvel, ele aparece por
cima das abas de baixo.

Para o remover **para todos os visitantes**:

1. Abre o projeto em [app.netlify.com](https://app.netlify.com).
2. **Project configuration → General → Powered by Netlify badge**.
3. Desliga e guarda. A mudança vale no pedido seguinte; **não é preciso novo deploy**.

Cada visitante também pode tocar no logótipo e escolher **«Hide this badge»**; fica escondido
só nesse navegador e domínio. No Safari/iOS essa escolha desaparece ao fim de 7 dias sem
visitas.

Notas:

- Com um domínio próprio o logótipo continua a aparecer: a definição é do **projeto**, não do
  domínio.
- Se o site foi criado por um *drop* que ainda não está na tua conta, reclama o projeto primeiro.
- Se estiveres a ver o site dentro do **Netlify Drop** (pré-visualização) e não no endereço
  publicado, abre o endereço `*.netlify.app` do projeto: a pré-visualização tem a marca da
  Netlify.
- Não vale a pena tentar esconder com CSS: a Netlify isola o *frame* do logótipo de propósito.

Documentação oficial: [Powered by Netlify badge](https://docs.netlify.com/manage/projects/powered-by-netlify-badge/).

## 5. Confirmar que está bem

Abre o link e verifica, por esta ordem:

1. A página inicial abre (se ficar em branco, faltam os `assets/` — vê o passo 3).
2. **Instacraft** mostra «Entrar / Criar conta» e **não** «Servidor não ligado».
3. Cria uma conta, publica uma fotografia e abre **Servidores** para criar um
   servidor partilhado.
4. Na barra lateral do Instacraft aparece o cartão **Minecraft AI**. Escreve uma publicação (ou um
   comentário) com `@MinecraftAI` e uma pergunta — por exemplo «@MinecraftAI onde encontro
   netherite?» — e carrega em **Correr**: a IA responde e publica a dica do dia. Se o cartão disser
   que falta a atualização da base de dados, corre o `patch-04-ia-minecraft.sql`.
5. Entra como `Instacraftmine`: o canal deve ter o crachá **OFICIAL** e as publicações dele devem
   aparecer com a faixa dourada. Sem o `patch-05-conta-oficial.sql` o crachá aparece pelo endereço do
   canal, mas só o patch garante que mais ninguém o pode usar.
6. Ainda como `Instacraftmine`, carrega em **Publicar**: deve aparecer a escolha **Informação /
   Atualização**. Em **Atualização**, as duas versões vêm preenchidas com a versão anterior e a
   atual, e o cartão publicado mostra o crachá dourado **Atualização** com «versão antiga → versão
   nova». As fotografias continuam a poder juntar-se nos dois casos. Se disser que falta a
   atualização da base de dados, corre o `patch-09-publicacoes-oficiais.sql`.
7. Ainda como `Instacraftmine`, abre qualquer publicação de outra conta: deve ter o botão de apagar.
   Com o `patch-10-moderacao-publicacoes.sql` aplicado, apaga-a mesmo (a janela avisa que não é tua).
   Sem o patch, a base de dados recusa e a app mostra a mensagem de erro.
8. Duas contas em dois navegadores: mensagens e fotografias aparecem **em
   direto**.
9. Entra na mesma conta em dois navegadores: um mundo criado num deles aparece
   no outro em segundos (Definições → Sincronização mostra «Sincronizado»).
10. Clica no ícone do **bug** no cabeçalho, envia um reporte e abre **Ver lista**. Com o
    `patch-07-reportes.sql` aplicado, a lista mostra o estado e «Descarregar Excel» gera um ficheiro
    com a linha vermelha (bug) ou verde (melhoria). Sem o patch, a app explica o que falta.
11. Abre `https://minstacraft.pages.dev/llms.txt` (tem de aparecer como texto simples, com o
    título «Instacraftmine») e `https://minstacraft.pages.dev/sobre.html` (uma página de
    leitura, com o botão «Abrir a aplicação» no topo). O rodapé da aplicação tem a ligação
    «Sobre a aplicação» — é por aí que os motores de busca chegam à página com texto.

## 6. Google Search Console (aparecer no Google)

O site já leva o que a Google precisa: [`public/sitemap.xml`](public/sitemap.xml) e um
[`public/robots.txt`](public/robots.txt) que o anuncia. Os dois entram em `dist/` como
qualquer outro ficheiro de `public/`.

1. Abre [search.google.com/search-console](https://search.google.com/search-console) →
   **Adicionar propriedade**.
2. Escolhe **Prefixo do URL** e escreve `https://minstacraft.pages.dev/`.
   A opção **Domínio** só serve para um domínio próprio (pede um registo TXT no DNS).
3. Verifica a propriedade. Sem domínio próprio, o caminho mais simples é **Etiqueta HTML**:
   cola a `<meta name="google-site-verification" …>` que o Google dá no `<head>` de
   [`index.html`](index.html), corre `npm run publicar` e publica de novo.
4. **Sitemaps** → no campo do fim escreve `sitemap.xml` → **Enviar**. O endereço completo
   é `https://minstacraft.pages.dev/sitemap.xml` — colar o endereço todo também
   funciona.
5. Para acelerar a primeira visita: **Inspeção de URL** → o endereço do site →
   **Pedir indexação**. Faz o mesmo para `https://minstacraft.pages.dev/sobre.html`,
   que é a página com texto que a Google consegue ler sem executar JavaScript.

### 6.1 Bing e os assistentes de IA

O Bing alimenta o Copilot e boa parte das respostas com pesquisa na web (o ChatGPT, por
exemplo), por isso vale os cinco minutos: [bing.com/webmasters](https://www.bing.com/webmasters)
→ **Importar do Google Search Console** (se já fizeste o passo acima) ou adicionar o site à
mão. No mesmo painel, em **Sitemaps**, submete
`https://minstacraft.pages.dev/sitemap.xml`.

Não há nada a instalar para as IAs: o site já tem um
[`public/llms.txt`](public/llms.txt) (o resumo que os assistentes leem), a página
[`sobre.html`](sobre.html) em HTML simples e um
[`public/robots.txt`](public/robots.txt) que **deixa entrar** os rastreadores de IA (GPTBot,
ClaudeBot, PerplexityBot, …). Se um dia quiseres que uma IA não use o site, é aí que se muda —
e a decisão tem de ser consciente, porque o site vive de ser encontrado.

### 6.2 O que aparece quando alguém partilha o site

O cartão de partilha (WhatsApp, Discord, X, LinkedIn) é
[`public/og/og-image.png`](public/og/og-image.png), 1200×630, gerado por `npm run icons`
(`og_image()` em [`tools/gen_assets.py`](tools/gen_assets.py)). Depois de publicar, confirma
como fica em [opengraph.xyz](https://www.opengraph.xyz/): cola o endereço do site e vê a
pré-visualização. As redes guardam esta imagem em cache durante dias — para forçar a
atualização, muda o nome do ficheiro.

Notas:

- O mapa tem **poucos endereços** de propósito. A aplicação usa encaminhamento por hash
  (`#/mundos`, `#/servidores`, …): o servidor recebe sempre `index.html` e o Google trata
  tudo o que vem depois do `#` como a mesma página, por isso listar as secções seria
  repetir o mesmo URL. Entram a raiz e as páginas HTML a sério (`/sobre.html`); uma página
  nova tem de entrar em `PAGE_PATHS` do [`scripts/gerar-sitemap.mjs`](scripts/gerar-sitemap.mjs).
- «Detetado, mas não indexado» durante uns dias é normal num site novo. A Search Console
  também pode demorar a mostrar o mapa como «Êxito».
- Mudou o domínio? Muda o campo `homepage` do [`package.json`](package.json), corre
  `npm run sitemap` (reescreve o mapa e a linha `Sitemap:` do `robots.txt`), atualiza os
  endereços do [`public/llms.txt`](public/llms.txt) (o `npm test` diz quais estão mal),
  reconstrói e volta a submeter. O teste `tests/sitemap.test.ts` falha se o mapa e o
  `robots.txt` ficarem a apontar para domínios diferentes.
- Sem domínio próprio o resultado no Google mostra `minstacraft.pages.dev`. Um
  domínio próprio melhora a confiança do resultado, mas não é obrigatório para aparecer.

## Limites do plano gratuito

- 500 MB de base de dados, **1 GB de fotografias**, 5 GB de tráfego por mês.
- O projeto **pausa após uma semana sem atividade**; retoma-se com um clique no
  painel e os dados ficam intactos.
- Se um dia crescer, o plano Pro (25 USD/mês) remove a pausa e aumenta os
  limites.

## Cópias de segurança

- **Supabase**: *Database → Backups* (o plano gratuito não tem cópias
  automáticas; exporta de vez em quando).
- **Cada pessoa**: a app exporta mundos, servidores e coordenadas em JSON
  (Definições → Cópias de segurança).
