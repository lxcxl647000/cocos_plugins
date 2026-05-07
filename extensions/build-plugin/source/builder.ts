import { BuildPlugin } from '../@types';
import { PACKAGE_NAME } from './global';

export const load: BuildPlugin.load = function () {
    console.debug(`${PACKAGE_NAME} load`);
};
export const unload: BuildPlugin.load = function () {
    console.debug(`${PACKAGE_NAME} unload`);
};

export const configs: BuildPlugin.Configs = {
    '*': {
        hooks: './hooks',
        doc: 'editor/publish/custom-build-plugin.html',
        options: {
            injectCode: {
                label: `注入代码`,
                description: `需要在构建出的文件中注入的代码`,
                default: '',
                render: {
                    ui: 'ui-input',
                    attributes: {
                        placeholder: `请填入需要注入的代码`,
                    },
                },
            },
            injectFilePath: {
                label: `需要注入代码的文件路径`,
                description: `需要注入代码的文件路径（构建出的）`,
                default: '',
                render: {
                    ui: 'ui-input',
                    attributes: {
                        placeholder: `请填入需要注入的文件路径`,
                    },
                },
            },
            searchPattern: {
                label: `注入代码位置`,
                description: `需要注入代码位置（正则）/(globalThis\s*=\s*\$global\s*;)/`,
                default: '',
                render: {
                    ui: 'ui-input',
                    attributes: {
                        placeholder: `请填入注入代码位置`,
                    },
                },
            },
            injectAtTop: {
                label: `是否在顶部注入`,
                description: `是否在顶部注入`,
                default: false,
                render: {
                    ui: 'ui-checkbox',
                },
            },
            navigationBarTextStyle: {
                label: `导航栏文字样式`,
                description: `导航栏文字颜色`,
                default: 'black',
                render: {
                    ui: 'ui-select',
                    "items": [
                        {
                            "value": 'black',
                            "label": "black"
                        },
                        {
                            "value": 'white',
                            "label": "white"
                        }
                    ]
                },
            }
        },
        verifyRuleMap: {
            ruleTest: {
                message: `i18n:${PACKAGE_NAME}.options.ruleTest_msg`,
                func(val, buildOptions) {
                    if (val === 'cocos') {
                        return true;
                    }
                    return false;
                },
            },
        },
    },
};

export const assetHandlers: BuildPlugin.AssetHandlers = './asset-handlers';
