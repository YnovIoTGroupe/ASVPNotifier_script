/**
 * Created by Léon on 15/03/2017.
 */
'use strict'
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