const fs = require('fs');
const https = require('https');
const express = require('express')
const bodyParser = require('body-parser');
const crypto = require('crypto');
const request = require('superagent');
const path = require('path');
const session = require('express-session');

const app = express();

const port = 443;
var certificate = fs.readFileSync('/etc/ssl/certs/cert156241.pem', 'utf8');
var privateKey  = fs.readFileSync('/etc/ssl/certs/cert156241.key', 'utf8');

app.use(bodyParser.text());
app.use(session({resave: true, saveUninitialized: true, secret: 'ctBdKgEqM5SVG9LvZcnXRtJk', cookie: { maxAge: 3600000 }}));

app.get('/player', function(req, res){
    sessionData = req.session || {};
    sessionData.websiteUser = true;
    res.sendFile(path.join(__dirname,'index.html'));
});

app.get('/keys', function(req, res){
    sessionData = req.session;
    console.log("session: ", sessionData);
    if (!sessionData.websiteUser){
        res.send('nosession');
        return;
    }
    console.log("keys: ", req.query);
    let keyName = req.query.key;
    if (keyName){
        request
           .get('http://127.0.0.1:8081/keys/' + keyName)
           .responseType('blob')
           .then(upstreamRes => {
              res.send(upstreamRes.body);
           })
           .catch(err => {
              console.log("error getting key: ", err);
              res.send("err" + err.status);
           });
    }
});

var credentials = {key: privateKey, cert: certificate};
var httpsServer = https.createServer(credentials, app);
httpsServer.listen(port);