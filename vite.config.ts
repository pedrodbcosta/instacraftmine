import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import packageJson from './package.json';

/**
 * Endereço público do site, tirado do campo `homepage` do `package.json`.
 *
 * É o mesmo sítio de onde o `npm run sitemap` tira o mapa do site. Ter isto
 * aqui evita o pior erro possível em SEO: a canónica, a imagem de partilha e o
 * `<link rel="canonical">` a apontarem para um domínio que já não é o do site.
 */
const SITE_URL = String(packageJson.homepage ?? '').replace(/\/+$/, '');

/** Marcador escrito nos HTML; é trocado pelo endereço acima no build e no dev. */
export const SITE_URL_TOKEN = '%SITE_URL%';

function siteUrlPlugin(): Plugin {
  return {
    name: 'instacraftmine-site-url',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.split(SITE_URL_TOKEN).join(SITE_URL);
      },
    },
  };
}

/**
 * Mete o JavaScript e o CSS dentro do `index.html`.
 *
 * A aplicação tem de poder ser aberta por duplo clique (`file://`), e nesse
 * caso o navegador bloqueia, por CORS, o carregamento de módulos externos e o
 * `fetch` de ficheiros locais. Com o pacote dentro do próprio HTML — um módulo
 * inline, que não é descarregado — a app arranca sem servidor nenhum. O service
 * worker só é registado em http(s): em `file://` não existe.
 *
 * Isto corre em `generateBundle`, antes de o `vite-plugin-pwa` gerar o `sw.js`
 * (que lê os ficheiros do disco em `closeBundle`): assim o service worker não
 * tenta guardar ficheiros que já não existem.
 */
function inlineAppPlugin(): Plugin {
  const manifestTag =
    "<script>if (location.protocol !== 'file:') { const l = document.createElement('link'); l.rel = 'manifest'; l.href = './manifest.webmanifest'; document.head.appendChild(l); }</script>";

  return {
    name: 'instacraftmine-ficheiro-unico',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type !== 'asset' || !fileName.endsWith('.html')) continue;
        let html = String(output.source);

        // Folha de estilo → <style>. Os `url()` do CSS eram relativos a
        // `assets/`; dentro do HTML passam a ser relativos à raiz.
        html = html.replace(/<link[^>]+rel="stylesheet"[^>]*>/g, (tag) => {
          const href = /href="([^"]+)"/.exec(tag)?.[1];
          if (!href) return tag;
          const key = href.replace(/^\.?\//, '');
          const asset = bundle[key];
          if (!asset || asset.type !== 'asset') return tag;
          const css = String(asset.source)
            .replace(/url\(\.\//g, 'url(./assets/')
            // Um "</style" a meio do CSS fecharia a tag e estragaria a página.
            .replace(/<\/style/gi, '<\\/style');
          delete bundle[key];
          return `<style>\n${css}\n</style>`;
        });

        // Pacote → módulo inline (não é descarregado, por isso passa em file://).
        html = html.replace(/<script[^>]*type="module"[^>]*><\/script>/g, (tag) => {
          const src = /src="([^"]+)"/.exec(tag)?.[1];
          if (!src) return tag;
          const key = src.replace(/^\.?\//, '');
          const chunk = bundle[key];
          if (!chunk || chunk.type !== 'chunk') return tag;
          delete bundle[key];
          // Um "</script" dentro do pacote fecharia a tag inline: escapado
          // dentro de uma string JavaScript continua a significar o mesmo.
          const code = chunk.code.replace(/<\/script/gi, '<\\/script');
          return `<script type="module">\n${code}\n</script>`;
        });

        // O preload de módulos deixa de fazer sentido com o código dentro do HTML.
        html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/g, '');

        // O manifesto (nome e ícones da app instalada) também não pode ser
        // lido em `file://`: só é pedido em http(s), para não deixar um erro de
        // CORS na consola de quem abre o ficheiro por duplo clique.
        html = html.replace(/<link[^>]+rel="manifest"[^>]*>/g, () => manifestTag);

        // Service worker: só em http(s). Em `file://` o registo falharia.
        html = html.replace(
          /<script id="vite-plugin-pwa:register-sw"[^>]*><\/script>/g,
          "<script>if (location.protocol !== 'file:') { const s = document.createElement('script'); s.src = './registerSW.js'; s.defer = true; document.head.appendChild(s); }</script>",
        );

        output.source = html;
      }
    },
  };
}

export default defineConfig({
  // Caminhos relativos: a app pode ser servida em qualquer pasta estática
  // (raiz de um domínio, subpasta ou até a partir de um servidor local).
  base: './',
  define: {
    // Marca de cada build: permite ver na app (Definições → Sobre) se o
    // navegador está a usar uma versão antiga em cache.
    __BUILD_ID__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 4096,
    rollupOptions: {
      // Duas páginas de propósito: a aplicação (`index.html`) e uma página de
      // texto que os motores de busca e as IAs conseguem ler sem executar
      // JavaScript (`sobre.html`). A aplicação usa encaminhamento por hash, por
      // isso todas as secções continuam a viver dentro de `index.html`.
      // Lista e não objeto: assim o pacote principal continua a chamar-se
      // `index-*.js` (o nome que a documentação e os testes procuram).
      input: ['index.html', 'sobre.html'],
    },
  },
  plugins: [
    siteUrlPlugin(),
    react(),
    VitePWA({
      // autoUpdate: uma nova versão toma conta automaticamente no carregamento
      // seguinte. Evita ficar preso a uma versão antiga em cache (o que faria a
      // aplicação parecer «presa» depois de uma atualização).
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: [
        'icons/favicon.ico',
        'icons/favicon-16.png',
        'icons/favicon-32.png',
        'icons/favicon-48.png',
        'icons/favicon-96.png',
        'icons/icon.svg',
        'icons/apple-touch-icon.png',
        'textures/*.png',
        'fonts/*.ttf',
      ],
      manifest: {
        name: 'Instacraftmine — Gestor de Mundos Minecraft',
        short_name: 'Instacraftmine',
        description:
          'Organiza mundos, servidores e coordenadas de Minecraft. Funciona offline e guarda tudo no teu dispositivo.',
        lang: 'pt-PT',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'any',
        background_color: '#78b0f0',
        theme_color: '#4a86d8',
        categories: ['productivity', 'utilities', 'games'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'monochrome' },
        ],
        shortcuts: [
          {
            name: 'Favoritos',
            short_name: 'Favoritos',
            description: 'Abrir os favoritos guardados',
            url: './#/favoritos',
            icons: [{ src: 'icons/shortcut-coords.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Os meus mundos',
            short_name: 'Mundos',
            description: 'Abrir a lista de mundos',
            url: './#/mundos',
            icons: [{ src: 'icons/shortcut-worlds.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // As tabelas de biomas não entram aqui: viajam dentro do JavaScript
        // (`tabelasEmbutidas.ts`), para a app funcionar também aberta por
        // duplo clique (`file://`), onde não há `fetch` de ficheiros locais.
        globPatterns: ['**/*.{js,css,html,woff2,ttf,png,svg,ico,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Uma versão nova tem de tomar conta de imediato: sem isto o service
        // worker antigo continuava a servir o build anterior e parecia que as
        // alterações não chegavam.
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
    // Fica depois de tudo (o `enforce: 'post'` garante a ordem): nesta altura o
    // HTML já tem as tags finais e o `sw.js` ainda não foi escrito.
    inlineAppPlugin(),
  ],
  server: {
    port: 5180,
    strictPort: false,
  },
  preview: {
    port: 5180,
    strictPort: false,
  },
});
