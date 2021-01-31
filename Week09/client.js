
const Request = require('./request');
const parser = require('./parser');


void async function() {
    let request = new Request({
        method: 'GET',
        host: '127.0.0.1',
        port: '8080',
        path: '/',
        headers: {
            ['X-Foo2']: 'customed'
        },
        body: {
            name: 'chiming'
        }
    });

    let response = await request.send();
    parser.parseHTML(response.body);
    console.log(response);
}();