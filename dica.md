# Como configurar Vite para GitHub Pages com /docs

## 1. Configurar vite.config.ts

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/NOME-DO-REPOSITORIO/',  // Ex: /wifi-planner/
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'docs',  // Saída para /docs
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
```

## 2. Criar .github/workflows/deploy.yml

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [test, master, main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./docs  # Pasta configurada no vite.config.ts

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## 3. Configurar GitHub Pages

1. Ir para **Settings** do repositório
2. Pages (no menu lateral)
3. **Build and deployment**
   - Source: "Deploy from a branch"
   - Branch: `test` (ou main/master)
   - Folder: `/docs`
4. Save

## 4. URL do site

O site estará disponível em:
```
https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/
```

## Resumo das mudanças

| Arquivo | Mudança |
|---------|---------|
| `vite.config.ts` | Adicionar `base` e `build.outDir: 'docs'` |
| `.github/workflows/deploy.yml` | Criar workflow com path `./docs` |

## Observações

- Substitua `/NOME-DO-REPOSITORIO/` pelo nome do seu repositório
- A variável `GEMINI_API_KEY` deve ser configurada como secret no repositório (Settings → Secrets and variables → Actions)
- O workflow só executa após push para as branches configuradas (test, master, main)