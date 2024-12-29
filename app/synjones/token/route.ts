// Vercel configs
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dependencies
import { bodyString, data, error, header } from '@/lib/utils';
import { APIError } from '@/lib/errors';
import { token, refresh } from './index';

export async function POST(request: Request) {

    // Parse and check body
    try {
        const body = await request.text();
        const _refresh_token = header(request, 'Refresh-Token', '');
        console.log(_refresh_token == '');
        if (_refresh_token !== '')
            return data(await refresh(_refresh_token));
        const _username = bodyString(body, 'username');
        const _password = bodyString(body, 'password');
        return data(await token(_username, _password));
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