"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DingdingBot = void 0;
const request_1 = __importDefault(require("request"));
const ApplicationTypeHeader = "application/json;charset=utf-8";
class DingdingBot {
    constructor(webhookUrl) {
        this._webhookUrl = webhookUrl;
    }
    pushMsgMarkdown(msg, title, atMobiles) {
        try {
            let options = {
                headers: {
                    "Content-Type": ApplicationTypeHeader
                },
                json: {
                    "msgtype": 'markdown',
                    "markdown": {
                        "title": title,
                        "text": msg
                    },
                    "at": {
                        "atMobiles": atMobiles == null ? [] : atMobiles,
                        "isAtAll": false
                    }
                }
            };
            request_1.default.post(this._webhookUrl, options, function (error, response, body) {
                console.debug(`push msg ${msg}, response: ${JSON.stringify(body)}`);
            });
        }
        catch (err) {
            console.error(err);
            return false;
        }
        return true;
    }
    pushMsgText(msg, atMobiles) {
        try {
            let options = {
                headers: {
                    "Content-Type": ApplicationTypeHeader
                },
                json: {
                    "msgtype": 'text',
                    "text": {
                        "content": msg
                    },
                    "at": {
                        "atMobiles": atMobiles == null ? [] : atMobiles,
                        "isAtAll": false
                    }
                }
            };
            request_1.default.post(this._webhookUrl, options, function (error, response, body) {
                console.debug(`push msg ${msg}, response: ${JSON.stringify(body)}`);
            });
        }
        catch (err) {
            console.error(err);
            return false;
        }
        return true;
    }
}
exports.DingdingBot = DingdingBot;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGluZ2RpbmdCb3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvRGluZ2RpbmdCb3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsc0RBQThCO0FBRTlCLE1BQU0scUJBQXFCLEdBQVcsZ0NBQWdDLENBQUM7QUFFdkUsTUFBYSxXQUFXO0lBRXBCLFlBQVksVUFBa0I7UUFDMUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUM7SUFDbEMsQ0FBQztJQUVNLGVBQWUsQ0FBQyxHQUFXLEVBQUUsS0FBYSxFQUFFLFNBQXlCO1FBQ3hFLElBQUksQ0FBQztZQUNELElBQUksT0FBTyxHQUF3QjtnQkFDL0IsT0FBTyxFQUFFO29CQUNMLGNBQWMsRUFBRSxxQkFBcUI7aUJBQ3hDO2dCQUNELElBQUksRUFBRTtvQkFDRixTQUFTLEVBQUUsVUFBVTtvQkFDckIsVUFBVSxFQUFFO3dCQUNSLE9BQU8sRUFBRSxLQUFLO3dCQUNkLE1BQU0sRUFBRSxHQUFHO3FCQUNkO29CQUNELElBQUksRUFBRTt3QkFDRixXQUFXLEVBQUUsU0FBUyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTO3dCQUMvQyxTQUFTLEVBQUUsS0FBSztxQkFDbkI7aUJBQ0o7YUFDSixDQUFDO1lBQ0YsaUJBQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsVUFBVSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUk7Z0JBQ25FLE9BQU8sQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLGVBQWUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDeEUsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO1FBQ0QsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNULE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkIsT0FBTyxLQUFLLENBQUM7UUFDakIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFDTSxXQUFXLENBQUMsR0FBVyxFQUFFLFNBQXlCO1FBQ3JELElBQUksQ0FBQztZQUNELElBQUksT0FBTyxHQUF3QjtnQkFDL0IsT0FBTyxFQUFFO29CQUNMLGNBQWMsRUFBRSxxQkFBcUI7aUJBQ3hDO2dCQUNELElBQUksRUFBRTtvQkFDRixTQUFTLEVBQUUsTUFBTTtvQkFDakIsTUFBTSxFQUFFO3dCQUNKLFNBQVMsRUFBRSxHQUFHO3FCQUNqQjtvQkFDRCxJQUFJLEVBQUU7d0JBQ0YsV0FBVyxFQUFFLFNBQVMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUzt3QkFDL0MsU0FBUyxFQUFFLEtBQUs7cUJBQ25CO2lCQUNKO2FBQ0osQ0FBQztZQUNGLGlCQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLFVBQVUsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJO2dCQUNuRSxPQUFPLENBQUMsS0FBSyxDQUFDLFlBQVksR0FBRyxlQUFlLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3hFLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztRQUNELE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDVCxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLE9BQU8sS0FBSyxDQUFDO1FBQ2pCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0NBQ0o7QUE3REQsa0NBNkRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5cbmNvbnN0IEFwcGxpY2F0aW9uVHlwZUhlYWRlcjogc3RyaW5nID0gXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLThcIjtcblxuZXhwb3J0IGNsYXNzIERpbmdkaW5nQm90IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF93ZWJob29rVXJsOiBzdHJpbmc7XG4gICAgY29uc3RydWN0b3Iod2ViaG9va1VybDogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMuX3dlYmhvb2tVcmwgPSB3ZWJob29rVXJsO1xuICAgIH1cblxuICAgIHB1YmxpYyBwdXNoTXNnTWFya2Rvd24obXNnOiBzdHJpbmcsIHRpdGxlOiBzdHJpbmcsIGF0TW9iaWxlcz86IEFycmF5PHN0cmluZz4pOiBib29sZWFuIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxldCBvcHRpb25zOiByZXF1ZXN0LkNvcmVPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogQXBwbGljYXRpb25UeXBlSGVhZGVyXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBqc29uOiB7XG4gICAgICAgICAgICAgICAgICAgIFwibXNndHlwZVwiOiAnbWFya2Rvd24nLFxuICAgICAgICAgICAgICAgICAgICBcIm1hcmtkb3duXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidGl0bGVcIjogdGl0bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInRleHRcIjogbXNnXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIFwiYXRcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJhdE1vYmlsZXNcIjogYXRNb2JpbGVzID09IG51bGwgPyBbXSA6IGF0TW9iaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiaXNBdEFsbFwiOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJlcXVlc3QucG9zdCh0aGlzLl93ZWJob29rVXJsLCBvcHRpb25zLCBmdW5jdGlvbiAoZXJyb3IsIHJlc3BvbnNlLCBib2R5KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZyhgcHVzaCBtc2cgJHttc2d9LCByZXNwb25zZTogJHtKU09OLnN0cmluZ2lmeShib2R5KX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcHVibGljIHB1c2hNc2dUZXh0KG1zZzogc3RyaW5nLCBhdE1vYmlsZXM/OiBBcnJheTxzdHJpbmc+KTogYm9vbGVhbiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgb3B0aW9uczogcmVxdWVzdC5Db3JlT3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IEFwcGxpY2F0aW9uVHlwZUhlYWRlclxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAganNvbjoge1xuICAgICAgICAgICAgICAgICAgICBcIm1zZ3R5cGVcIjogJ3RleHQnLFxuICAgICAgICAgICAgICAgICAgICBcInRleHRcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJjb250ZW50XCI6IG1zZ1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcImF0XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYXRNb2JpbGVzXCI6IGF0TW9iaWxlcyA9PSBudWxsID8gW10gOiBhdE1vYmlsZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImlzQXRBbGxcIjogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXF1ZXN0LnBvc3QodGhpcy5fd2ViaG9va1VybCwgb3B0aW9ucywgZnVuY3Rpb24gKGVycm9yLCByZXNwb25zZSwgYm9keSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoYHB1c2ggbXNnICR7bXNnfSwgcmVzcG9uc2U6ICR7SlNPTi5zdHJpbmdpZnkoYm9keSl9YCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufSJdfQ==