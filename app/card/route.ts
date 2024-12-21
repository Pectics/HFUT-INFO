// Vercel configs
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dependencies
import { header, data, error } from '@/lib/utils';
import { APIError } from '@/lib/errors';
import { card } from './index';

export async function GET(request: Request) {

    // Parse and check body
    try {
        const _access_token = header(request, 'Access-Token');
        return data(await card(_access_token));
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