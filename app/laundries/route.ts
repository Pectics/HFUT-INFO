// Vercel configs
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dependencies
import { data, error } from '@/lib/utils';
import { APIError } from '@/lib/errors';
import { laundries } from './agent';

export async function GET(_: Request) {

    // Parse and check parameters
    try {
        return data(laundries());
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