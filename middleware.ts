import { NextRequest, NextResponse } from 'next/server';
import { error } from './lib/utils';

export const config = {
    matcher: '/:path*',
}

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const headers = new Headers(request.headers);

    if (path.startsWith('/docs')) {
        const site = process.env.APIFOX_SITE_ID;
        if (!site) return NextResponse.next();
        const node = (process.env.APIFOX_NODE_ID || 'n1') as 'n1' | 'n2' | 'nx';
        headers.set('X-Apifox-Docs-Site-ID', site);
        return NextResponse.rewrite(
            `http://${site}.${node}.apifox.cn${path.replace('/docs', '')}`,
            { request: { headers } }
        );
    }

    if (!path.startsWith('/api'))
        return error(new Error(`Resource ${path} not found`), 404);
    
    return NextResponse.next();
}
