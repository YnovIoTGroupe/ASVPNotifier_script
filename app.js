/**
 * Created by Léon on 15/03/2017.
 */
'use strict'

//IotHub
var Protocol = require('azure-iot-device-amqp').Amqp;
var Client = require('azure-iot-device').Client;
var ConnectionString = require('azure-iot-device').ConnectionString;
var Message = require('azure-iot-device').Message;
//Azure PARAMS
var AzureConnectionString = '';
var client = Client.fromConnectionString(AzureConnectionString, Protocol);

const vision = require('node-cloud-vision-api');
let Twitter = require('twitter');

let client = new Twitter({
    consumer_key: 'nzNRla81th8jTM0S1VVtYfycA',
    consumer_secret: 'Pgusv1jzUdc10X9CsTxUR9MBK0NZMBit0VxN6sDZVSyCF1Agll',
    access_token_key: '841974725538643968-w5ALJrCt2X6HNiuz5ood1g8enKhBUDU',
    access_token_secret: '6VXWvgLYuMdOM4WhOcokAq6HBjH5dU11rhiKr0sAXJPoL'
});

// init with auth
vision.init({auth: 'AIzaSyCTqkGv7VnFO5P9LFSB6BudFcBkzUUgEKY'});

// construct parameters
const req = new vision.Request({
    image: new vision.Image('/Projets/IoT/ASVPNotifier/ASVP_à_Strasbourg_(cropped).jpg'),
    features: [
        new vision.Feature('FACE_DETECTION', 4),
        new vision.Feature('LABEL_DETECTION', 10),
    ]
});

// send single request
vision.annotate(req).then((res) => {
    let response = res.responses;

    var filter = response[0].labelAnnotations.filter(function (annotation) {
        return annotation.score > 0.7 && (["police", "police officer"].includes(annotation.description));
    });

    if(filter.length > 0){
        console.log(filter);
        let now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        client.post('statuses/update', {status: now+' : Attention, ASVP !'},  function(error, tweet, response) {
            if(error) console.error(error);
        });
    }

}, (e) => {
    console.log('Error: ', e)
});



//AZURE FUNC///////
client.open(function (err, result) {
    if (err) {
        printErrorFor('open')(err);
    } else {
        //console.log(result);
        //READING MESSAGES FROM MASTER
        client.on('message', function (msg) {
            console.log('receive data: ' + msg.getData());
            client.complete(msg, printResultFor('completed'));
        });
        client.on('event', function (msg) {
            console.log(msg);
        });
        //ERRORS
        client.on('error', function (err) {
            printErrorFor('client')(err);
            client.close();
        });
    }
});
// Helper function to print results for an operation
function printErrorFor(op) {
    return function printError(err) {
        if (err) console.log(op + ' error: ' + err.toString());
    };
}
// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}