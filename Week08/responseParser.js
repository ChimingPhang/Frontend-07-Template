class ResponseParser {
    /**
    HTTP/1.1 200 OK
    Content-Type: text/html
    Date: Mon, 23 Dec 2019 06:27:12 GMT
    Connection: keep-alive
    Transfer-Encoding: chunked

    26  16进制
    <html><body>Hello World</body></html>
    0
    */
    constructor() {
        this.waitingStatus = {
            WAITING_STATUS_LINE: 0,
            WAITING_STATUS_LINE_END: 1,
            WAITING_HEADER_NAME: 2,
            WAITING_HEADER_SPACE: 3,
            WAITING_HEADER_VALUE: 4,
            WAITING_HEADER_LINE_END: 5,
            WAITING_HEADER_BLOCK_END: 6,
            WAITING_BODY: 7
        };

        this.currentStatus = this.waitingStatus.WAITING_STATUS_LINE;
        this.statusLine = '';
        this.headers = {};
        this.headerName = '';
        this.headerValue = '';
        this.isFinished = false;
        this.bodyParser = null;
    }

    receive(text) {
        for (let str of text) {
            this.receiveChar(str);
        }
    }

    receiveChar(char) {
        if (this.currentStatus === this.waitingStatus.WAITING_STATUS_LINE) {
            if (char === '\r') {
                this.currentStatus = this.waitingStatus.WAITING_STATUS_LINE_END;
            } else {
                this.statusLine += char;
            }
        } else if (this.currentStatus === this.waitingStatus.WAITING_STATUS_LINE_END) {
            if (char === '\n') {
                this.currentStatus = this.waitingStatus.WAITING_HEADER_NAME;
            }
        } else if (this.currentStatus === this.waitingStatus.WAITING_HEADER_NAME) {
            if (char === ':') {
                this.currentStatus = this.waitingStatus.WAITING_HEADER_SPACE;
            } else if (char === '\r') {
                this.currentStatus = this.waitingStatus.WAITING_HEADER_BLOCK_END;
            } else {
                this.headerName += char;
            }
        } else if (this.currentStatus === this.waitingStatus.WAITING_HEADER_SPACE) {
            if (char === ' ') {
                this.currentStatus = this.waitingStatus.WAITING_HEADER_VALUE;
            }
        } else if (this.currentStatus === this.waitingStatus.WAITING_HEADER_VALUE) {
            if (char === '\r') {
                this.currentStatus = this.waitingStatus.WAITING_HEADER_LINE_END;
                this.headers[this.headerName] = this.headerValue;
                this.headerName = '';
                this.headerValue = '';
            } else {
                this.headerValue += char;
            }
        } else if (this.currentStatus === this.waitingStatus.WAITING_HEADER_LINE_END) {
            if (char === '\n') {
                this.currentStatus = this.waitingStatus.WAITING_HEADER_NAME;
            }
        } else if (this.currentStatus === this.waitingStatus.WAITING_HEADER_BLOCK_END) {
            if (char === '\n') {
                this.currentStatus = this.waitingStatus.WAITING_BODY;
            }
        } else if (this.currentStatus === this.waitingStatus.WAITING_BODY) {
            console.log(char);
        }
    }
}

module.exports = ResponseParser;