function paramString(
    req: Request,
    key: string,
    def?: string | null,
    range?: string[] | null,
    throws?: Function
): string {
    const value = new URL(req.url).searchParams.get(key);
    if (!value || range && !range.includes(value)) {
        if (def) return def;
        if (throws) throws(new Error(`${!value ? 'Missing' : 'Invalid'} parameter: ${key}`));
        return '';
    }
    return value;
}

function paramInt(
    req: Request,
    key: string,
    def?: number | null,
    range?: [number | null, number | null] | null,
    throws?: Function
): number {
    const value = paramString(req, key, null, null, throws);
    const num = parseInt(value);
    if (isNaN(num) || (range && (
        range[0] && num < range[0] ||
        range[1] && num > range[1]
    ))) {
        if (def) return def;
        if (throws) throws(new Error(`Invalid parameter: ${key}`));
        return 0;
    }
    return num;
}

function paramFloat(
    req: Request,
    key: string,
    def?: number | null,
    range?: [number, number] | null,
    throws?: Function
): number {
    const value = paramString(req, key, null, null, throws);
    const num = parseFloat(value);
    if (isNaN(num) || (range && (num < range[0] || num > range[1]))) {
        if (def) return def;
        if (throws) throws(new Error(`Invalid parameter: ${key}`));
        return 0;
    }
    return num;
}

function packJSON(data: any, code: number = 200, message?: string): Response {
    if (code < 200 || code >= 300)
        throw new Error(`Invalid status code: ${code}`);
    return new Response(JSON.stringify({
        status: code,
        timestamp: Date.now(),
        message: message || 'OK',
        data,
    }, null, 4), {
        status: code,
        headers: { 'Content-Type': 'application/json' },
    });
}

export {
    paramString,
    paramInt,
    paramFloat,
    packJSON,
}
