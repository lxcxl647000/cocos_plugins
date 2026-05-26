import request from 'request';

const ApplicationTypeHeader: string = "application/json;charset=utf-8";

export class FeiShuBot {
    private readonly _webhookUrl: string;
    constructor(webhookUrl: string) {
        this._webhookUrl = webhookUrl;
    }

    public pushMsgMarkdown(msg: string, title: string, directTo?: string|null, atMobiles?: Array<string>): boolean {
        try {
            let jsonMsg = {
                "msg_type": "interactive",
                "card": {
                    "schema": "2.0",
                    "config": {
                        "update_multi": true,
                        "style": {
                            "text_size": {
                                "normal_v2": {
                                    "default": "normal",
                                    "pc": "normal",
                                    "mobile": "heading"
                                }
                            }
                        }
                    },
                    "body": {
                        "direction": "vertical",
                        "padding": "12px 12px 12px 12px",
                        "elements": [
                            {
                                "tag": "markdown",
                                "content": msg,
                                "text_align": "left",
                                "text_size": "normal_v2",
                                "margin": "0px 0px 0px 0px"
                            }
                        ]
                    },
                    "header": {
                        "title": {
                            "tag": "plain_text",
                            "content": title
                        },
                        "subtitle": {
                            "tag": "plain_text",
                            "content": ""
                        },
                        "template": "blue",
                        "padding": "12px 12px 12px 12px"
                    }
                }
            }
            if (directTo) {
                jsonMsg.card.body.elements.push({
                    "tag": "button",
                    //@ts-ignore
                    "text": {
                        "tag": "plain_text",
                        "content": "🌞点击跳转"
                    },
                    "type": "default",
                    "width": "default",
                    "size": "medium",
                    "behaviors": [
                        {
                            "type": "open_url",
                            "default_url": directTo,
                            "pc_url": "",
                            "ios_url": "",
                            "android_url": ""
                        }
                    ],
                    "margin": "0px 0px 0px 0px"
                })
            }
            let options: request.CoreOptions = {
                headers: {
                    "Content-Type": ApplicationTypeHeader
                },
                json: jsonMsg
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