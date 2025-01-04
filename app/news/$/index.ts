// Dependencies
import { UpstreamError } from '@/lib/errors';
import { load as htmlLoad } from 'cheerio';
import { createHash } from 'crypto';

// Configs
const hosts = {
    origin: 'https://news.hfut.edu.cn',
    info: (id: number) => `https://news.hfut.edu.cn/info/1011/${id}.htm`,
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
const selectors = {
    title: 'body > div.list-show.wrap > div.list_right > form > div > div.show01 > h5',
    date: 'body > div.list-show.wrap > div.list_right > form > div > div.show01 > p > i:nth-child(1)',
    source: 'body > div.list-show.wrap > div.list_right > form > div > div.show01 > p > i:nth-child(2)',
    editor: '#vsb_content_2 > div > p.vsbcontent_end',
    content: '#vsb_content_2 > div > p.vsbcontent_start'
};
const date_regex = /日期： *(\d{4}-\d{2}-\d{2})/;
const source_regex = /稿件来源： *([\s\S]+)/;
const editor_regex = /责任编辑： *([\s\S]+)/;
const author_regex = /(?:（|\()([\s\S]+)(?:）|\))/;
const author_style_regex = /.*text-align: *right;?/;
const image_alt_style_regex = /.*text-align: *center;?/;

/**
 * Fetches and parses news content from a specified source.
 *
 * @param id - The unique identifier for the news article.
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
export async function news(id: number, format: 'array' | 'markdown' = 'array') {
    const _res = await fetch(hosts.info(id), { headers, method: 'GET' });
    if (_res.status === 404) throw new Error('Resource Not Found');
    const $ = htmlLoad(await _res.text());
    const title = $(selectors.title).text().trim();

    const date_str = $(selectors.date).text().trim();
    const date_exec = date_regex.exec(date_str);
    if (!date_exec) throw new UpstreamError(`Invalid date string: ${date_str}`);
    const date = date_exec[1];

    const source_str = $(selectors.source).text().trim();
    const source_exec = source_regex.exec(source_str);
    if (!source_exec) throw new UpstreamError(`Invalid source string: ${source_str}`);
    const source = $(selectors.source).text().trim();


    let editor = null as string | null;
    let editor_str = null as string | null;
    let authors = null as string[] | null;

    // Extract editor and author
    let _last = $(selectors.editor);
    if (_last.hasClass('vsbcontent_end')) {
        editor_str = _last.text().trim();
        const exec = editor_regex.exec(editor_str);
        if (exec) editor = exec[1];
    }
    _last = _last.prev();
    const _last_style = _last.attr('style');
    if (_last_style && author_style_regex.test(_last_style) &&
        author_regex.test(_last.text())
    ) {
        let _author = _last.text().trim().replaceAll(/\/(?:文|图|审核)/g, '/');
        let _authors = new Set<string>();
        let matches;
        if ((matches = _author.match(/[\u4E00-\u9FA5]{2,}/g)) !== null && matches.length > 0)
            matches.forEach((m) => _authors.add(m));
        if ((matches = _author.match(/[A-Za-z\.·]+(?: [A-Za-z\.·]+)*/g)) !== null && matches.length > 0)
            matches.forEach((m) => _authors.add(m));
        if (_authors.size > 0) authors = [..._authors];
    }

    // Parse content
    let content: string | ({
        type: 'image';
        url: string;
        alt: string | undefined;
    } | {
        type: 'text';
        text: string;
    })[] = [];
    let _current = $(selectors.content);
    while (!_current.hasClass('vsbcontent_end')) {
        if (_current.hasClass('vsbcontent_img')) {
            const image = {
                type: 'image' as const,
                url: `${hosts.origin}${(() => {
                    const img_ele = _current.find('img');
                    const img_src = img_ele.attr('src');
                    if (!img_src) throw new UpstreamError(`Image source not found: ${img_ele.text()}`);
                    return img_src;
                })()}`,
                alt: undefined as string | undefined,
            };
            const _next_style = _current.next().attr('style');
            if (_next_style && image_alt_style_regex.test(_next_style)) {
                let alt = _current = _current.next();
                while (alt.length && alt.text().trim() === '') alt = alt.first();
                image.alt = alt.text().trim();
            }
            content.push(image);
        } else {
            const text = _current.text().trim();
            if (text && text !== '') content.push({ type: 'text', text });
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
                    case 'text':
                        markdown += `${block.text}\n\n`;
                        break;
                }
            if (editor_str)
                markdown += editor_str;
            content = markdown;
            break;
        case 'array':
        default:
            if (editor_str)
                content.push({ type: 'text', text: editor_str });
            break;
    }

    return {
        id, title, date, source, editor, authors, content, link: hosts.info(id),
        hash: createHash('sha1').update((() => {
            const params = new URLSearchParams();
            params.append('id', id.toString());
            params.append('title', title);
            return `news?${params.toString()}`;
        })()).digest('hex'),
    };
}
