"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.load = load;
exports.unload = unload;
const child_process_1 = require("child_process");
const package_json_1 = __importDefault(require("../package.json"));
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
    openPanel() {
        Editor.Panel.open(package_json_1.default.name);
    },
    updateTool() {
        let autoPackDir = (0, path_1.join)(__dirname, '../auto_pack');
        let sp = (0, child_process_1.spawn)("npm", ['run', 'bc'], { shell: true, cwd: autoPackDir });
        sp.stdout.setEncoding('utf8');
        sp.stdout.on('data', (data) => {
            console.log(`stdout build&copy: ${data}`);
        });
        sp.stderr.on('data', (data) => {
            console.log(`stderr build&copy: ${data}`);
        });
        sp.on('exit', (code, data) => {
            if (code === 0) {
                console.log(`exit build&copy suscess ${data}`);
                autoPackDir = (0, path_1.join)(__dirname, '../');
                let sp2 = (0, child_process_1.spawn)("npm", ['run', 'build'], { shell: true, cwd: autoPackDir });
                sp2.stdout.setEncoding('utf8');
                sp2.stdout.on('data', (data) => {
                    console.log(`stdout build: ${data}`);
                });
                sp2.stderr.on('data', (data) => {
                    console.log(`stderr build: ${data}`);
                });
                sp2.on('exit', (code, data) => {
                    if (code === 0) {
                        console.log(`exit build suscess ${data}`);
                        Editor.Dialog.info('工具更新成功!', { title: '提示' });
                    }
                    else {
                        console.log(`exit build fail ${data}`);
                        Editor.Dialog.error('工具更新失败!', { title: '错误' });
                    }
                });
            }
            else {
                console.log(`exit build&copy fail ${data}`);
            }
        });
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQTJEQSxvQkFBMEI7QUFNMUIsd0JBQTRCO0FBakU1QixpREFBc0U7QUFDdEUsbUVBQTBDO0FBQzFDLCtCQUE0QjtBQUM1Qjs7O0dBR0c7QUFDVSxRQUFBLE9BQU8sR0FBNEM7SUFDNUQ7OztPQUdHO0lBQ0gsU0FBUztRQUNMLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHNCQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUNELFVBQVU7UUFDTixJQUFJLFdBQVcsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbEQsSUFBSSxFQUFFLEdBQW1DLElBQUEscUJBQUssRUFBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3hHLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlCLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQzFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLElBQUksRUFBRSxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFDLENBQUM7UUFDSCxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUMxQixPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzlDLENBQUMsQ0FBQyxDQUFBO1FBQ0YsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDekIsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDL0MsV0FBVyxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDckMsSUFBSSxHQUFHLEdBQW1DLElBQUEscUJBQUssRUFBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO2dCQUM1RyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDL0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7b0JBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQ3pDLENBQUMsQ0FBQyxDQUFDO2dCQUNILEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO29CQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QyxDQUFDLENBQUMsQ0FBQTtnQkFDRixHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRTtvQkFDMUIsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsSUFBSSxFQUFFLENBQUMsQ0FBQzt3QkFDMUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7b0JBQ25ELENBQUM7eUJBQ0ksQ0FBQzt3QkFDRixPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLEVBQUUsQ0FBQyxDQUFDO3dCQUN2QyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztvQkFDcEQsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztZQUNQLENBQUM7aUJBQ0ksQ0FBQztnQkFDRixPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSixDQUFDO0FBRUY7OztHQUdHO0FBQ0gsU0FBZ0IsSUFBSSxLQUFLLENBQUM7QUFFMUI7OztHQUdHO0FBQ0gsU0FBZ0IsTUFBTSxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXMsIHNwYXduIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgcGFja2FnZUpTT04gZnJvbSAnLi4vcGFja2FnZS5qc29uJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbi8qKlxuICogQGVuIFJlZ2lzdHJhdGlvbiBtZXRob2QgZm9yIHRoZSBtYWluIHByb2Nlc3Mgb2YgRXh0ZW5zaW9uXG4gKiBAemgg5Li65omp5bGV55qE5Li76L+b56iL55qE5rOo5YaM5pa55rOVXG4gKi9cbmV4cG9ydCBjb25zdCBtZXRob2RzOiB7IFtrZXk6IHN0cmluZ106ICguLi5hbnk6IGFueSkgPT4gYW55IH0gPSB7XG4gICAgLyoqXG4gICAgICogQGVuIEEgbWV0aG9kIHRoYXQgY2FuIGJlIHRyaWdnZXJlZCBieSBtZXNzYWdlXG4gICAgICogQHpoIOmAmui/hyBtZXNzYWdlIOinpuWPkeeahOaWueazlVxuICAgICAqL1xuICAgIG9wZW5QYW5lbCgpIHtcbiAgICAgICAgRWRpdG9yLlBhbmVsLm9wZW4ocGFja2FnZUpTT04ubmFtZSk7XG4gICAgfSxcbiAgICB1cGRhdGVUb29sKCkge1xuICAgICAgICBsZXQgYXV0b1BhY2tEaXIgPSBqb2luKF9fZGlybmFtZSwgJy4uL2F1dG9fcGFjaycpO1xuICAgICAgICBsZXQgc3A6IENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcyA9IHNwYXduKFwibnBtXCIsIFsncnVuJywgJ2JjJ10sIHsgc2hlbGw6IHRydWUsIGN3ZDogYXV0b1BhY2tEaXIgfSk7XG4gICAgICAgIHNwLnN0ZG91dC5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgICAgICBzcC5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYHN0ZG91dCBidWlsZCZjb3B5OiAke2RhdGF9YCk7XG4gICAgICAgIH0pO1xuICAgICAgICBzcC5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYHN0ZGVyciBidWlsZCZjb3B5OiAke2RhdGF9YCk7XG4gICAgICAgIH0pXG4gICAgICAgIHNwLm9uKCdleGl0JywgKGNvZGUsIGRhdGEpID0+IHtcbiAgICAgICAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGV4aXQgYnVpbGQmY29weSBzdXNjZXNzICR7ZGF0YX1gKTtcbiAgICAgICAgICAgICAgICBhdXRvUGFja0RpciA9IGpvaW4oX19kaXJuYW1lLCAnLi4vJyk7XG4gICAgICAgICAgICAgICAgbGV0IHNwMjogQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zID0gc3Bhd24oXCJucG1cIiwgWydydW4nLCAnYnVpbGQnXSwgeyBzaGVsbDogdHJ1ZSwgY3dkOiBhdXRvUGFja0RpciB9KTtcbiAgICAgICAgICAgICAgICBzcDIuc3Rkb3V0LnNldEVuY29kaW5nKCd1dGY4Jyk7XG4gICAgICAgICAgICAgICAgc3AyLnN0ZG91dC5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzdGRvdXQgYnVpbGQ6ICR7ZGF0YX1gKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzcDIuc3RkZXJyLm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHN0ZGVyciBidWlsZDogJHtkYXRhfWApO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgc3AyLm9uKCdleGl0JywgKGNvZGUsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBleGl0IGJ1aWxkIHN1c2Nlc3MgJHtkYXRhfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5pbmZvKCflt6Xlhbfmm7TmlrDmiJDlip8hJywgeyB0aXRsZTogJ+aPkOekuicgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgZXhpdCBidWlsZCBmYWlsICR7ZGF0YX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuZXJyb3IoJ+W3peWFt+abtOaWsOWksei0pSEnLCB7IHRpdGxlOiAn6ZSZ6K+vJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGV4aXQgYnVpbGQmY29weSBmYWlsICR7ZGF0YX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBAZW4gTWV0aG9kIFRyaWdnZXJlZCBvbiBFeHRlbnNpb24gU3RhcnR1cFxuICogQHpoIOaJqeWxleWQr+WKqOaXtuinpuWPkeeahOaWueazlVxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9hZCgpIHsgfVxuXG4vKipcbiAqIEBlbiBNZXRob2QgdHJpZ2dlcmVkIHdoZW4gdW5pbnN0YWxsaW5nIHRoZSBleHRlbnNpb25cbiAqIEB6aCDljbjovb3mianlsZXml7bop6blj5HnmoTmlrnms5VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVubG9hZCgpIHsgfVxuIl19