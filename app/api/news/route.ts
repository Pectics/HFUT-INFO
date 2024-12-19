// Vercel configs
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dependencies
import { paramInt, paramString, data, error } from '@/lib/utils';
import { ParamError } from '@/lib/errors';
import { news } from '.';

export async function GET(request: Request) {

    // Parse and check parameters
    try {
        const _id = paramInt(request, 'id');
        const _fmt = paramString(request, 'fmt', 'array', ['array', 'markdown']) as 'array' | 'markdown';
        return data(await news(_id, _fmt));
    }
    // Handle errors
    catch (err) {
        if (err instanceof ParamError)
            return error(err, 400);
        if (err instanceof Error)
            return error(err, 500);
    }

}