export default {
    TIMEZONE: 'Asia/Shanghai',
    DOCS_URL: 'https://docs.hfut.info',
    HEADER_PARAM_PREFIX: 'X-HFUTINFO-',
    API: {
        '/news': [
            '/:id\\d+',
            '/',
        ],
        '/synjones': [
            '/token',
            '/card',
            '/water/:phone\\d{11}',
        ]
    },
    /* News API */
    NEWS_CATEGORIES: [
        [1011, 'gdyw1', '工大要闻'],
        [1020, 'hzjl1', '合作交流'],
        [1018, 'jxky1', '教学科研'],
        [1014, 'spxw',  '视频新闻'], //
        [1012, 'zhxw1', '综合新闻'],
        [null, 'xmtlm', '微信精选'], //
        [1017, 'dcxy',  '多彩校园'], //
        [1022, 'gdrw1', '工大人物'],
        [1015, 'mtgd',  '媒体工大'],
    ] as [number, string, string][],
    /* Synjones API */
    SYNJONES_SENSITIVE: false,
};