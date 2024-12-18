export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
    const url = 'https://5431223.n1.apifox.cn/' + new URL(req.url).searchParams.get('path')!;

    const response = await fetch(url, {
        method: req.method,
        headers: {
            ...req.headers,
            'X-Apifox-Docs-Site-ID': '5431223',
        },
        body: req.method === 'POST' ? req.body : undefined,
    });

    const headers = new Headers(response.headers)
    headers.set('X-Apifox-Docs-Site-ID', '5431223')

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    })
}