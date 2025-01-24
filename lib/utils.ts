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

// const token_headers = {
//     'Accept': '*/*',
//     'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,en-GB;q=0.6',
//     'Authorization': `Basic ${Buffer.from('mobile_service_platform:mobile_service_platform_secret').toString('base64')}`,
//     'Cache-Control': 'no-cache',
//     'Content-Type': 'application/x-www-form-urlencoded',
//     'Pragma': 'no-cache',
// };
// const token_host = 'http://121.251.19.62/berserker-auth/oauth/token';
// // Base64 of `{"alg":"HS256","typ":"JWT"}`
// const token_prefix = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
// export async function parseToken(token: string) {

//     // Check and split the token
//     const parts = token.split('.');
//     if (parts.length !== 2)
//         throw new AuthenticationError('Invalid access token');

//     // Unpatch the token
//     let payload;
//     try { payload = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf-8')) }
//     catch (e) { throw new AuthenticationError('Invalid access token') }
//     const password = payload.password;
//     if (typeof password !== 'string')
//         throw new AuthenticationError('Invalid access token');
//     payload.password = undefined;
//     parts[0] = Buffer.from(JSON.stringify(payload)).toString('base64')
//         .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
//     const refresh_token = `${token_prefix}.${parts[0]}.${parts[1]}`;

//     // Request the access token
//     const response = await fetch(token_host, {
//         headers: token_headers,
//         method: 'POST',
//         body: new URLSearchParams({
//             grant_type: 'refresh_token',
//             password,
//             refresh_token,
//             scope: 'all',
//             loginFrom: 'API',
//             logintype: 'sno',
//             device_token: 'API',
//             synAccessSource: 'API',
//         }).toString(),
//     });
//     const data = await response.json();
//     if (typeof data !== 'object')
//         throw new UpstreamError(`Invalid response data of type ${typeof data}: ${data}`);
//     if (!response.ok) {
//         if (response.status === 401 || data.code === 401)
//             throw new AuthenticationError('Incorrect access token');
//         throw new APIError(data.message || 'Internal Server Error', response.status);
//     }

//     // Check required fields
//     if (typeof data.access_token !== 'string')
//         throw new UpstreamError('Token data incomplete');
//     return data.access_token as string;
// }
