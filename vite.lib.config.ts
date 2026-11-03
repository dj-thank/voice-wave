import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist-lib',
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js' },
    rolldownOptions: {
      external: (id) => id === 'react' || id.startsWith('react/'),
      output: {
        banner:
          '"use client";\n/* Voice Wave — BSD-2-Clause. Includes Pipecat UI / Daily shader and LiveKit radial adaptations. See THIRD_PARTY_NOTICES.md. */',
      },
    },
  },
});
