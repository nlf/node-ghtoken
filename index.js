#!/usr/bin/env node
var request = require('request'),
    prompt = require('prompt'),
    util = require('util'),
    req = {},
    cmd,
    usage = 'Usage:\n    ghtoken [cmd]\n    Where [cmd] is one of \'list\', \'add\', or \'revoke\'',
    pargs = [{ name: 'username', required: 'true' }, { name: 'password', hidden: true, required: true }];

function showUsage() {
    console.error(usage);
    process.exit(1);
}

if (process.argv.length < 3) showUsage();
cmd = process.argv[2].toLowerCase();
if (!~['list', 'add', 'revoke'].indexOf(cmd)) {
    console.error('Invalid command');
    showUsage();
}
if (cmd === 'revoke') {
    pargs.push({ name: 'token_id', required: true });
    req.method = 'DELETE';
    req.json = true;
} else if (cmd === 'list') {
    req.method = 'GET';
    req.json = true;
} else if (cmd === 'add') {
    pargs.push({ name: 'scopes', required: false, default: 'public_repo', before: function (val) { return val.replace(' ', ''); } });
    req.method = 'POST';
    req.json = { note: 'ghtoken generated', scopes: [] };
}

prompt.message = '';
prompt.delimiter = '';

prompt.get(pargs, function (err, result) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    req.uri = util.format('https://%s:%s@api.github.com/authorizations', result.username, result.password);
    if (cmd === 'add') req.json.scopes = result.scopes;
    if (cmd === 'revoke') req.uri += '/' + result.token_id;
    request(req, function (err, res, body) {
        if (err) {
            console.error('Uh oh! Something went wrong');
            console.error(err);
            process.exit(1);
        }
        if (cmd === 'revoke') {
            if (res.statusCode !== 204) {
                console.error('It looks like the token failed to revoke.. Here\'s what we got back');
                console.error(body);
                process.exit(1);
            }
            console.log('Your token was revoked');
            process.exit(0);
        }
        if (cmd === 'list') {
            if (res.statusCode !== 200) {
                console.log('It looks like we failed to get a list of tokens.. Here\'s what we got back');
                console.log(body);
                process.exit(1);
            }
            console.log(body);
            process.exit(0);
        }
        if (cmd === 'add') {
            if (res.statusCode !== 201) {
                console.log('It looks like we failed to create a token.. Here\'s what we got back');
                console.log(body);
                process.exit(1);
            }
            console.log('Here\'s your new token:', body.token);
            process.exit(0);
        }
    });
});
