// Dependencies
import config from '@/config';
import { APIError, ParamError, UpstreamError } from '@/lib/errors';
import { load as htmlLoad } from 'cheerio';
import { createHash } from 'crypto';

// Configs
const hosts = {
    origin: 'https://news.hfut.edu.cn',
    info: (node: number, id: number) => `https://news.hfut.edu.cn/info/${node}/${id}.htm`,
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
};
const selector_form = 'body > div.list-show.wrap > div.list_right > form';
const selectors = {
    title: `${selector_form} > div > div.show01 > h5`,
    date: `${selector_form} > div > div.show01 > p > i:first-child`,
    source: `${selector_form} > div > div.show01 > p > i:last-child`,
    head: [
        `${selector_form} > div > div.show02 > div > div > p:first-child`,
        `${selector_form} > div > div.show02 > div > div > div > p:first-child`,
        `${selector_form} > div > div.show02 > div > div > p:first-child`,
        `${selector_form} > div > div.show02 > div > div > div > p:first-child`,
    ].join(', '),
    foot: [
        `${selector_form} > div > div.show02 > div > div > p:last-child`,
        `${selector_form} > div > div.show02 > div > div > div > p:last-child`,
        `${selector_form} > div > div.show02 > div > div > p:last-child`,
        `${selector_form} > div > div.show02 > div > div > div > p:last-child`,
    ].join(', '),
};
const date_regex = /日期： *(\d{4}-\d{2}-\d{2})/;
const source_regex = /稿件来源： *(.*)/;
const editor_regex = /(?:责任)?编辑： *(.*)/;
const author_regex = /.*(?:（|\()(.*[图文审核].*)(?:）|\)).*/;
const video_regex = /showVsbVideo\("(.*?\.mp4)\"/;
const align_center_style_regex = /.*text-align: *center;?.*/;
type Part = {
    type: 'image';
    url: string;
    alt: string | undefined;
} | {
    type: 'video';
    url: string;
} | {
    type: 'text';
    text: string;
};

/**
 * Fetches and parses news content from a specified source.
 *
 * @param id - The unique identifier for the news article.
 * @param category - The category of the news article, if not specified, the search will be traversed.
 * @param format - The format in which to return the content. Can be 'array' or 'markdown'. Defaults to 'array'.
 * @returns An object containing the news article details including id, title, date, source, editor, authors, content, and a hash.
 *
 * The returned object structure:
 * - id: The unique identifier for the news article.
 * - title: The title of the news article.
 * - date: The publication date of the news article.
 * - source: The source of the news article.
 * - editor: The editor of the news article, if available.
 * - authors: An array of authors of the news article, if available.
 * - content: The content of the news article, either as an array of text and image blocks or as a markdown string, depending on the format parameter.
 * - hash: A unique hash generated from the id and title of the news article.
 *
 * The content array contains objects with the following structure:
 * - type: 'image' or 'text'.
 * - url: The URL of the image (only for type 'image').
 * - alt: The alt text of the image (only for type 'image').
 * - text: The text content (only for type 'text').
 */
export async function news(id: number, category: number, format: 'array' | 'markdown' = 'array') {
    let _res: Response | undefined;
    // Category is specified
    if (!Number.isNaN(category)) {
        if (!(category in config.NEWS_CATEGORIES))
            throw new ParamError('category', category, `0-${config.NEWS_CATEGORIES.length - 1}`);
        _res = await fetch(hosts.info(config.NEWS_CATEGORIES[category][0], id), { headers });
    }
    // Category is not specified
    else {
        for (const [cat, [node]] of config.NEWS_CATEGORIES.entries()) {
            if (node === null) continue;
            _res = await fetch(hosts.info(node, id), { headers });
            console.log(_res.status);
            if (_res.status === 200) {
                category = cat;
                break;
            }
        }
    }
    if (!_res || _res.status !== 200 || Number.isNaN(category))
        throw new Error('Resource Not Found');

    const $ = htmlLoad(await _res.text());

    const title = $(selectors.title).text().trim();

    const date_str = $(selectors.date).text().trim();
    const date_exec = date_regex.exec(date_str);
    if (!date_exec) throw new UpstreamError(`Invalid date string: ${date_str}`);
    const date = date_exec[1];

    const source_str = $(selectors.source).text().trim();
    const source_exec = source_regex.exec(source_str);
    if (!source_exec) throw new UpstreamError(`Invalid source string: ${source_str}`);
    const source = source_exec[1] || '合肥工业大学新闻网';

    let editor = null as string | null;
    let editor_str = null as string | null;
    let authors = null as string[] | null;

    // Extract editor
    let _last = $(selectors.foot);
    if (_last.length) {
        while (_last.prev().length && _last.text().trim() === '')
            _last = _last.prev();
        editor_str = _last.text().trim();
        const exec = editor_regex.exec(editor_str);
        if (exec) editor = exec[1];
    }

    // Extract authors
    if (_last.prev().length) _last = _last.prev();
    while (_last.length) {
        // Skip blank elements
        while (_last.prev().length && _last.text().trim() === '')
            _last = _last.prev();
        // Find the last element that matches the author regex
        const author_exec = author_regex.exec(_last.text());
        if (!author_exec) {
            _last = _last.prev();
            continue;
        }
        // Matches author names
        let _author = author_exec[1].trim().replaceAll(/\/(?:文|图|审核)|综合/g, '/');
        let _authors = new Set<string>();
        let matches;
        if ((matches = _author.match(/[\u4E00-\u9FA5]{2,}/g)) !== null && matches.length > 0)
            matches.forEach(m => _authors.add(m));
        if ((matches = _author.match(/[A-Za-z\.·]+(?: [A-Za-z\.·]+)*/g)) !== null && matches.length > 0)
            matches.forEach(m => _authors.add(m));
        if (_authors.size > 0) authors = [..._authors];
        break;
    }

    // Parse content
    let content: string | Part[] = [];
    let _current = $(selectors.head);
    let _last_is_img = false;
    while (_current.length) {
        if (_current.hasClass('vsbcontent_img')) {
            const image = {
                type: 'image' as const,
                url: (() => {
                    const img_ele = _current.find('img');
                    const img_src = img_ele.attr('src');
                    if (!img_src) throw new UpstreamError(`Image source not found: ${img_ele.text()}`);
                    if (img_src.startsWith('/')) return `${hosts.origin}${img_src}`;
                    return img_src;
                })(),
                alt: undefined as string | undefined,
            };
            content.push(image);
            _last_is_img = true;
        } else if (_current.text().startsWith('showVsbVideo')) {
            const video = {
                type: 'video' as const,
                url: (() => {
                    const video_exec = video_regex.exec(_current.text());
                    if (!video_exec?.[1]) throw new UpstreamError(`Video source not match: ${_current.text()}`);
                    if (video_exec[1].startsWith('/')) return `${hosts.origin}${video_exec[1]}`;
                    return video_exec[1];
                })(),
            };
            content.push(video);
            _last_is_img = false;
        } else {
            const text = _current.text().trim();
            if (text) {
                if (_last_is_img && (_current.find('span').length || _current.css()) &&
                    align_center_style_regex.test(_current.attr('style') || '')) {
                    const _img = content.pop();
                    if (!_img || _img.type !== 'image')
                        throw new APIError(`\`_last_is_img\` is true but content is not an image: ${_img}`);
                    _img.alt = text;
                    content.push(_img);
                    _last_is_img = false;
                } else content.push({ type: 'text', text });
            }
        }
        _current = _current.next();
    }

    // Format content
    switch (format) {
        case 'markdown':
            let markdown = '';
            for (const block of content)
                switch (block.type) {
                    case 'image':
                        markdown += `![${block.alt || ''}](${block.url})\n\n`;
                        break;
                    case 'video':
                        markdown += `![视频](${block.url})\n\n`;
                        break;
                    case 'text':
                        markdown += `${block.text}\n\n`;
                        break;
                }
            content = markdown;
            break;
        case 'array':
        default:
            break;
    }

    return {
        id, category: config.NEWS_CATEGORIES[category][2],
        title, date, source, editor, authors, content,
        link: hosts.info(config.NEWS_CATEGORIES[category][0], id),
        hash: createHash('sha1').update((() => {
            const params = new URLSearchParams();
            params.append('id', id.toString());
            return `news?${params.toString()}`;
        })()).digest('hex'),
    };
}
