/**
 * Cloudflare Worker - CORS Proxy para Jira API
 * 
 * Deploy:
 * 1. Acesse https://dash.cloudflare.com/ (crie conta gratis se nao tiver)
 * 2. Va em Workers & Pages > Create Worker
 * 3. Cole este codigo no editor
 * 4. Deploy
 * 5. Copie a URL gerada (ex: jira-proxy.seuusuario.workers.dev)
 * 6. Cole essa URL nas configuracoes do frontend
 */

const ALLOWED_ORIGINS = [
  'https://luiresende1410.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

// Apenas permite requests para a API do Jira (seguranca)
const ALLOWED_TARGETS = [
  'atlassian.net',
];

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    const origin = request.headers.get('Origin') || '';
    
    // Validar origin
    if (!ALLOWED_ORIGINS.some(o => origin.startsWith(o)) && origin !== '') {
      return new Response('Origin not allowed', { status: 403 });
    }

    // Pegar a URL de destino do header ou query param
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing ?url= parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validar que o target eh Jira
    const targetHost = new URL(targetUrl).hostname;
    if (!ALLOWED_TARGETS.some(t => targetHost.endsWith(t))) {
      return new Response(JSON.stringify({ error: 'Target not allowed. Only Jira URLs.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Forward request
    const headers = new Headers();
    // Copiar headers relevantes do request original
    const authHeader = request.headers.get('Authorization');
    if (authHeader) headers.set('Authorization', authHeader);
    headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' ? await request.text() : undefined,
      });

      // Criar response com CORS headers
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', origin || '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy error: ' + err.message }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || '*',
        },
      });
    }
  },
};

function handleOptions(request) {
  const origin = request.headers.get('Origin') || '*';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    },
  });
}
