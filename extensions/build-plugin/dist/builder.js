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
                description: `需要注入代码位置（正则）`,
                default: '',
                render: {
                    ui: 'ui-input',
                    attributes: {
                        placeholder: `请填入注入代码位置`,
                    },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9idWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHFDQUF3QztBQUVqQyxNQUFNLElBQUksR0FBcUI7SUFDbEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLHFCQUFZLE9BQU8sQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQztBQUZXLFFBQUEsSUFBSSxRQUVmO0FBQ0ssTUFBTSxNQUFNLEdBQXFCO0lBQ3BDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxxQkFBWSxTQUFTLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUM7QUFGVyxRQUFBLE1BQU0sVUFFakI7QUFFVyxRQUFBLE9BQU8sR0FBd0I7SUFDeEMsR0FBRyxFQUFFO1FBQ0QsS0FBSyxFQUFFLFNBQVM7UUFDaEIsR0FBRyxFQUFFLHlDQUF5QztRQUM5QyxPQUFPLEVBQUU7WUFDTCxVQUFVLEVBQUU7Z0JBQ1IsS0FBSyxFQUFFLE1BQU07Z0JBQ2IsV0FBVyxFQUFFLGlCQUFpQjtnQkFDOUIsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsTUFBTSxFQUFFO29CQUNKLEVBQUUsRUFBRSxVQUFVO29CQUNkLFVBQVUsRUFBRTt3QkFDUixXQUFXLEVBQUUsWUFBWTtxQkFDNUI7aUJBQ0o7YUFDSjtZQUNELGNBQWMsRUFBRTtnQkFDWixLQUFLLEVBQUUsYUFBYTtnQkFDcEIsV0FBVyxFQUFFLG1CQUFtQjtnQkFDaEMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsTUFBTSxFQUFFO29CQUNKLEVBQUUsRUFBRSxVQUFVO29CQUNkLFVBQVUsRUFBRTt3QkFDUixXQUFXLEVBQUUsY0FBYztxQkFDOUI7aUJBQ0o7YUFDSjtZQUNELGFBQWEsRUFBRTtnQkFDWCxLQUFLLEVBQUUsUUFBUTtnQkFDZixXQUFXLEVBQUUsY0FBYztnQkFDM0IsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsTUFBTSxFQUFFO29CQUNKLEVBQUUsRUFBRSxVQUFVO29CQUNkLFVBQVUsRUFBRTt3QkFDUixXQUFXLEVBQUUsV0FBVztxQkFDM0I7aUJBQ0o7YUFDSjtTQUNKO1FBQ0QsYUFBYSxFQUFFO1lBQ1gsUUFBUSxFQUFFO2dCQUNOLE9BQU8sRUFBRSxRQUFRLHFCQUFZLHVCQUF1QjtnQkFDcEQsSUFBSSxDQUFDLEdBQUcsRUFBRSxZQUFZO29CQUNsQixJQUFJLEdBQUcsS0FBSyxPQUFPLEVBQUUsQ0FBQzt3QkFDbEIsT0FBTyxJQUFJLENBQUM7b0JBQ2hCLENBQUM7b0JBQ0QsT0FBTyxLQUFLLENBQUM7Z0JBQ2pCLENBQUM7YUFDSjtTQUNKO0tBQ0o7Q0FDSixDQUFDO0FBRVcsUUFBQSxhQUFhLEdBQThCLGtCQUFrQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQnVpbGRQbHVnaW4gfSBmcm9tICcuLi9AdHlwZXMnO1xyXG5pbXBvcnQgeyBQQUNLQUdFX05BTUUgfSBmcm9tICcuL2dsb2JhbCc7XHJcblxyXG5leHBvcnQgY29uc3QgbG9hZDogQnVpbGRQbHVnaW4ubG9hZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGNvbnNvbGUuZGVidWcoYCR7UEFDS0FHRV9OQU1FfSBsb2FkYCk7XHJcbn07XHJcbmV4cG9ydCBjb25zdCB1bmxvYWQ6IEJ1aWxkUGx1Z2luLmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBjb25zb2xlLmRlYnVnKGAke1BBQ0tBR0VfTkFNRX0gdW5sb2FkYCk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgY29uZmlnczogQnVpbGRQbHVnaW4uQ29uZmlncyA9IHtcclxuICAgICcqJzoge1xyXG4gICAgICAgIGhvb2tzOiAnLi9ob29rcycsXHJcbiAgICAgICAgZG9jOiAnZWRpdG9yL3B1Ymxpc2gvY3VzdG9tLWJ1aWxkLXBsdWdpbi5odG1sJyxcclxuICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgIGluamVjdENvZGU6IHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiBg5rOo5YWl5Luj56CBYCxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBg6ZyA6KaB5Zyo5p6E5bu65Ye655qE5paH5Lu25Lit5rOo5YWl55qE5Luj56CBYCxcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICcnLFxyXG4gICAgICAgICAgICAgICAgcmVuZGVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdWk6ICd1aS1pbnB1dCcsXHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogYOivt+Whq+WFpemcgOimgeazqOWFpeeahOS7o+eggWAsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGluamVjdEZpbGVQYXRoOiB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogYOmcgOimgeazqOWFpeS7o+eggeeahOaWh+S7tui3r+W+hGAsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogYOmcgOimgeazqOWFpeS7o+eggeeahOaWh+S7tui3r+W+hO+8iOaehOW7uuWHuueahO+8iWAsXHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAnJyxcclxuICAgICAgICAgICAgICAgIHJlbmRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgIHVpOiAndWktaW5wdXQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGDor7floavlhaXpnIDopoHms6jlhaXnmoTmlofku7bot6/lvoRgLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZWFyY2hQYXR0ZXJuOiB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogYOazqOWFpeS7o+eggeS9jee9rmAsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogYOmcgOimgeazqOWFpeS7o+eggeS9jee9ru+8iOato+WIme+8iWAsXHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAnJyxcclxuICAgICAgICAgICAgICAgIHJlbmRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgIHVpOiAndWktaW5wdXQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGDor7floavlhaXms6jlhaXku6PnoIHkvY3nva5gLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB2ZXJpZnlSdWxlTWFwOiB7XHJcbiAgICAgICAgICAgIHJ1bGVUZXN0OiB7XHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgaTE4bjoke1BBQ0tBR0VfTkFNRX0ub3B0aW9ucy5ydWxlVGVzdF9tc2dgLFxyXG4gICAgICAgICAgICAgICAgZnVuYyh2YWwsIGJ1aWxkT3B0aW9ucykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWwgPT09ICdjb2NvcycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgIH0sXHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgYXNzZXRIYW5kbGVyczogQnVpbGRQbHVnaW4uQXNzZXRIYW5kbGVycyA9ICcuL2Fzc2V0LWhhbmRsZXJzJztcclxuIl19