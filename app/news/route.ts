// Vercel configs
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dependencies
import { paramInt, data, error } from '@/lib/utils';
import { APIError } from '@/lib/errors';
import { newslist } from './index';

export async function GET(request: Request) {

    // Parse and check parameters
    try {
        const _n = paramInt(request, 'n', 10, [1, 100]);
        const _i = paramInt(request, 'i', 0, [0, null]);
        return data(await newslist(_n, _i));
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