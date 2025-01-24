// Vercel configs
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dependencies
import { paramInt, data, error } from '@/lib/utils';
import { APIError } from '@/lib/errors';
import { laundry } from '../agent';

export async function GET(request: Request) {

    // Parse and check parameters
    try {
        const _id = paramInt(request, 'id');
        return data(await laundry(_id));
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