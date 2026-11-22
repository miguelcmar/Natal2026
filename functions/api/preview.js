const SB_URL = 'https://stonleipysdlaprwowec.supabase.co';
const SB_KEY = 'sb_publishable_UqaAv23czfi1xo9OiiB-IA_d0-0Hbwa';

const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const UA_SOCIAL = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

function decode(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/\s+/g, ' ').trim();
}

function metaMap(html) {
  const map = {};
  const re = /<meta\s+([^>]+?)\/?>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = {};
    const ar = /([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let a;
    while ((a = ar.exec(m[1]))) attrs[a[1].toLowerCase()] = a[2] ?? a[3];
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    if (key && attrs.content !== undefined && !(key in map)) map[key] = decode(attrs.content);
  }
  return map;
}

function findProduct(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const n of node) { const f = findProduct(n); if (f) return f; }
    return null;
  }
  const t = node['@type'];
  if (t === 'Product' || (Array.isArray(t) && t.includes('Product'))) return node;
  if (node['@graph']) return findProduct(node['@graph']);
  return null;
}

function jsonLd(html) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const p = findProduct(JSON.parse(m[1]));
      if (p) {
        const offers = Array.isArray(p.offers) ? p.offers[0] : p.offers;
        let image = Array.isArray(p.image) ? p.image[0] : p.image;
        if (image && typeof image === 'object') image = image.url;
        const price = offers && (offers.price ?? offers.lowPrice);
        return {
          title: p.name ? decode(p.name) : '',
          image: image || '',
          price: price != null ? String(price) : '',
          currency: (offers && offers.priceCurrency) || ''
        };
      }
    } catch { /* ignora JSON invalido */ }
  }
  return null;
}

function formatPrice(amount, currency) {
  if (!amount) return '';
  const a = String(amount).replace('.', ',');
  const c = { EUR: '€', USD: '$', GBP: '£' }[String(currency).toUpperCase()] || currency || '';
  return `${a} ${c}`.trim();
}

function blockedHost(h) {
  h = h.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h.includes(':')) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return true;
  return false;
}

async function grab(url, ua) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': ua, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8' },
      redirect: 'follow',
      signal: ctrl.signal
    });
    if (!r.ok) return null;
    const text = await r.text();
    return { html: text.slice(0, 600000), finalUrl: r.url };
  } catch { return null; } finally { clearTimeout(timer); }
}

function extract(html, baseUrl) {
  const meta = metaMap(html);
  const ld = jsonLd(html) || {};
  const titleTag = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  let image = meta['og:image:secure_url'] || meta['og:image'] || meta['twitter:image'] || ld.image || '';
  try { if (image) image = new URL(image, baseUrl).href; } catch { /* mantem */ }
  const amount = meta['product:price:amount'] || meta['og:price:amount'] || ld.price || '';
  const currency = meta['product:price:currency'] || meta['og:price:currency'] || ld.currency || '';
  return {
    title: meta['og:title'] || ld.title || (titleTag ? decode(titleTag) : ''),
    image,
    price: formatPrice(amount, currency)
  };
}

export async function onRequestGet({ request }) {
  // so admins (com o link pessoal) podem usar; evita que isto seja um proxy aberto
  const token = request.headers.get('X-Admin-Token') || '';
  const who = await fetch(`${SB_URL}/rest/v1/rpc/admin_whoami`, {
    method: 'POST',
    headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: token })
  });
  if (!who.ok) return json({ error: 'nao autorizado' }, 401);

  const raw = new URL(request.url).searchParams.get('url');
  let target;
  try { target = new URL(raw); } catch { return json({ error: 'link invalido' }, 400); }
  if (!/^https?:$/.test(target.protocol) || blockedHost(target.hostname)) return json({ error: 'link invalido' }, 400);

  let result = null;
  for (const ua of [UA_BROWSER, UA_SOCIAL]) {
    const page = await grab(target.href, ua);
    if (!page) continue;
    const data = extract(page.html, page.finalUrl);
    result = result || { title: '', image: '', price: '', url: page.finalUrl };
    for (const k of ['title', 'image', 'price']) if (!result[k] && data[k]) result[k] = data[k];
    if (result.title && result.image) break;
  }
  if (!result) return json({ error: 'nao foi possivel ler' }, 502);
  return json(result);
}
