// ads.txt para AdSense: se genera solo cuando hay un client configurado en src/lib/site.ts.
import { ADSENSE } from '../lib/site';

export const GET = () => {
  const pub = ADSENSE.client.replace(/^ca-/, '');
  const body = pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : '# AdSense aún no configurado\n';
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
