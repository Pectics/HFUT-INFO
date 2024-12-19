import config from "@/config";
import { APIError, ParamError } from "@/lib/errors";
import { DateTime } from "luxon";

function param(req: Request, key: string) {
    return new URL(req.url).searchParams.get(key) ||
        req.headers.get(`${
            config.HEADER_PARAM_PREFIX ||
            process.env.HEADER_PARAM_PREFIX ||
            'X-HFUT-'
        }${key}`);
}

function paramString(
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

function paramInt(
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

function paramFloat(
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

function data(data: any, code: number = 200): Response {
    if (code < 200 || code >= 300)
        throw new Error(`Invalid status code: ${code}`);
    return new Response(JSON.stringify(data, null, 4), {
        status: code,
        headers: {
            'Content-Type': 'application/json',
            'Date': DateTime.local(
                { zone: config.TIMEZONE || process.env.TIMEZONE || 'Asia/Shanghai' }
            ).toHTTP(),
        },
    });
}

function error<T extends Error>(err?: T, code?: number): Response {
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

export {
    paramString,
    paramInt,
    paramFloat,
    data,
    error,
}
