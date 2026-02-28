import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

export default function openapi(_req: IncomingMessage, res: ServerResponse): void {
  try {
    const specPath = resolve(process.cwd(), 'swagger.yaml');
    const spec = readFileSync(specPath, 'utf8');

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/yaml; charset=utf-8');
    res.end(spec);
  } catch {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Failed to load OpenAPI spec' }));
  }
}
