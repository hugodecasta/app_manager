var http = require('http');

const port = process.env.PORT ?? 3000

http.createServer(onRequest).listen(port);
console.log('app manager listening on', port)

const config = JSON.parse(require('fs').readFileSync('config_data.json'))

function parseCookies(request) {
    var list = {},
        rc = request.headers.cookie;
    rc && rc.split(';').forEach(function (cookie) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
    return list;
}

function onRequest(client_req, client_res) {

    let path = client_req.url
    let path_components = path.split('/').filter(e => e)

    let asker = '/' + path_components.shift()
    let cookie_asker = parseCookies(client_req).app_manager_asker;

    if (asker in config) cookie_asker = undefined

    if (cookie_asker !== undefined && cookie_asker != asker) {
        asker = cookie_asker
        path_components = path.split('/').filter(e => e)
    }

    if (asker in config) {

        let asked_path = '/' + path_components.join('/')
        console.log('[' + asker + ']', asked_path)

        var options = {
            ...config[asker],
            path: asked_path,
            method: client_req.method,
            headers: client_req.headers,
        };

        var proxy = http.request(options, function (res) {
            let headers = {
                ...res.headers,
                'Set-Cookie': 'app_manager_asker=' + asker
            }
            client_res.writeHead(res.statusCode, headers)
            res.pipe(client_res, {
                end: true
            });
        });

        client_req.pipe(proxy, {
            end: true
        });
    } else {
        console.log('unknown asker', asker)
    }
}