
const Request = require('./request');

void async function () {
    let request = new Request({
        method: 'GET',
        host: '127.0.0.1',
        port: '8088',
        path: '/',
        headers: {
            ['X-Foo2']: 'customed'
        },
        body: {
            name: 'chiming'
        }
    });

    let response = await request.send();
    console.log(response);
}();