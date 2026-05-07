"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetHandlers = exports.configs = exports.unload = exports.load = void 0;
const global_1 = require("./global");
const load = function () {
    console.debug(`${global_1.PACKAGE_NAME} load`);
};
exports.load = load;
const unload = function () {
    console.debug(`${global_1.PACKAGE_NAME} unload`);
};
exports.unload = unload;
exports.configs = {
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
                message: `i18n:${global_1.PACKAGE_NAME}.options.ruleTest_msg`,
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
exports.assetHandlers = './asset-handlers';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9idWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHFDQUF3QztBQUVqQyxNQUFNLElBQUksR0FBcUI7SUFDbEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLHFCQUFZLE9BQU8sQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQztBQUZXLFFBQUEsSUFBSSxRQUVmO0FBQ0ssTUFBTSxNQUFNLEdBQXFCO0lBQ3BDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxxQkFBWSxTQUFTLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUM7QUFGVyxRQUFBLE1BQU0sVUFFakI7QUFFVyxRQUFBLE9BQU8sR0FBd0I7SUFDeEMsR0FBRyxFQUFFO1FBQ0QsS0FBSyxFQUFFLFNBQVM7UUFDaEIsR0FBRyxFQUFFLHlDQUF5QztRQUM5QyxPQUFPLEVBQUU7WUFDTCxVQUFVLEVBQUU7Z0JBQ1IsS0FBSyxFQUFFLE1BQU07Z0JBQ2IsV0FBVyxFQUFFLGlCQUFpQjtnQkFDOUIsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsTUFBTSxFQUFFO29CQUNKLEVBQUUsRUFBRSxVQUFVO29CQUNkLFVBQVUsRUFBRTt3QkFDUixXQUFXLEVBQUUsWUFBWTtxQkFDNUI7aUJBQ0o7YUFDSjtZQUNELGNBQWMsRUFBRTtnQkFDWixLQUFLLEVBQUUsYUFBYTtnQkFDcEIsV0FBVyxFQUFFLG1CQUFtQjtnQkFDaEMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsTUFBTSxFQUFFO29CQUNKLEVBQUUsRUFBRSxVQUFVO29CQUNkLFVBQVUsRUFBRTt3QkFDUixXQUFXLEVBQUUsY0FBYztxQkFDOUI7aUJBQ0o7YUFDSjtZQUNELGFBQWEsRUFBRTtnQkFDWCxLQUFLLEVBQUUsUUFBUTtnQkFDZixXQUFXLEVBQUUsK0NBQStDO2dCQUM1RCxPQUFPLEVBQUUsRUFBRTtnQkFDWCxNQUFNLEVBQUU7b0JBQ0osRUFBRSxFQUFFLFVBQVU7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFdBQVcsRUFBRSxXQUFXO3FCQUMzQjtpQkFDSjthQUNKO1lBQ0QsV0FBVyxFQUFFO2dCQUNULEtBQUssRUFBRSxTQUFTO2dCQUNoQixXQUFXLEVBQUUsU0FBUztnQkFDdEIsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsTUFBTSxFQUFFO29CQUNKLEVBQUUsRUFBRSxhQUFhO2lCQUNwQjthQUNKO1lBQ0Qsc0JBQXNCLEVBQUU7Z0JBQ3BCLEtBQUssRUFBRSxTQUFTO2dCQUNoQixXQUFXLEVBQUUsU0FBUztnQkFDdEIsT0FBTyxFQUFFLE9BQU87Z0JBQ2hCLE1BQU0sRUFBRTtvQkFDSixFQUFFLEVBQUUsV0FBVztvQkFDZixPQUFPLEVBQUU7d0JBQ0w7NEJBQ0ksT0FBTyxFQUFFLE9BQU87NEJBQ2hCLE9BQU8sRUFBRSxPQUFPO3lCQUNuQjt3QkFDRDs0QkFDSSxPQUFPLEVBQUUsT0FBTzs0QkFDaEIsT0FBTyxFQUFFLE9BQU87eUJBQ25CO3FCQUNKO2lCQUNKO2FBQ0o7U0FDSjtRQUNELGFBQWEsRUFBRTtZQUNYLFFBQVEsRUFBRTtnQkFDTixPQUFPLEVBQUUsUUFBUSxxQkFBWSx1QkFBdUI7Z0JBQ3BELElBQUksQ0FBQyxHQUFHLEVBQUUsWUFBWTtvQkFDbEIsSUFBSSxHQUFHLEtBQUssT0FBTyxFQUFFLENBQUM7d0JBQ2xCLE9BQU8sSUFBSSxDQUFDO29CQUNoQixDQUFDO29CQUNELE9BQU8sS0FBSyxDQUFDO2dCQUNqQixDQUFDO2FBQ0o7U0FDSjtLQUNKO0NBQ0osQ0FBQztBQUVXLFFBQUEsYUFBYSxHQUE4QixrQkFBa0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEJ1aWxkUGx1Z2luIH0gZnJvbSAnLi4vQHR5cGVzJztcclxuaW1wb3J0IHsgUEFDS0FHRV9OQU1FIH0gZnJvbSAnLi9nbG9iYWwnO1xyXG5cclxuZXhwb3J0IGNvbnN0IGxvYWQ6IEJ1aWxkUGx1Z2luLmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBjb25zb2xlLmRlYnVnKGAke1BBQ0tBR0VfTkFNRX0gbG9hZGApO1xyXG59O1xyXG5leHBvcnQgY29uc3QgdW5sb2FkOiBCdWlsZFBsdWdpbi5sb2FkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgY29uc29sZS5kZWJ1ZyhgJHtQQUNLQUdFX05BTUV9IHVubG9hZGApO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGNvbmZpZ3M6IEJ1aWxkUGx1Z2luLkNvbmZpZ3MgPSB7XHJcbiAgICAnKic6IHtcclxuICAgICAgICBob29rczogJy4vaG9va3MnLFxyXG4gICAgICAgIGRvYzogJ2VkaXRvci9wdWJsaXNoL2N1c3RvbS1idWlsZC1wbHVnaW4uaHRtbCcsXHJcbiAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICBpbmplY3RDb2RlOiB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogYOazqOWFpeS7o+eggWAsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogYOmcgOimgeWcqOaehOW7uuWHuueahOaWh+S7tuS4reazqOWFpeeahOS7o+eggWAsXHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAnJyxcclxuICAgICAgICAgICAgICAgIHJlbmRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgIHVpOiAndWktaW5wdXQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGDor7floavlhaXpnIDopoHms6jlhaXnmoTku6PnoIFgLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBpbmplY3RGaWxlUGF0aDoge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6IGDpnIDopoHms6jlhaXku6PnoIHnmoTmlofku7bot6/lvoRgLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGDpnIDopoHms6jlhaXku6PnoIHnmoTmlofku7bot6/lvoTvvIjmnoTlu7rlh7rnmoTvvIlgLFxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogJycsXHJcbiAgICAgICAgICAgICAgICByZW5kZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICB1aTogJ3VpLWlucHV0JyxcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBg6K+35aGr5YWl6ZyA6KaB5rOo5YWl55qE5paH5Lu26Lev5b6EYCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2VhcmNoUGF0dGVybjoge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6IGDms6jlhaXku6PnoIHkvY3nva5gLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGDpnIDopoHms6jlhaXku6PnoIHkvY3nva7vvIjmraPliJnvvIkvKGdsb2JhbFRoaXNcXHMqPVxccypcXCRnbG9iYWxcXHMqOykvYCxcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICcnLFxyXG4gICAgICAgICAgICAgICAgcmVuZGVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdWk6ICd1aS1pbnB1dCcsXHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogYOivt+Whq+WFpeazqOWFpeS7o+eggeS9jee9rmAsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGluamVjdEF0VG9wOiB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogYOaYr+WQpuWcqOmhtumDqOazqOWFpWAsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogYOaYr+WQpuWcqOmhtumDqOazqOWFpWAsXHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHJlbmRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgIHVpOiAndWktY2hlY2tib3gnLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbmF2aWdhdGlvbkJhclRleHRTdHlsZToge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6IGDlr7zoiKrmoI/mloflrZfmoLflvI9gLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGDlr7zoiKrmoI/mloflrZfpopzoibJgLFxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogJ2JsYWNrJyxcclxuICAgICAgICAgICAgICAgIHJlbmRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgIHVpOiAndWktc2VsZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBcIml0ZW1zXCI6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YWx1ZVwiOiAnYmxhY2snLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJsYWJlbFwiOiBcImJsYWNrXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YWx1ZVwiOiAnd2hpdGUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJsYWJlbFwiOiBcIndoaXRlXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHZlcmlmeVJ1bGVNYXA6IHtcclxuICAgICAgICAgICAgcnVsZVRlc3Q6IHtcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBpMThuOiR7UEFDS0FHRV9OQU1FfS5vcHRpb25zLnJ1bGVUZXN0X21zZ2AsXHJcbiAgICAgICAgICAgICAgICBmdW5jKHZhbCwgYnVpbGRPcHRpb25zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbCA9PT0gJ2NvY29zJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgfSxcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBhc3NldEhhbmRsZXJzOiBCdWlsZFBsdWdpbi5Bc3NldEhhbmRsZXJzID0gJy4vYXNzZXQtaGFuZGxlcnMnO1xyXG4iXX0=