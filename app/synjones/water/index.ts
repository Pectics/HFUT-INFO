// Dependencies
import { APIError, AuthenticationError, ParamError, UpstreamError } from "@/lib/errors";

// Configs
const host = 'http://121.251.19.62/charge/feeitem/getThirdData';
const authkey = 'charge:charge_secret';
const headers = {
    'Accept': '*/*',
    'Authorization': `Basic ${Buffer.from(authkey).toString('base64')}`,
    'Connection': 'keep-alive',
    'Content-Length': '', // Fill this in later
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/68.0.3440.70 Mobile Safari/537.36/Synjones-E-Campus/2.3.20/&cn&/101',
    'Synjones-Auth': '', // Fill this in later
};
const body = {
    'feeitemid': '222',
    'type': 'IEC',
    'level': '1',
    'telPhone': '', // Fill this in later
};

/**
 * Fetches water account information from the upstream service.
 *
 * @param {string} access_token - The access token for authentication.
 * @param {string} phone - The phone number associated with the water account.
 * @returns {Promise<{id: number, phone: string, balance: number, is_card: boolean, is_code: boolean}>} 
 *          An object containing water account details:
 *          - `id`: The account ID.
 *          - `phone`: The phone number associated with the account.
 *          - `balance`: The account balance.
 *          - `is_card`: Whether the account is associated with a card.
 *          - `is_code`: Whether the account uses a code.
 * @throws {UpstreamError} If the response data is invalid or incomplete.
 * @throws {AuthenticationError} If the access token is incorrect.
 * @throws {APIError} If there is an error with the API request or the account is not found.
 */
export async function water(access_token: string, phone: string):
    Promise<{
        id: number;
        student_id: string;
        phone: string;
        balance: number;
        is_card: boolean;
        is_code: boolean;
    }> {

    // Fill in the headers
    body.telPhone = phone;
    const body_str = new URLSearchParams(body).toString();
    headers['Synjones-Auth'] = `Bearer ${access_token}`;
    headers['Content-Length'] = body_str.length.toString();

    // Request the card
    const res = await fetch(host, { method: 'POST', headers, body: body_str });
    let water = await res.json();
    console.log(body_str);
    console.log(res)
    console.log(water)
    if (typeof water !== 'object' || !water?.map?.data)
        throw new UpstreamError(`Invalid response data of type ${typeof water}`);
    water = water.map.data;
    if (!res.ok) {
        if (res.status === 401 || water.code === 401)
            throw new AuthenticationError('Incorrect access token');
        throw new APIError(water.message || 'Internal Server Error', res.status);
    }
    if (water?.errorCode === 10)
        throw new APIError(`Account not found: ${phone}`, 404);

    // Check required fields
    if (typeof water.accountId !== 'number' ||
        typeof water.telPhone !== 'string' ||
        typeof water.identifier !== 'string' ||
        typeof water.accountMoney !== 'number' ||
        typeof water.accountGivenMoney !== 'number' ||
        typeof water.isCard !== 'number' ||
        typeof water.isUseCode !== 'number'
    ) throw new UpstreamError(`Water info incomplete`);

    // Return the card
    return {
        id: water.accountId as number,
        student_id: water.identifier as string,
        phone: water.telPhone as string,
        balance: (water.accountMoney + water.accountGivenMoney) / 10,
        is_card: water.isCard === 1,
        is_code: water.isUseCode === 1,
    }
}