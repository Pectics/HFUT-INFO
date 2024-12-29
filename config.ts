export default {
    API: {
        '/news': [
            '/:id\\d+',
            '/',
        ],
        '/synjones': [
            '/token',
            '/card',
            '/water',
        ]
    },
    HEADER_PARAM_PREFIX: 'X-HFUTINFO-',
    TIMEZONE: 'Asia/Shanghai',
    DOCS_URL: 'https://docs.hfut.info',
    CARD_SENSITIVE_DATA: false,
}