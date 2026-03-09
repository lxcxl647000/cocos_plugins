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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9idWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHFDQUF3QztBQUVqQyxNQUFNLElBQUksR0FBcUI7SUFDbEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLHFCQUFZLE9BQU8sQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQztBQUZXLFFBQUEsSUFBSSxRQUVmO0FBQ0ssTUFBTSxNQUFNLEdBQXFCO0lBQ3BDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxxQkFBWSxTQUFTLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUM7QUFGVyxRQUFBLE1BQU0sVUFFakI7QUFFVyxRQUFBLE9BQU8sR0FBd0I7SUFDeEMsR0FBRyxFQUFFO1FBQ0QsS0FBSyxFQUFFLFNBQVM7UUFDaEIsR0FBRyxFQUFFLHlDQUF5QztRQUM5QyxPQUFPLEVBQUU7WUFDTCxVQUFVLEVBQUU7Z0JBQ1IsS0FBSyxFQUFFLE1BQU07Z0JBQ2IsV0FBVyxFQUFFLGlCQUFpQjtnQkFDOUIsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsTUFBTSxFQUFFO29CQUNKLEVBQUUsRUFBRSxVQUFVO29CQUNkLFVBQVUsRUFBRTt3QkFDUixXQUFXLEVBQUUsWUFBWTtxQkFDNUI7aUJBQ0o7YUFDSjtZQUNELGNBQWMsRUFBRTtnQkFDWixLQUFLLEVBQUUsYUFBYTtnQkFDcEIsV0FBVyxFQUFFLG1CQUFtQjtnQkFDaEMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsTUFBTSxFQUFFO29CQUNKLEVBQUUsRUFBRSxVQUFVO29CQUNkLFVBQVUsRUFBRTt3QkFDUixXQUFXLEVBQUUsY0FBYztxQkFDOUI7aUJBQ0o7YUFDSjtZQUNELGFBQWEsRUFBRTtnQkFDWCxLQUFLLEVBQUUsUUFBUTtnQkFDZixXQUFXLEVBQUUsK0NBQStDO2dCQUM1RCxPQUFPLEVBQUUsRUFBRTtnQkFDWCxNQUFNLEVBQUU7b0JBQ0osRUFBRSxFQUFFLFVBQVU7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFdBQVcsRUFBRSxXQUFXO3FCQUMzQjtpQkFDSjthQUNKO1lBQ0QsV0FBVyxFQUFFO2dCQUNULEtBQUssRUFBRSxTQUFTO2dCQUNoQixXQUFXLEVBQUUsU0FBUztnQkFDdEIsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsTUFBTSxFQUFFO29CQUNKLEVBQUUsRUFBRSxhQUFhO2lCQUNwQjthQUNKO1NBQ0o7UUFDRCxhQUFhLEVBQUU7WUFDWCxRQUFRLEVBQUU7Z0JBQ04sT0FBTyxFQUFFLFFBQVEscUJBQVksdUJBQXVCO2dCQUNwRCxJQUFJLENBQUMsR0FBRyxFQUFFLFlBQVk7b0JBQ2xCLElBQUksR0FBRyxLQUFLLE9BQU8sRUFBRSxDQUFDO3dCQUNsQixPQUFPLElBQUksQ0FBQztvQkFDaEIsQ0FBQztvQkFDRCxPQUFPLEtBQUssQ0FBQztnQkFDakIsQ0FBQzthQUNKO1NBQ0o7S0FDSjtDQUNKLENBQUM7QUFFVyxRQUFBLGFBQWEsR0FBOEIsa0JBQWtCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCdWlsZFBsdWdpbiB9IGZyb20gJy4uL0B0eXBlcyc7XHJcbmltcG9ydCB7IFBBQ0tBR0VfTkFNRSB9IGZyb20gJy4vZ2xvYmFsJztcclxuXHJcbmV4cG9ydCBjb25zdCBsb2FkOiBCdWlsZFBsdWdpbi5sb2FkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgY29uc29sZS5kZWJ1ZyhgJHtQQUNLQUdFX05BTUV9IGxvYWRgKTtcclxufTtcclxuZXhwb3J0IGNvbnN0IHVubG9hZDogQnVpbGRQbHVnaW4ubG9hZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGNvbnNvbGUuZGVidWcoYCR7UEFDS0FHRV9OQU1FfSB1bmxvYWRgKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBjb25maWdzOiBCdWlsZFBsdWdpbi5Db25maWdzID0ge1xyXG4gICAgJyonOiB7XHJcbiAgICAgICAgaG9va3M6ICcuL2hvb2tzJyxcclxuICAgICAgICBkb2M6ICdlZGl0b3IvcHVibGlzaC9jdXN0b20tYnVpbGQtcGx1Z2luLmh0bWwnLFxyXG4gICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgaW5qZWN0Q29kZToge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6IGDms6jlhaXku6PnoIFgLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGDpnIDopoHlnKjmnoTlu7rlh7rnmoTmlofku7bkuK3ms6jlhaXnmoTku6PnoIFgLFxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogJycsXHJcbiAgICAgICAgICAgICAgICByZW5kZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICB1aTogJ3VpLWlucHV0JyxcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBg6K+35aGr5YWl6ZyA6KaB5rOo5YWl55qE5Luj56CBYCxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgaW5qZWN0RmlsZVBhdGg6IHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiBg6ZyA6KaB5rOo5YWl5Luj56CB55qE5paH5Lu26Lev5b6EYCxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBg6ZyA6KaB5rOo5YWl5Luj56CB55qE5paH5Lu26Lev5b6E77yI5p6E5bu65Ye655qE77yJYCxcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICcnLFxyXG4gICAgICAgICAgICAgICAgcmVuZGVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdWk6ICd1aS1pbnB1dCcsXHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogYOivt+Whq+WFpemcgOimgeazqOWFpeeahOaWh+S7tui3r+W+hGAsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHNlYXJjaFBhdHRlcm46IHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiBg5rOo5YWl5Luj56CB5L2N572uYCxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBg6ZyA6KaB5rOo5YWl5Luj56CB5L2N572u77yI5q2j5YiZ77yJLyhnbG9iYWxUaGlzXFxzKj1cXHMqXFwkZ2xvYmFsXFxzKjspL2AsXHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAnJyxcclxuICAgICAgICAgICAgICAgIHJlbmRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgIHVpOiAndWktaW5wdXQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGDor7floavlhaXms6jlhaXku6PnoIHkvY3nva5gLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBpbmplY3RBdFRvcDoge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6IGDmmK/lkKblnKjpobbpg6jms6jlhaVgLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGDmmK/lkKblnKjpobbpg6jms6jlhaVgLFxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICByZW5kZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICB1aTogJ3VpLWNoZWNrYm94JyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHZlcmlmeVJ1bGVNYXA6IHtcclxuICAgICAgICAgICAgcnVsZVRlc3Q6IHtcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBpMThuOiR7UEFDS0FHRV9OQU1FfS5vcHRpb25zLnJ1bGVUZXN0X21zZ2AsXHJcbiAgICAgICAgICAgICAgICBmdW5jKHZhbCwgYnVpbGRPcHRpb25zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbCA9PT0gJ2NvY29zJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgfSxcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBhc3NldEhhbmRsZXJzOiBCdWlsZFBsdWdpbi5Bc3NldEhhbmRsZXJzID0gJy4vYXNzZXQtaGFuZGxlcnMnO1xyXG4iXX0=