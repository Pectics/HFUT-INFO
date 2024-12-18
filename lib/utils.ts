import { ParamError } from "./errors";
import { DateTime } from "luxon";

function paramString(
    req: Request,
    key: string,
    def?: string,
    range?: string[]
): string {
    const value = new URL(req.url).searchParams.get(key);
    if (!value || range && !range.includes(value)) {
        if (def) return def;
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
    const value = paramString(req, key);
    const num = parseInt(value);
    if (isNaN(num) || (range && (range[0] && num < range[0] || range[1] && num > range[1]))) {
        if (def) return def;
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
    const value = paramString(req, key);
    const num = parseFloat(value);
    if (isNaN(num) || (range && (range[0] && num < range[0] || range[1] && num > range[1]))) {
        if (def) return def;
        throw new ParamError(key, value);
    }
    return num;
}

function data(data: any, code: number = 200, message?: string): Response {
    if (code < 200 || code >= 300)
        throw new Error(`Invalid status code: ${code}`);
    return new Response(JSON.stringify({
        code,
        timestamp: DateTime.utc({ locale: 'zh-CN' }),
        message: message || 'OK',
        data,
    }, null, 4), {
        status: code,
        headers: { 'Content-Type': 'application/json' },
    });
}

function error(err: Error, code: number = 500): Response {
    return new Response(JSON.stringify({
        code,
        timestamp: DateTime.utc({ locale: 'zh-CN' }),
        error: err.message,
    }, null, 4), {
        status: code,
        headers: { 'Content-Type': 'application/json' },
    });
}

export {
    paramString,
    paramInt,
    paramFloat,
    data,
    error,
}
