// Vercel configs
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dependencies
import { paramInt, packJSON, paramString } from '@/lib/utils';
import { news } from '.';

export async function GET(request: Request) {

    // Parse parameters
    const _id = paramInt(request, 'id');
    const _fmt = paramString(request, 'fmt', 'array', ['array', 'markdown']) as 'array' | 'markdown';
    
    return packJSON(await news(_id, _fmt));
}