import { NextRequest, NextResponse } from 'next/server';
import { error } from './lib/utils';

const apis: { [base: string]: string[] } = {};

Object.entries({
    '/news': [
        '/list',
        '/:id\\d+',
    ],
}).forEach(([base, endpoints]) => {
    if (!/^(?:\/[a-z_\d\-]+)+$/i.test(base)) {
        console.error(`Invalid API base: ${base}`);
        return;
    }
    if (!Array.isArray(endpoints)) {
        console.error(`Invalid API endpoints: ${endpoints}`);
        return;
    }
    if (!apis[base]) apis[base] = [];
    endpoints.forEach(endpoint => {
        if (!/^(?:\/(?:[a-z_\d\-]+|:[a-z_][a-z_\d]*[^\/]*))+$/i.test(endpoint)) {
            console.error(`Invalid API endpoint: ${endpoint}`);
            return;
        }
        apis[base].push(endpoint);
    });
});

export const config = { matcher: '/(.*)' };

export function middleware(request: NextRequest) {

    const path = request.nextUrl.pathname;

    // Find the matched base
    for (const [base, endpoints] of Object.entries(apis)) {

        // Not starts with the base
        if (!path.startsWith(base)) continue;

            let id = 0;
        // Base matched, find the matched endpoint
        FindNext: for (let endpoint of endpoints) {

            // Create copies of the path
            let copypath = path.slice(base.length);
            let realpath = '';
            
            // Check each part of the endpoint
            let part: string | undefined;
            while (part = /^\/(?:[a-z_\d\-]+|:[a-z_][a-z_\d]*[^\/]*)/i.exec(endpoint)?.[0]) {

                // Check if the part is a parameter
                let param = /^\/:([a-z_][a-z_\d]*)([^\/]*)/i.exec(part);

                // Is a `/:key{pattern}` like part
                if (param) {
                    const key = param[1];
                    const pattern = param[2] !== '' ? param[2] : '[a-z_\d\-]+';
                    const vmatch = new RegExp(`^/(${pattern})(?=/|$)`, 'i').exec(copypath);
                    if (!vmatch) continue FindNext;
                    id = parseInt(vmatch[1]);
                    request.nextUrl.searchParams.append(key, vmatch[1]);
                    copypath = copypath.slice(vmatch[0].length);
                    endpoint = endpoint.slice(part.length);
                    realpath += '/$';
                    continue;
                }
                // Is a `/path` like part and not starts with it
                else if (!copypath.startsWith(part)) continue FindNext;
                // Is a `/path` like part and starts with it
                copypath = copypath.slice(part.length);
                endpoint = endpoint.slice(part.length);
                realpath += part;
            }

            // Return the matched endpoint
            // console.log(`https://hfut.info/api/news?id=${id}`);
            // console.log(`Re-source to ${request.nextUrl.origin}${base}${realpath}${request.nextUrl.search}`);
            return NextResponse.rewrite(
                `${request.nextUrl.origin}${base}${realpath}${request.nextUrl.search}`,
                { request }
            )
        }

        // No endpoint matched
        return error(new Error(`Resource ${path} not found`), 404);
    }

    // No base matched
    return error(new Error(`Resource ${path} not found`), 404);
}
