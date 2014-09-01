var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
var url = require('url');
var nodemailer = require('nodemailer');

var smtp = require('../OathKeeper/public/smtp');
var watch = require('./watch');

var transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port
});

var mailOptions = {
    from: 'Music FE Monitor <noreply@wandoujia.com>',
    subject: 'Music Sources Report'
};

var check = function () {
    console.log('Checking...');

    async.mapSeries(watch.sources, function (source, callback) {
        var parser = url.parse(source.request.url);
        var regex = new RegExp(source.regex);

        request(source.request, function (error, response, body) {
            if (error || response.statusCode !== 200) {
                return;
            }

            var $ = cheerio.load(body);
            var targetDOM = $(source.selector);
            var html = $.html(targetDOM);

            var result = regex.test(html);

            if (result) {
                console.log('✔ %s', parser.hostname);
            } else {
                console.log('✖ %s', parser.hostname);
            }

            setTimeout(function () {
                callback(null, {
                    source: parser.hostname,
                    status: result
                });
            }, 200);
        });
    }, function (err, result) {
        var failSources = [];

        result.forEach(function (source) {
            if (!source.status) {
                failSources.push(source.source);
            }
        });

        if (failSources.length === 0) {
            console.log('All going well.');
            console.log();
            return;
        }

        console.log('Oh no!');

        mailOptions.to = watch.emails.join(',');
        mailOptions.text = 'Something wrong! These sources can\'t get correct elements:\n\n' + failSources.join('\n');

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log('Message sent fail: ' + error);
            } else {
                console.log('Error message sent!');
            }

            console.log();
        });
    });
};

setInterval(check, 600000);
check();
