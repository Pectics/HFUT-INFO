// Dependencies
import config from "@/config";
import { APIError, AuthenticationError, UpstreamError } from "@/lib/errors";

// Configs
const hosts = {
    card: 'http://121.251.19.62/berserker-app/ykt/tsm/queryCard?synAccessSource=API',
    user: 'http://121.251.19.62/berserker-base/user?synAccessSource=API',
};
const headers = {
    'Accept': '*/*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,en-GB;q=0.6',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Connection': 'keep-alive',
    // Necessary for the request to succeed
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
    'Synjones-Auth': '', // Fill this in later
};

/**
 * Fetches card and user information using the provided access token.
 *
 * @param {string} access_token - The access token to authenticate the requests.
 * @returns {Promise<{id: number, name: string, balance: number, pending: number, is_lost: boolean, is_frozen: boolean, transfer_flag: number, bank_account?: string, profile: {id: number, username: string, idcard?: string, name: string, sex: string, department: string, grade: string}}>} 
 *          An object containing card and user information:
 *          - `id`: The card ID.
 *          - `name`: The cardholder's name.
 *          - `balance`: The card balance.
 *          - `pending`: The unsettled amount.
 *          - `is_lost`: Whether the card is reported lost.
 *          - `is_frozen`: Whether the card is frozen.
 *          - `transfer_flag`: The auto-transfer flag.
 *          - `bank_account?`: The bank account associated with the card (if sensitive data is enabled).
 *          - `profile`: The user's profile information:
 *              - `id`: The user ID.
 *              - `username`: The user's account name.
 *              - `idcard?`: The user's ID card number (if sensitive data is enabled).
 *              - `name`: The user's name.
 *              - `sex`: The user's sex ('female' or 'male').
 *              - `department`: The user's department name.
 *              - `grade`: The user's grade or identity name.
 * @throws {UpstreamError} If the response data is invalid or incomplete.
 * @throws {AuthenticationError} If the access token is incorrect.
 * @throws {APIError} If there is an internal server error.
 */
export async function card(access_token: string):
    Promise<{
        id: number;
        name: string;
        balance: number;
        pending: number;
        is_lost: boolean;
        is_frozen: boolean;
        transfer_flag: number;
        bank_account?: string;
        profile: {
            id: number;
            username: string;
            idcard?: string;
            name: string;
            sex: string;
            department: string;
            grade: string;
        };
    }> {

    // Fill in the headers
    headers['Synjones-Auth'] = `Bearer ${access_token}`;

    // Request the card
    const card_res = await fetch(hosts.card, { method: 'GET', headers });
    let card = await card_res.json();
    if (typeof card !== 'object')
        throw new UpstreamError(`Invalid response data of type ${typeof card}`);
    if (!card_res.ok) {
        if (card_res.status === 401 || card.code === 401)
            throw new AuthenticationError('Incorrect access token');
        throw new APIError(card.message || 'Internal Server Error', card_res.status);
    }
    if (!card?.data?.card?.[0])
        throw new UpstreamError(`Card data incomplete`);
    card = card.data.card[0];

    // Request the user
    const user_res = await fetch(hosts.user, { method: 'GET', headers });
    let user = await user_res.json();
    if (typeof user !== 'object')
        throw new UpstreamError(`Invalid response data of type ${typeof user}`);
    if (!user_res.ok) {
        if (user_res.status === 401 || user.code === 401)
            throw new AuthenticationError('Incorrect access token');
        throw new APIError(user.message || 'Internal Server Error', user_res.status);
    }
    if (!user?.data)
        throw new UpstreamError(`User data incomplete`);
    user = user.data;

    // Check required fields
    if (typeof card.account !== 'string' ||
        typeof card.cardname !== 'string' ||
        typeof card.db_balance !== 'number' ||
        typeof card.unsettle_amount !== 'number' ||
        typeof card.lostflag !== 'number' ||
        typeof card.freezeflag !== 'number' ||
        typeof card.autotrans_flag !== 'number' ||
        typeof card.bankacc !== 'string' ||
        typeof user.id !== 'number' ||
        typeof user.account !== 'string' ||
        typeof card.cert !== 'string' ||
        typeof user.name !== 'string' ||
        typeof user.sex !== 'number' ||
        typeof user.departmentName !== 'string' ||
        typeof user.identityName !== 'string'
    ) throw new UpstreamError(`Card or user data incomplete`);

    // Return the card
    const _id = parseInt(card.account);
    if (isNaN(_id))
        throw new UpstreamError(`Invalid card ID: ${card.account}`);
    return {
        id: _id,
        name: card.cardname,
        balance: card.db_balance,
        pending: card.unsettle_amount,
        is_lost: card.lostflag === 1,
        is_frozen: card.freezeflag === 1,
        transfer_flag: card.autotrans_flag,
        bank_account: config.CARD_SENSITIVE_DATA ? card.bankacc : undefined,
        profile: {
            id: user.id,
            username: user.account,
            idcard: config.CARD_SENSITIVE_DATA ? card.cert : undefined,
            name: user.name,
            sex: ['female', 'male'][user.sex],
            department: user.departmentName,
            grade: user.identityName,
        }
    }
}