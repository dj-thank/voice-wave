// Local authoring server. The export endpoint never ships with the public demo.
import { createServer } from 'vite';
import { writeFile, mkdir } from 'node:fs/promises';
const output = new URL('../work/demo-video/', import.meta.url);
await mkdir(output, { recursive: true });
const server = await createServer({
  server: { host: '127.0.0.1', port: 4319, strictPort: true },
  plugins: [
    {
      name: 'local-video-export',
      configureServer(server) {
        server.middlewares.use('/__video', async (req, res, next) => {
          if (req.method !== 'POST') return next();
          const contentType = req.headers['content-type'];
          if (
            req.headers.origin !== 'http://127.0.0.1:4319' ||
            !['video/webm', 'video/mp4'].includes(contentType)
          ) {
            res.statusCode = 403;
            return res.end();
          }
          const chunks = [];
          let size = 0;
          try {
            for await (const chunk of req) {
              size += chunk.length;
              if (size > 120 * 1024 * 1024) throw new Error('Video too large');
              chunks.push(chunk);
            }
            if (size < 1000) throw new Error('Empty video');
            await writeFile(
              new URL(contentType === 'video/mp4' ? 'capture.mp4' : 'capture.webm', output),
              Buffer.concat(chunks),
            );
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ saved: true, bytes: size }));
          } catch {
            res.statusCode = 500;
            res.end('Export failed');
          }
        });
      },
    },
  ],
});
await server.listen();
console.log('Video authoring: http://127.0.0.1:4319/film.html');
