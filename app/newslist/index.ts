// Dependencies
import { CheerioAPI, load as htmlLoad } from "cheerio";
import { createHash } from 'crypto';

// Configs
const ncount = 10; // Amount of news per page, also the default amount of news to get
const hosts = {
    origin: 'https://news.hfut.edu.cn',
    main: 'https://news.hfut.edu.cn/gdyw1.htm',
    // rn is a reversed page number
    page: (rn: number) => `https://news.hfut.edu.cn/gdyw1/${rn}.htm`,
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
const nextpage_href = /gdyw1\/([0-9]+)\.htm/;
const news_href = /(?:\.\.\/)?(info\/1011\/([0-9]+)\.htm)/;

function parseNews($: CheerioAPI) {
    const count = Math.min(ncount, $(selectors.list).children().length);
    const news = [];
    for (let i = 1; i <= count; i++) {
        let group = news_href.exec($(selectors.item(i)).attr('href')!)!;
        news.push({
            id: parseInt(group[2]),
            title: $(selectors.title(i)).text().trim(),
            summary: $(selectors.summary(i)).text().trim(),
            date: `${$(selectors.month(i)).text().trim()}-${$(selectors.day(i)).text().trim()}`,
            link: `${hosts.origin}/${group[1]}`,
            hash: createHash('md5').update(`?id=${group[2]}`).digest('hex'),
        });
    }
    return news;
}

/**
 * Fetches and returns a list of news articles.
 *
 * @param count - The number of news articles to return.
 * @param index - The index of the first news article to return.
 * @returns An array of news articles.
 * 
 * The returned array contains objects with the following structure:
 * - id: The unique identifier for the news article.
 * - title: The title of the news article.
 * - summary: The summary of the news article.
 * - date: The publication date of the news article.
 * - link: The URL of the news article.
 * - hash: A unique hash generated from the id of the news article.
 */
export async function newslist(count = 10, index = 0) {

    // Fetch the main page
    let $ = htmlLoad(await (await fetch(hosts.main, { headers, method: 'GET' })).text());
    
    // Parse the first page
    const maxpage = parseInt(nextpage_href.exec($(selectors.nextpage).attr('href')!)![1]!);
    let news = parseNews($);

    // Fetch more pages
    if (news.length < index + count) {
        const startpage = Math.floor(index / ncount);
        const pagecount = Math.ceil((index + count - news.length) / ncount);
        if (startpage !== 0) news = [];
        for (let i = 0; i < pagecount; i++) {
            $ = htmlLoad(await (await fetch(hosts.page(maxpage - startpage - i), { headers, method: 'GET' })).text());
            news.push(...parseNews($));
        }
    }

    return news.slice(index % ncount, index % ncount + count);
}