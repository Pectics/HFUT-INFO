import config from "@/config";
import { APIError, PropertyError, ParamError, TypeError, HeaderError, AuthenticationError, UpstreamError } from "@/lib/errors";
import { DateTime } from "luxon";

export function param(req: Request, key: string) {
    return new URL(req.url).searchParams.get(key) ||
        req.headers.get(`${
            config.HEADER_PARAM_PREFIX ||
            process.env.HEADER_PARAM_PREFIX ||
            'X-HFUTINFO-'
        }${key}`);
}

export function paramString(
    req: Request,
    key: string,
    def?: string,
    range?: string[]
): string {
    const value = param(req, key);
    if (!value || range && !range.includes(value)) {
        if (def !== undefined) return def;
        throw new ParamError(key, value);
    }
    return value;
}

export function paramInt(
    req: Request,
    key: string,
    def?: number,
    range?: [number | null, number | null]
): number {
    const value = param(req, key);
    const num = parseInt(value || '');
    if (isNaN(num) || (range && (range[0] && num < range[0] || range[1] && num > range[1]))) {
        if (def !== undefined) return def;
        throw new ParamError(key, value);
    }
    return num;
}

export function paramFloat(
    req: Request,
    key: string,
    def?: number,
    range?: [number | null, number | null]
): number {
    const value = param(req, key);
    const num = parseFloat(value || '');
    if (isNaN(num) || (range && (range[0] && num < range[0] || range[1] && num > range[1]))) {
        if (def !== undefined) return def;
        throw new ParamError(key, value);
    }
    return num;
}

export function body(data: any, path: string) {
    if (typeof data === 'string' && data.length > 0)
        data = JSON.parse(data);
    const props = path.split('.').map((k) => k.trim());
    for (const p of props) {
        if (data === undefined || data === null) return null;
        data = data[p];
    }
    return data;
}

export function bodyString(
    data: any,
    path: string,
    def?: string,
    range?: string[],
): string {
    const value = body(data, path);
    if (typeof value !== 'string') throw new TypeError(path, 'string', value);
    if (range && !range.includes(value)) {
        if (def !== undefined) return def;
        throw new PropertyError(path, value);
    }
    return value;
}

export function bodyInt(
    data: any,
    path: string,
    def?: number,
    range?: [number | null, number | null],
): number {
    let value = body(data, path);
    if (typeof value !== 'number') throw new TypeError(path, 'number', value);
    value = Math.round(value);
    if (isNaN(value) || (range && (range[0] && value < range[0] || range[1] && value > range[1]))) {
        if (def !== undefined) return def;
        throw new PropertyError(path, value);
    }
    return value;
}

export function bodyFloat(
    data: any,
    path: string,
    def?: number,
    range?: [number | null, number | null],
): number {
    let value = body(data, path);
    if (typeof value !== 'number') throw new TypeError(path, 'number', value);
    if (isNaN(value) || (range && (range[0] && value < range[0] || range[1] && value > range[1]))) {
        if (def !== undefined) return def;
        throw new PropertyError(path, value);
    }
    return value;
}

export function header(request: Request, key: string, def?: string) {
    const value = request.headers.get(key);
    if (!value) {
        if (def !== undefined) return def;
        throw new HeaderError(key);
    }
    return value;
}

export function data(data: any, code: number = 200): Response {
    if (code < 200 || code >= 300)
        throw new Error(`Invalid status code: ${code}`);
    return new Response(JSON.stringify(data), {
        status: code,
        headers: {
            'Content-Type': 'application/json',
            'Date': DateTime.local(
                { zone: config.TIMEZONE || process.env.TIMEZONE || 'Asia/Shanghai' }
            ).toHTTP(),
        },
    });
}

export function error<T extends Error>(err?: T, code?: number): Response {
    const api = err instanceof APIError;
    return new Response(JSON.stringify({
        code: api ? err.code : code || 500,
        timestamp: api ? err.timestamp : DateTime.local(
            { zone: config.TIMEZONE || process.env.TIMEZONE || 'Asia/Shanghai' }
        ).toMillis(),
        message: err?.message || 'Internal Server Error',
    }), {
        status: api ? err.code : code || 500,
        headers: {
            'Content-Type': 'application/json',
            'Date': DateTime.local(
                { zone: config.TIMEZONE || process.env.TIMEZONE || 'Asia/Shanghai' }
            ).toHTTP(),
        },
    });
}

export async function proxy_fetch(
    input: string | URL | Request,
    init?: RequestInit
): Promise<Response> {
    if (input instanceof URL)
        input = input.toString();
    if (input instanceof Request) {
        init = {
            method: input.method,
            headers: input.headers,
            body: input.body
        };
        input = input.url;
    }
    const headers = new Headers(init?.headers || {});
    headers.set('Authorization', process.env.PROXY_API_KEY || '');
    headers.set('X-Forward-To', input);
    return fetch(config.PROXY_URL, {
        method: init?.method,
        headers: headers,
        body: init?.body
    });
}
