const net = require('net');
const ResponseParser = require('./responseParser');

class Request {
    /**
    POST / HTTP/1.1    Request Line
    Host: 127.0.0.1
    Content-Type: application/x-wwww-form-urlencoded        headers

    fileId=aaa&code=333      body: Content-type决定
    */
    constructor(options) {
        this.method = options.method || 'GET';
        this.host = options.host || 'localhost';
        this.port = options.port || '8088';
        this.path = options.path || '/';
        this.headers = options.headers || {};
        this.body = options.body || {};

        if (!this.headers['Content-Type']) {
            this.headers['Content-Type'] = 'application/x-www-urlencoded';
        }

        if (this.headers['Content-Type'] === 'application/json') {
            this.bodyText = JSON.stringify(this.body);
        } else if (this.headers['Content-Type'] === 'application/x-www-urlencoded') {
            this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('&');
        }

        this.headers['Content-Length'] = this.bodyText.length;
    }

    /**
     * 发送真实请求到服务器
     */
    send(connection) {
        return new Promise((resolve, reject) => {
            // parser 逐步去接受response的消息, 来构造 response对象
            const parser = new ResponseParser();

            if (connection) {
                connection.write(this.toString());
            } else {
                connection = net.createConnection({
                    host: this.host,
                    port: this.port
                }, () => {
                    connection.write(this.toString());
                });
            }

            connection.on('data', (data) => {
                parser.receive(data.toString());
                if (parser.isFinished) {
                    resolve(parser.response);
                    connection.end();
                }
            });

            connection.on('error', (err) => {
                reject(err);
                connection.end();
            });
        });
    }

    toString() {
        return `${this.method} ${this.path} HTTP/1.1\r
        ${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r\r
        ${this.bodyText}`;
    }
}

module.exports = Request;