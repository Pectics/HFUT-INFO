export default {
    API: {
        '/news': [
            '/:id\\d+',
            '/',
        ],
        '/card': [
            '/token',
            '/',
        ]
    },
    HEADER_PARAM_PREFIX: 'X-HFUTINFO-',
    TIMEZONE: 'Asia/Shanghai',
    DOCS_URL: 'https://docs.hfut.info',
    CARD_SENSITIVE_DATA: false,
}