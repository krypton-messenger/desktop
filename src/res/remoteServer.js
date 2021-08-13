const http = require("http"),
    serveStatic = require("serve-static"),
    QRCode = require("qrcode"),
    ip = require("ip"),
    ws = require("ws");


class RemoteServer {
    constructor(msgIn) {
        this.sockets = [];
        this.serve = serveStatic("./src/res/app", {
            index: ["remote.html"]
        });
        this.webServer = http.createServer(((req, res) => {
            this.serve(req, res, this.showError.bind(this, req, res));
        }).bind(this))
        this.webSocket = new ws.Server({
            port: 8080
        });
        this.webSocket.on("connection", (s => {
            this.sockets.push(s);
            s.on("message", (data) => {
                let msg = JSON.parse(data);
                let event = {
                    reply: ((_, data) => {
                        this.msgOut(data);
                    }).bind(this)
                };
                console.log("remoteServermsg", msg);
                msgIn(event, {
                    command: msg.command,
                    data: msg.data
                });
            });
        }).bind(this));
    }
    msgOut(data) {
        for (let i of this.sockets) {
            try{
                i.send(JSON.stringify(data));
            }catch(e){

            }
        }
    }
    get url() {
        return `http://${ip.address()}`
    }
    showError(req, res) {
        res.end("ERROR");
    }
    start() {
        this.webServer.listen(80);
    }
    stop() {
        this.webServer.close();
        this.webSocket.close();
    }
    generateQR = async () => {
        let qr = await (() => {
            return new Promise((resolve, reject) => {
                QRCode.toString(this.url, {
                    errorCorrectionLevel: 'H',
                    type: 'svg',
                    margin: 1
                }, (err, str) => {
                    if (err) reject(err);
                    else resolve(str);
                })
            })
        })();
        let qrURI = (`data:image/svg+xml;base64,${Buffer.from(qr).toString("base64")}`);
        return qrURI;
    }
}

exports.RemoteServer = RemoteServer;