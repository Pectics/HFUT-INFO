import CONFIG from '@/config';
import { error } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

import { injectSpeedInsights } from '@vercel/speed-insights';
import { inject as injectAnalytics } from "@vercel/analytics"

// API config validation
const API: { [base: string]: string[] } = {};
Object.entries(CONFIG.API).forEach(([base, endpoints]) => {
    if (!/^(?:\/[a-z_\d\-]+)+$/i.test(base)) {
        console.error(`Invalid API base: ${base}`);
        return;
    }
    if (!Array.isArray(endpoints)) {
        console.error(`Invalid API endpoints: ${endpoints}`);
        return;
    }
    if (!API[base]) API[base] = [];
    endpoints.forEach(endpoint => {
        if (!/^(?:\/|(?:\/(?:[a-z_\d\-]+|:[a-z_][a-z_\d]*[^\/]*))+)$/i.test(endpoint)) {
            console.error(`Invalid API endpoint: ${endpoint}`);
            return;
        }
        API[base].push(endpoint);
    });
});

export const config = { matcher: '/(.*)' };

export function middleware(request: NextRequest) {

    // Inject speed insights and analytics
    injectSpeedInsights();
    injectAnalytics();

    const path = request.nextUrl.pathname;
    if (path.startsWith('/docs')) NextResponse.redirect(new URL(path,
        CONFIG.DOCS_URL || process.env.DOCS_URL || 'https://docs.hfut.info'
    ));

    // Find the matched base
    for (const [base, endpoints] of Object.entries(API)) {

        // Not starts with the base
        if (!path.startsWith(base)) continue;

        // Base matched, find the matched endpoint
        FindNext: for (let endpoint of endpoints) {

            // Create copies of the path
            let pathcopy = path.slice(base.length);
            if (!pathcopy.endsWith('/'))
                pathcopy += '/'; // compate with `/` endpoint
            let realpath = '';
            
            // Check each part of the endpoint
            let part: string | undefined;
            let params: [string, string][] = [];
            while (part = /^\/(?:[a-z_\d\-]+|:[a-z_][a-z_\d]*[^\/]*)/i.exec(endpoint)?.[0]) {

                // Check if the part is a parameter
                let param = /^\/:([a-z_][a-z_\d]*)([^\/]*)/i.exec(part);

                // Is a `/:key{pattern}` like part
                if (param) {
                    const key = param[1];
                    const pattern = param[2] !== '' ? param[2] : '[a-z_\d\-]+';
                    const vmatch = new RegExp(`^/(${pattern})(?=/|$)`, 'i').exec(pathcopy);
                    if (!vmatch) continue FindNext;
                    params.push([key, vmatch[1]]);
                    pathcopy = pathcopy.slice(vmatch[0].length);
                    endpoint = endpoint.slice(part.length);
                    realpath += '/$';
                    continue;
                }
                // Is a `/path` like part and not starts with it
                else if (!pathcopy.startsWith(part)) continue FindNext;
                // Is a `/path` like part and starts with it
                pathcopy = pathcopy.slice(part.length);
                endpoint = endpoint.slice(part.length);
                realpath += part;
            }

            // Return the matched endpoint
            const url = new URL(`${base}${realpath}`, request.url);
            request.nextUrl.searchParams.forEach((value, key) =>
                request.headers.append(`${
                    CONFIG.HEADER_PARAM_PREFIX ||
                    process.env.HEADER_PARAM_PREFIX ||
                    'X-HFUT-'
                }${key}`, value));
            params.forEach(([key, value]) =>
                request.headers.append(`${
                    CONFIG.HEADER_PARAM_PREFIX ||
                    process.env.HEADER_PARAM_PREFIX ||
                    'X-HFUT-'
                }${key}`, value));
            return NextResponse.rewrite(url, { request });
        }

        // No endpoint matched
        return error(new Error(`Resource ${path} not found`), 404);
    }

    // No base matched
    return error(new Error(`Resource ${path} not found`), 404);
}
