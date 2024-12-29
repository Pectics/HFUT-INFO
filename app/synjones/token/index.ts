// Dependencies
import { APIError, UpstreamError, AuthenticationError } from "@/lib/errors";

// Configs
const host = 'http://121.251.19.62/berserker-auth/oauth/token';
const authkey = 'mobile_service_platform:mobile_service_platform_secret';
const headers = {
    'Accept': '*/*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,en-GB;q=0.6',
    'Authorization': `Basic ${Buffer.from(authkey).toString('base64')}`,
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Pragma': 'no-cache',
};

/**
 * Requests a new token from the authentication server.
 *
 * @param {string} body - The request body to be sent to the authentication server.
 * @param {string} password - The password used for authentication.
 * @returns {Promise<{id: number, uuid: string, is_first_login: boolean, username: string, name: string, access_token: string, refresh_token: string}>} 
 *          An object containing the new token data:
 *          - `id`: The user ID.
 *          - `uuid`: The user UUID.
 *          - `is_first_login`: Whether this is the user's first login.
 *          - `username`: The user's username.
 *          - `name`: The user's name.
 *          - `access_token`: The new access token.
 *          - `refresh_token`: The new refresh token.
 * @throws {AuthenticationError} If the refresh token is invalid.
 * @throws {UpstreamError} If the response data is invalid or incomplete.
 * @throws {APIError} If the API request fails.
 * @private
 */
async function _request_token(body: string, password: string):
    Promise<{
        id: number;
        uuid: string;
        is_first_login: boolean;
        username: string;
        name: string;
        access_token: string;
        refresh_token: string;
    }> {

    // Request the token
    const response = await fetch(host, { method: 'POST', headers, body });
    const data = await response.json();
    if (typeof data !== 'object')
        throw new UpstreamError(`Invalid response data of type ${typeof data}: ${data}`);
    if (!response.ok) {
        if (response.status === 401 || data.code === 401)
            throw new AuthenticationError('Incorrect refresh token');
        throw new APIError(data.message || 'Internal Server Error', response.status);
    }

    // Check required fields
    if (typeof data.id !== 'number' ||
        typeof data.uuid !== 'string' ||
        typeof data.is_first_login !== 'boolean' ||
        typeof data.sno !== 'string' ||
        typeof data.name !== 'string' ||
        typeof data.access_token !== 'string' ||
        typeof data.refresh_token !== 'string'
    ) throw new UpstreamError('Token data incomplete');

    // Return the token
    return {
        id: data.id,
        uuid: data.uuid,
        is_first_login: data.is_first_login,
        username: data.sno,
        name: data.name,
        access_token: data.access_token,
        /**
         * !!! NOTE !!!
         * In subsequent processing, this specialized token is
         * parsed into the original refresh_token and password
         * to refresh the access_token.
         */
        refresh_token: (() => {
            const token = data.refresh_token.split('.');
            const payload = JSON.parse(Buffer.from(token[1], 'base64').toString());
            payload.password = password;
            token[1] = Buffer.from(JSON.stringify(payload)).toString('base64')
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            return `${token[0]}.${token[1]}.${token[2]}`;
        })(),
    };
}

/**
 * Refreshes the access token using the provided refresh token.
 *
 * @param {string} refresh_token - The refresh token to be used for refreshing the access token.
 * @returns {Promise<{id: number, uuid: string, is_first_login: boolean, username: string, name: string, access_token: string, refresh_token: string}>} 
 *          An object containing the new token data:
 *          - `id`: The user ID.
 *          - `uuid`: The user UUID.
 *          - `is_first_login`: Whether this is the user's first login.
 *          - `username`: The user's username.
 *          - `name`: The user's name.
 *          - `access_token`: The new access token.
 *          - `refresh_token`: The new refresh token.
 * @throws {AuthenticationError} If the refresh token is invalid.
 * @throws {UpstreamError} If the response data is invalid or incomplete.
 * @throws {APIError} If the API request fails.
 */
export async function refresh(refresh_token: string):
    Promise<{
        id: number;
        uuid: string;
        is_first_login: boolean;
        username: string;
        name: string;
        access_token: string;
        refresh_token: string;
    }> {

    // Unpatch the token
    const parts = refresh_token.split('.');
    if (parts.length !== 3)
        throw new AuthenticationError('Invalid refresh token');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    const password = payload.password;
    payload.password = undefined;
    parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    refresh_token = `${parts[0]}.${parts[1]}.${parts[2]}`;

    // Fill in the body
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        password,
        refresh_token,
        scope: 'all',
        loginFrom: 'API',
        logintype: 'sno',
        device_token: 'API',
        synAccessSource: 'API',
    }).toString();

    // Request the token
    return _request_token(body, password);
}

/**
 * Requests a new access token using the provided username and password.
 *
 * @param {string} username - The username to be used for authentication.
 * @param {string} password - The password to be used for authentication.
 * @returns {Promise<{id: number, uuid: string, is_first_login: boolean, username: string, name: string, access_token: string, refresh_token: string}>} 
 *          An object containing the new token data:
 *          - `id`: The user ID.
 *          - `uuid`: The user UUID.
 *          - `is_first_login`: Whether this is the user's first login.
 *          - `username`: The user's username.
 *          - `name`: The user's name.
 *          - `access_token`: The new access token.
 *          - `refresh_token`: The new refresh token.
 * @throws {AuthenticationError} If the username or password is incorrect.
 * @throws {UpstreamError} If the response data is invalid or incomplete.
 * @throws {APIError} If the API request fails.
 */
export async function token(username: string, password: string): Promise<{ id: number; uuid: string; is_first_login: boolean; username: string; name: string; access_token: string; refresh_token: string; }> {

    // Fill in the body
    const body = new URLSearchParams({
        grant_type: 'password',
        username,
        password,
        scope: 'all',
        loginFrom: 'API',
        logintype: 'sno',
        device_token: 'API',
        synAccessSource: 'API',
    }).toString();

    // Request the token
    return _request_token(body, password);
}
