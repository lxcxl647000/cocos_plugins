import request from 'request';

const ApplicationTypeHeader: string = "application/x-www-form-urlencoded";

export class LogReport {
    private readonly _webUrl: string;
    constructor(_webUrl: string) {
        this._webUrl = _webUrl;
    }
    public postLog(data: { name: string, version?: string, pkg_name?: string, release_channel?: string, buy_channel?: string, build_time: string, project_team: string, source_path?: string }): boolean {
        console.log(data);
        try {
            let postdata = LogReport._EncodeFormData(data);
            let options: request.CoreOptions = {
                headers: {
                    "Content-Type": ApplicationTypeHeader
                },
                body: postdata
            };
            request.post(this._webUrl, options, function (error, response, body) {
                if (response.statusCode == 200) {
                    let boydobj = JSON.parse(body);
                    if (boydobj.c == 0) {
                        console.log("post log success", boydobj.c);
                    } else {
                        console.error("post log error", boydobj.c);
                    }
                }
                else {
                    console.log("post log error ", response.statusCode, response.statusMessage);
                }
            });
        }
        catch (err) {
            console.error(err);
            return false;
        }
        return true;
    }

    static _EncodeFormData(data: any) {
        var pairs = [];
        var regexp = /%20/g;

        for (var name in data) {
            var value = data[name];
            var pair =
                encodeURIComponent(name).replace(regexp, "+")
                + "=" +
                encodeURIComponent(value).replace(regexp, "+");
            pairs.push(pair);
        }
        return pairs.join("&");
    }
}