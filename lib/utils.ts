import { ParamError } from "./errors";

function paramString(
    req: Request,
    key: string,
    def?: string | null,
    range?: string[] | null
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
    def?: number | null,
    range?: [number | null, number | null] | null
): number {
    const value = paramString(req, key, null, null);
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
    def?: number | null,
    range?: [number, number] | null
): number {
    const value = paramString(req, key, null, null);
    const num = parseFloat(value);
    if (isNaN(num) || (range && (num < range[0] || num > range[1]))) {
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
        timestamp: Date.now(),
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
        timestamp: Date.now(),
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
