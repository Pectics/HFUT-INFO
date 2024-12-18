// Vercel configs
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dependencies
import { paramInt, packJSON } from '@/lib/utils';
import { newslist } from '.';

export async function GET(request: Request) {

    // Parse parameters
    const _n = paramInt(request, 'n', 10, [1, 100]);
    const _i = paramInt(request, 'i', 0, [0, null]);

    return packJSON(await newslist(_n, _i));
}