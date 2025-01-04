// Vercel configs
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dependencies
import { paramInt, data, error } from '@/lib/utils';
import { APIError } from '@/lib/errors';
import { news } from './index';

export async function GET(request: Request) {

    // Parse and check parameters
    try {
        const _category = paramInt(request, 'category', 0);
        const _count = paramInt(request, 'count', 10, [1, 100]);
        const _index = paramInt(request, 'index', 0, [0, null]);
        return data(await news(_category, _count, _index));
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