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
        ],
        '/laundries': [
            '/:id\\d+',
            '/',
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
    /* Laundry API */
    LAUNDRY_CODES: {
        floors: ["493fb682-9e9f-46fb-9b25-07ce0a0ce7c8"],
        rooms: [
            "201906141445550000054569848532",
            "202401021844500000069996566537",
        ],
    },
    LAUNDRY_UPDATE_INTERVAL: 60,
    LAUNDRY_QIEKJ_TOKEN: '1c1f3ea17b9e6ad2f62544f0188ddb9b',
};