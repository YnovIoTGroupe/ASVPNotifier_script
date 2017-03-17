/**
 * Created by Léon on 15/03/2017.
 */
'use strict'

const vision = require('node-cloud-vision-api');
let Twitter = require('twitter');
const fs = require('fs');
const Forecast = require('forecast');
const Protocol = require('azure-iot-device-amqp').Amqp;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const AzureStorage = require('azure-storage');
const Moment = require('moment');

const IMAGE_PATH = '/home/pi/viewcam.jpg';
const CONNECTION_STRING = 'HostName=ASVPNotifier.azure-devices.net;DeviceId=ASVPNotifierMessage;SharedAccessKey=ZyR6I+6mmEnFc/r45zsH5xtdCAm2EuIqmBcPdlNya3g=';
const LAST_NOTIFICATION_FILE = './LAST_NOTIFICATION';
const NOTIFICATION_INTERVAL = 2 * 60 * 60 * 1000; //Interval of 2 hours

fs.readFile(LAST_NOTIFICATION_FILE, "UTF-8", function (err, lastNotification) {
    if(!err && Date.now() - lastNotification < NOTIFICATION_INTERVAL){ // File not exist or more than NOTIFICATION_INTERVAL
        process.exit();
    }
});

let client = new Twitter({
    consumer_key: 'nzNRla81th8jTM0S1VVtYfycA',
    consumer_secret: 'Pgusv1jzUdc10X9CsTxUR9MBK0NZMBit0VxN6sDZVSyCF1Agll',
    access_token_key: '841974725538643968-w5ALJrCt2X6HNiuz5ood1g8enKhBUDU',
    access_token_secret: '6VXWvgLYuMdOM4WhOcokAq6HBjH5dU11rhiKr0sAXJPoL'
});

let forecast = new Forecast({
    service: 'darksky',
    key: 'b477be6c50e0955ae227e06e03e9105f',
    units: 'celcius'
});

// init with auth
vision.init({auth: 'AIzaSyCTqkGv7VnFO5P9LFSB6BudFcBkzUUgEKY'});

// construct parameters
const req = new vision.Request({
    image: new vision.Image(IMAGE_PATH),
    features: [
        new vision.Feature('LABEL_DETECTION', 10),
    ]
});

// send single request
vision.annotate(req).then((res) => {
    let response = res.responses;
    console.log(JSON.stringify(response));
    if(!response[0].labelAnnotations){
        process.exit();
    }
    let filter = response[0].labelAnnotations.filter(function (annotation) {
        return annotation.score > 0.6 && (["police", "police officer"].includes(annotation.description));
    });

    if(filter.length > 0){
        console.log(filter);
        let now = Date.now();
        Moment.locale('fr');
        let nowString = Moment().locale('fr').format('L LT');
        client.post('statuses/update', {status: nowString+' : Attention, ASVP !'},  function(error, tweet, response) {
            if(error){
                console.error(error);
            }else{
                fs.writeFile(LAST_NOTIFICATION_FILE, Date.now());
                // Retrieve weather information from coordinates (Sydney, Australia)
                forecast.get([48.862725, 2.287592], function(err, weather) {
                    if(err) return console.error(err);

                    let client = Client.fromConnectionString(CONNECTION_STRING, Protocol);

                    let dataToAzure = JSON.stringify({
                        "date": now,
                        "weather" : weather
                    });

                    //Send to Azure
                    client.sendEvent(new Message(dataToAzure), function (err) {
                        if(err) console.error(err);
                        let azureStorageService = AzureStorage.createBlobService('asvpnotifierstorage',
                            'HJlfFILzY54v853Fzm8PM0rArCN32Rsr7/4lgYhlzVFtHy21Mrptn2QruGnYRyh4MHodIHVyhtugUuk5ILY1+g==',
                            'https://asvpnotifierstorage.blob.core.windows.net/?sv=2016-05-31&ss=bfqt&srt=sco&sp=rwdlacup&se=2017-03-17T00:24:55Z&st=2017-03-16T16:24:55Z&spr=https&sig=U01Y4aaBFGsb6PSSuK5csdPVgF0QdY%2Flhd5vUbknjLQ%3D');
                        azureStorageService.createBlockBlobFromLocalFile('images', now+'.jpg', IMAGE_PATH, function(error, result, response){
                            if(!error){
                                console.log(`File  ${now}.jpg Uploaded !`);
                                process.exit();
                            }
                        });
                    });
                });
            }

        });
}

}, (e) => {
    console.log('Error: ', e)
});