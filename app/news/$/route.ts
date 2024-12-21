// Vercel configs
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dependencies
import { paramInt, paramString, data, error } from '@/lib/utils';
import { APIError } from '@/lib/errors';
import { news } from './index';

export async function GET(request: Request) {

    // Parse and check parameters
    try {
        const _id = paramInt(request, 'id');
        const _format = paramString(request, 'format', 'array', ['array', 'markdown']) as 'array' | 'markdown';
        return data(await news(_id, _format));
    }
    // Handle errors
    catch (err) {
        console.error(err);
        if (err instanceof APIError)
            return error(err);
        if (err instanceof Error)
            return error(err, 500);
    }

}