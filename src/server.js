import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import botkit from 'botkit';
import dotenv from 'dotenv';
import yelp from 'yelp-fusion';

dotenv.config({ silent: true });

// initialize
const app = express();

// enable/disable cross origin resource sharing if necessary
app.use(cors());

// enable/disable http request logging
app.use(morgan('dev'));

// enable only if you want templating
app.set('view engine', 'ejs');

// enable only if you want static assets from folder static
app.use(express.static('static'));

// this just allows us to render ejs from the ../app/views directory
app.set('views', path.join(__dirname, '../src/views'));

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// default index route
app.get('/', (req, res) => {
  res.send('hi');
});

// botkit controller
const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM((err) => {
  // start the real time message client
  if (err) { throw new Error(err); }
});


controller.hears(['sushi', 'pizza', 'burger', 'japanese', 'italian', 'chinese', 'thai', 'caribbean', 'american'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  const yelpClient = yelp.client(process.env.YELP_CLIENT_SECRET);

  const foodType = message.text;
  yelpClient.search({
    term: foodType,
    location: 'Hanover, nh',
  }).then((response) => {
    bot.reply(message, `Here is the top rated ${foodType} restaurant near Hanover: ${response.jsonBody.businesses[0].name}. It's rating is ${response.jsonBody.businesses[0].rating}.`);
    bot.reply(message, `${response.jsonBody.businesses[0].url}`);
    bot.reply(message, 'Happy eatings!');
  }).catch((e) => {
    console.log(e);
  });
});

controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}! What type of food would you like?`);
    } else {
      bot.reply(message, 'Hello there What type of food would you like?');
    }
  });
});

controller.hears([''], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'Hmm, I did not catch that. Please type a cuisine you want to eat.');
});

controller.on('outgoing_webhook', (bot, message) => {
  bot.replyPublic(message, 'yeah yeah');
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090;
// app.listen(port);

console.log(`listening on: ${port}`);
