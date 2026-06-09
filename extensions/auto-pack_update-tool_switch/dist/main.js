"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.load = load;
exports.unload = unload;
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
exports.methods = {
    /**
     * @en A method that can be triggered by message
     * @zh 通过 message 触发的方法
     */
    updateToolSwitch() {
        let autoPackPackageJson = (0, path_1.join)(__dirname, '../../auto-pack/package.json');
        console.log(autoPackPackageJson);
        if ((0, fs_1.existsSync)(autoPackPackageJson)) {
            let content = (0, fs_1.readFileSync)(autoPackPackageJson, 'utf-8');
            let data = JSON.parse(content);
            // { path: 'auto-pack', label: '更新自动化工具', message: 'update-tool' }
            let menuData = data.contributions.menu;
            let isUpdateToolOn = false;
            for (let menu of menuData) {
                if (menu.message === 'update-tool') {
                    isUpdateToolOn = true;
                    break;
                }
            }
            if (isUpdateToolOn) {
                data.contributions.menu = data.contributions.menu.filter((menu) => menu.message !== 'update-tool');
            }
            else {
                menuData.push({ path: 'auto-pack', label: '更新自动化工具', message: 'update-tool' });
                data.contributions.menu = menuData;
            }
            console.log(data.contributions.menu);
            // content = JSON.stringify(data, null, '\t');
            content = JSON.stringify(data, null, 4);
            (0, fs_1.writeFileSync)(autoPackPackageJson, content, 'utf-8');
        }
        else {
            Editor.Dialog.warn('package.json文件不存在', { title: '提示' });
        }
    },
};
/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
function load() { }
/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
function unload() { }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQWdEQSxvQkFBMEI7QUFNMUIsd0JBQTRCO0FBdEQ1QiwyQkFBNkQ7QUFDN0QsK0JBQTRCO0FBRTVCOzs7R0FHRztBQUNVLFFBQUEsT0FBTyxHQUE0QztJQUM1RDs7O09BR0c7SUFDSCxnQkFBZ0I7UUFDWixJQUFJLG1CQUFtQixHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO1FBQzFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNqQyxJQUFJLElBQUEsZUFBVSxFQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUNsQyxJQUFJLE9BQU8sR0FBRyxJQUFBLGlCQUFZLEVBQUMsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDekQsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMvQixrRUFBa0U7WUFDbEUsSUFBSSxRQUFRLEdBQXVELElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDO1lBQzNGLElBQUksY0FBYyxHQUFHLEtBQUssQ0FBQztZQUMzQixLQUFLLElBQUksSUFBSSxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUN4QixJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssYUFBYSxFQUFFLENBQUM7b0JBQ2pDLGNBQWMsR0FBRyxJQUFJLENBQUM7b0JBQ3RCLE1BQU07Z0JBQ1YsQ0FBQztZQUNMLENBQUM7WUFDRCxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNqQixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFzRCxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxLQUFLLGFBQWEsQ0FBQyxDQUFDO1lBQ3pKLENBQUM7aUJBQU0sQ0FBQztnQkFDSixRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDO2dCQUMvRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7WUFDdkMsQ0FBQztZQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQyw4Q0FBOEM7WUFDOUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4QyxJQUFBLGtCQUFhLEVBQUMsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3pELENBQUM7YUFDSSxDQUFDO1lBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUM3RCxDQUFDO0lBQ0wsQ0FBQztDQUNKLENBQUM7QUFFRjs7O0dBR0c7QUFDSCxTQUFnQixJQUFJLEtBQUssQ0FBQztBQUUxQjs7O0dBR0c7QUFDSCxTQUFnQixNQUFNLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcInBhdGhcIjtcclxuXHJcbi8qKlxyXG4gKiBAZW4gUmVnaXN0cmF0aW9uIG1ldGhvZCBmb3IgdGhlIG1haW4gcHJvY2VzcyBvZiBFeHRlbnNpb25cclxuICogQHpoIOS4uuaJqeWxleeahOS4u+i/m+eoi+eahOazqOWGjOaWueazlVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFueTogYW55KSA9PiBhbnkgfSA9IHtcclxuICAgIC8qKlxyXG4gICAgICogQGVuIEEgbWV0aG9kIHRoYXQgY2FuIGJlIHRyaWdnZXJlZCBieSBtZXNzYWdlXHJcbiAgICAgKiBAemgg6YCa6L+HIG1lc3NhZ2Ug6Kem5Y+R55qE5pa55rOVXHJcbiAgICAgKi9cclxuICAgIHVwZGF0ZVRvb2xTd2l0Y2goKSB7XHJcbiAgICAgICAgbGV0IGF1dG9QYWNrUGFja2FnZUpzb24gPSBqb2luKF9fZGlybmFtZSwgJy4uLy4uL2F1dG8tcGFjay9wYWNrYWdlLmpzb24nKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhhdXRvUGFja1BhY2thZ2VKc29uKTtcclxuICAgICAgICBpZiAoZXhpc3RzU3luYyhhdXRvUGFja1BhY2thZ2VKc29uKSkge1xyXG4gICAgICAgICAgICBsZXQgY29udGVudCA9IHJlYWRGaWxlU3luYyhhdXRvUGFja1BhY2thZ2VKc29uLCAndXRmLTgnKTtcclxuICAgICAgICAgICAgbGV0IGRhdGEgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xyXG4gICAgICAgICAgICAvLyB7IHBhdGg6ICdhdXRvLXBhY2snLCBsYWJlbDogJ+abtOaWsOiHquWKqOWMluW3peWFtycsIG1lc3NhZ2U6ICd1cGRhdGUtdG9vbCcgfVxyXG4gICAgICAgICAgICBsZXQgbWVudURhdGE6IHsgcGF0aDogc3RyaW5nLCBsYWJlbDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcgfVtdID0gZGF0YS5jb250cmlidXRpb25zLm1lbnU7XHJcbiAgICAgICAgICAgIGxldCBpc1VwZGF0ZVRvb2xPbiA9IGZhbHNlO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBtZW51IG9mIG1lbnVEYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobWVudS5tZXNzYWdlID09PSAndXBkYXRlLXRvb2wnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXNVcGRhdGVUb29sT24gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChpc1VwZGF0ZVRvb2xPbikge1xyXG4gICAgICAgICAgICAgICAgZGF0YS5jb250cmlidXRpb25zLm1lbnUgPSBkYXRhLmNvbnRyaWJ1dGlvbnMubWVudS5maWx0ZXIoKG1lbnU6IHsgcGF0aDogc3RyaW5nLCBsYWJlbDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcgfSkgPT4gbWVudS5tZXNzYWdlICE9PSAndXBkYXRlLXRvb2wnKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIG1lbnVEYXRhLnB1c2goeyBwYXRoOiAnYXV0by1wYWNrJywgbGFiZWw6ICfmm7TmlrDoh6rliqjljJblt6XlhbcnLCBtZXNzYWdlOiAndXBkYXRlLXRvb2wnIH0pO1xyXG4gICAgICAgICAgICAgICAgZGF0YS5jb250cmlidXRpb25zLm1lbnUgPSBtZW51RGF0YTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhLmNvbnRyaWJ1dGlvbnMubWVudSk7XHJcbiAgICAgICAgICAgIC8vIGNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAnXFx0Jyk7XHJcbiAgICAgICAgICAgIGNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCA0KTtcclxuICAgICAgICAgICAgd3JpdGVGaWxlU3luYyhhdXRvUGFja1BhY2thZ2VKc29uLCBjb250ZW50LCAndXRmLTgnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIEVkaXRvci5EaWFsb2cud2FybigncGFja2FnZS5qc29u5paH5Lu25LiN5a2Y5ZyoJywgeyB0aXRsZTogJ+aPkOekuicgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAZW4gTWV0aG9kIFRyaWdnZXJlZCBvbiBFeHRlbnNpb24gU3RhcnR1cFxyXG4gKiBAemgg5omp5bGV5ZCv5Yqo5pe26Kem5Y+R55qE5pa55rOVXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbG9hZCgpIHsgfVxyXG5cclxuLyoqXHJcbiAqIEBlbiBNZXRob2QgdHJpZ2dlcmVkIHdoZW4gdW5pbnN0YWxsaW5nIHRoZSBleHRlbnNpb25cclxuICogQHpoIOWNuOi9veaJqeWxleaXtuinpuWPkeeahOaWueazlVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHVubG9hZCgpIHsgfVxyXG4iXX0=