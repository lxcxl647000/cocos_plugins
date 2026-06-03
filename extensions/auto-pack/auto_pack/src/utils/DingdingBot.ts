import request from 'request';

const ApplicationTypeHeader: string = "application/json;charset=utf-8";

export class DingdingBot {
    private readonly _webhookUrl: string;
    constructor(webhookUrl: string) {
        this._webhookUrl = webhookUrl;
    }

    public pushMsgMarkdown(msg: string, title: string, atMobiles?: Array<string>): boolean {
        try {
            let options: request.CoreOptions = {
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
            request.post(this._webhookUrl, options, function (error, response, body) {
                console.debug(`push msg ${msg}, response: ${JSON.stringify(body)}`);
            });
        }
        catch (err) {
            console.error(err);
            return false;
        }
        return true;
    }
    public pushMsgText(msg: string, atMobiles?: Array<string>): boolean {
        try {
            let options: request.CoreOptions = {
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
            request.post(this._webhookUrl, options, function (error, response, body) {
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