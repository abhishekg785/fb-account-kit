const express = require('express');
const fs = require('fs');
const Guid = require('guid');
const bodyParser = require("body-parser");
const Mustache  = require('mustache');
const Request  = require('request');
const Querystring  = require('querystring');

const config = require('./config/config');

const app = express();
app.use(bodyParser.urlencoded({
    extended : false
}))
app.use(bodyParser.json());

var csrf_guid = Guid.raw();
const account_kit_api_version = config.ACCOUNT_KIT_API_VERSION;
const app_id = config.FACEBOOK_APP_ID;
const app_secret = config.ACCOUNT_KIT_APP_SECRET;
const me_endpoint_base_url = 'https://graph.accountkit.com/'+ account_kit_api_version +'/me';
const token_exchange_base_url = 'https://graph.accountkit.com/'+ account_kit_api_version +'/access_token';

function loadLogin() {
    return fs.readFileSync('views/login.html').toString();
}

function loadLoginSuccess() {
    return fs.readFileSync('views/success.html').toString();
}

app.get('/', function(req, res) {
    var viewData = {
        appId : app_id,
        csrf : csrf_guid,
        version : account_kit_api_version
    };
    var html = Mustache.to_html(loadLogin(), viewData);
    res.send(html);
});

app.post('/login_success', function(request, response){
    console.log('here');
    // CSRF check
    if (request.body.csrf === csrf_guid) {
        var app_access_token = ['AA', app_id, app_secret].join('|');
        var params = {
            grant_type: 'authorization_code',
            code: request.body.code,
            access_token: app_access_token
        };

        // exchange tokens
        var token_exchange_url = token_exchange_base_url + '?' + Querystring.stringify(params);
        Request.get({url: token_exchange_url, json: true}, function(err, resp, respBody) {
            var view = {
                user_access_token: respBody.access_token,
                expires_at: respBody.expires_at,
                user_id: respBody.id,
            };

            // get account details at /me endpoint
            var me_endpoint_url = me_endpoint_base_url + '?access_token=' + respBody.access_token;
            Request.get({url: me_endpoint_url, json:true }, function(err, resp, respBody) {
                // send login_success.html
                if (respBody.phone) {
                    view.phone_num = respBody.phone.number;
                } else if (respBody.email) {
                    view.email_addr = respBody.email.address;
                }
                var html = Mustache.to_html(loadLoginSuccess(), view);
                response.send(html);
            });
        });
    }
    else {
        // login failed
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end("Something went wrong. :( ");
    }
});

app.listen(3000, function() {
    console.log('listening on port 3000');
});