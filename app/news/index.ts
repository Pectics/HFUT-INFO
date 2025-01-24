// Dependencies
import config from '@/config';
import { ParamError, UpstreamError } from "@/lib/errors";
import { CheerioAPI, load as htmlLoad } from "cheerio";
import { createHash } from 'crypto';

// Configs
const ncount = 10;
const hosts = {
    origin: 'https://news.hfut.edu.cn',
    main: (cat: string) => `https://news.hfut.edu.cn/${cat}.htm`,
    // rn is a reversed page number
    page: (cat: string, rn: number) => `https://news.hfut.edu.cn/${cat}/${rn}.htm`,
};
const headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,en-GB;q=0.6',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'priority': 'u=0, i',
    'sec-ch-ua': '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'Referer': 'https://news.hfut.edu.cn',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
};
const selectors = {
    list: 'body > div.list04.wrap > ul',
    nextpage: 'body > div.list04.wrap > div > span.p_pages > span.p_next.p_fun > a',
    item: (i: number) => `body > div.list04.wrap > ul > li:nth-child(${i}) > a`,
    day: (i: number) => `body > div.list04.wrap > ul > li:nth-child(${i}) > a > div.time > div.day`,
    month: (i: number) => `body > div.list04.wrap > ul > li:nth-child(${i}) > a > div.time > div.year`,
    title: (i: number) => `body > div.list04.wrap > ul > li:nth-child(${i}) > a > div.text > h5`,
    summary: (i: number) => `body > div.list04.wrap > ul > li:nth-child(${i}) > a > div.text > p`,
};
const nextpage_href = (cat: string) => new RegExp(`${cat}/([0-9]+)\\.htm`);
const news_href = /(?:\.\.\/)?(info\/\d{4}\/([0-9]+)\.htm)/;
type News = {
    id: number,
    title: string,
    summary: string,
    date: string,
    link: string,
    hash: string,
};

function page2news($: CheerioAPI, count = ncount, index = 0) {
    if (count <= 0 || index >= ncount) return [];
    count = Math.min(count, ncount, $(selectors.list).children().length);
    const news = [] as News[];
    // Convert `count` to end index(max `ncount`), and `index` to 1-based
    for (count = Math.min(ncount, count + index++); index <= count; index++) {
        const item = $(selectors.item(index));
        const href = item.attr('href');
        if (!href) throw new UpstreamError(`News item href not found: ${item.text()}`);
        const exec = news_href.exec(href);
        if (!exec) throw new UpstreamError(`News item href invalid: ${href}`);
        news.push({
            id: parseInt(exec[2]),
            title: $(selectors.title(index)).text().trim(),
            summary: $(selectors.summary(index)).text().trim(),
            date: `${$(selectors.month(index)).text().trim()}-${$(selectors.day(index)).text().trim()}`,
            link: `${hosts.origin}/${exec[1]}`,
            hash: createHash('sha1').update((() => {
                const params = new URLSearchParams();
                params.append('id', exec[2]);
                return `news_summary?${params.toString()}`;
            })()).digest('hex'),
        });
    }
    return news;
}

/**
 * Fetches and returns a list of news articles.
 *
 * @param {number} [category=0] - The category of news articles to return.
 * @param {number} [count=10] - The number of news articles to return.
 * @param {number} [index=0] - The index of the first news article to return.
 * @returns {Promise<{id: number, title: string, summary: string, date: string, link: string, hash: string}[]>} 
 *          An array of news articles:
 *          - `id`: The unique identifier for the news article.
 *          - `title`: The title of the news article.
 *          - `summary`: The summary of the news article.
 *          - `date`: The publication date of the news article.
 *          - `link`: The URL of the news article.
 *          - `hash`: A unique hash generated from the id of the news article.
 * @throws {ParamError} If the category parameter is invalid.
 * @throws {UpstreamError} If there is an error fetching or parsing the news data.
 */
export async function news(
    category: number = 0,
    count: number = 10,
    index: number = 0
): Promise<{
    id: number;
    title: string;
    summary: string;
    date: string;
    link: string;
    hash: string;
}[]> {
    // Check category
    const cat = config.NEWS_CATEGORIES[category];
    if (!cat) throw new ParamError('category', category, `0-${config.NEWS_CATEGORIES.length - 1}`);

    // Fetch the main page
    let $ = htmlLoad(await (await fetch(hosts.main(cat[1]), { headers, method: 'GET' })).text());
    
    // Parse page count
    const _btn = $(selectors.nextpage);
    const _att = _btn.attr('href');
    if (!_att) throw new UpstreamError(`Next page button href not found: ${_btn.text()}`);
    const _btn_exec = nextpage_href(cat[1]).exec(_att);
    if (!_btn_exec || !_btn_exec[1]) throw new UpstreamError(`Next page button href invalid: ${_att}`);

    const maxpage = parseInt(_btn_exec[1]) + 1; // page is 1-based
    // trans 0-9 to int by 10, so use Math.floor + 1
    const startpage = Math.floor(index / ncount) + 1;
    // trans 1-10 to int by 10, so use Math.ceil
    const endpage = Math.min(maxpage, Math.ceil((index + count) / ncount));

    // Fetch the news
    const news = [] as News[];
    const _flag = startpage === 1;
    if (_flag) news.push(...page2news($, count, index));
    for (let i = +_flag + startpage; i <= endpage; i++) {
        $ = htmlLoad(await (await fetch(hosts.page(cat[1], maxpage - i + 1), { headers, method: 'GET' })).text());
        news.push(...page2news($, count -= news.length));
    }

    return news;
}