import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://danielsegovia.com',
  trailingSlash: 'always',
  output: 'static',
  compressHTML: true,
  build: {
    format: 'directory',
    // Todo el CSS va inline: cero requests bloqueantes.
    inlineStylesheets: 'always',
  },
  devToolbar: { enabled: false },
});
