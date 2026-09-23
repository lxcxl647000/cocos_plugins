"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configs = exports.PACKAGE_NAME = void 0;
/**
 * The package name of this extension. Must match `package.json`'s `name`
 * field, and is used as the i18n namespace prefix (`i18n:admob.*`) for every
 * build-panel option below.
 */
exports.PACKAGE_NAME = 'admob';
exports.configs = {
    android: {
        hooks: './hooks',
        options: {
            enableAdMob: {
                label: `i18n:${exports.PACKAGE_NAME}.enableAdMob.title`,
                description: `i18n:${exports.PACKAGE_NAME}.enableAdMob.tip`,
                default: true,
                render: {
                    ui: 'ui-checkbox',
                },
            },
            androidAppId: {
                label: `i18n:${exports.PACKAGE_NAME}.androidAppId.title`,
                description: `i18n:${exports.PACKAGE_NAME}.androidAppId.tip`,
                default: '',
                render: {
                    ui: 'ui-input',
                    attributes: {
                        placeholder: 'ca-app-pub-3940256099942544~3347511713',
                    },
                },
            },
            useTestAds: {
                label: `i18n:${exports.PACKAGE_NAME}.useTestAds.title`,
                description: `i18n:${exports.PACKAGE_NAME}.useTestAds.tip`,
                default: true,
                render: {
                    ui: 'ui-checkbox',
                },
            },
            testDeviceIds: {
                label: `i18n:${exports.PACKAGE_NAME}.testDeviceIds.title`,
                description: `i18n:${exports.PACKAGE_NAME}.testDeviceIds.tip`,
                default: '',
                render: {
                    ui: 'ui-input',
                    attributes: {
                        placeholder: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA, BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
                    },
                },
            },
            overwriteLibrary: {
                label: `i18n:${exports.PACKAGE_NAME}.overwriteLibrary.title`,
                description: `i18n:${exports.PACKAGE_NAME}.overwriteLibrary.tip`,
                default: true,
                render: {
                    ui: 'ui-checkbox',
                },
            },
        },
    },
    ios: {
        hooks: './hooks',
        options: {
            enableAdMob: {
                label: `i18n:${exports.PACKAGE_NAME}.enableAdMob.title`,
                description: `i18n:${exports.PACKAGE_NAME}.enableAdMob.tip`,
                default: true,
                render: {
                    ui: 'ui-checkbox',
                },
            },
            iosAppId: {
                label: `i18n:${exports.PACKAGE_NAME}.iosAppId.title`,
                description: `i18n:${exports.PACKAGE_NAME}.iosAppId.tip`,
                default: '',
                render: {
                    ui: 'ui-input',
                    attributes: {
                        placeholder: 'ca-app-pub-3940256099942544~1458002511',
                    },
                },
            },
            useTestAds: {
                label: `i18n:${exports.PACKAGE_NAME}.useTestAds.title`,
                description: `i18n:${exports.PACKAGE_NAME}.useTestAds.tip`,
                default: true,
                render: {
                    ui: 'ui-checkbox',
                },
            },
            testDeviceIds: {
                label: `i18n:${exports.PACKAGE_NAME}.testDeviceIds.title`,
                description: `i18n:${exports.PACKAGE_NAME}.testDeviceIds.tip`,
                default: '',
                render: {
                    ui: 'ui-input',
                    attributes: {
                        placeholder: '2077ef9a63d2b398840261c8221a0c9b',
                    },
                },
            },
            overwriteLibrary: {
                label: `i18n:${exports.PACKAGE_NAME}.overwriteLibrary.title`,
                description: `i18n:${exports.PACKAGE_NAME}.overwriteLibrary.tip`,
                default: true,
                render: {
                    ui: 'ui-checkbox',
                },
            },
        },
    },
};
