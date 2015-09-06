import debug from 'debug';
import irc from 'irc';
import config from '../config';
import pkg from '../package';

import {Choose} from './commands/choose.js';
import {Imgur} from './commands/imgur.js';
import {Order} from './commands/order.js';
import {Reply} from './commands/reply.js';
import {Time} from './commands/time.js';
import {Twitter} from './commands/twitter.js';
import {Youtube} from './commands/youtube.js';

let log = debug('ARX-7');
let droppedChannels = [];
let channels = [];

// Initialize the Bot
let client = new irc.Client(config.server, config.name, {
  userName: config.userName || "chidori"
});

// Command List Setup
let commands = [
  new Choose(client),
  new Imgur(client),
  new Order(client),
  new Reply(client),
  new Time(client),
  new Twitter(client),
  new Youtube(client)
];

// On Server Connect
client.addListener('registered', (message) => {
  log('Connected to Server');
  client.say('NickServ', `identify ${config.password}`);
  log('Identified');

  // Join channels
  config.channels.forEach(c => {
    if (!c.name.startsWith('#')) {
      c.name = `#${c.name}`;
    }

    let len = channels.push(c.name.toLowerCase());
    log(`Joining ${channels[len - 1]}`);

    if (c.key) {
      client.join(`${channels[len - 1]} ${c.key}`);
    }
    else {
      client.join(channels[len - 1]);
    }
  });
});

// Respond to Version requests
client.addListener('ctcp-version', (from, to, message) => {
  log(`CTCP request from ${from}`);
  client.ctcp(from, 'notice', `VERSION ARX-7 v${pkg.version} (Bot)`);
});

// Listen for channel / personal Messages
client.addListener('message', (from, to, text, message) => {
  // Channels in Config
  if (channels.includes(to)) {
    commands.forEach(c => {
      let plugin = c.constructor.name.toLowerCase();

      if (config.channels[channels.indexOf(to)].plugins.includes(plugin)) {
        c.message(from, to, text, message);
      }
    });
  }

  // Queries
  if (to === client.nick) {
    log(`Query from ${from}: ${text}`);
    client.say(from, "I'm a bot! Contact Desch, Jukey, or Aoi-chan for help");
  }
});

// Praise the Creator
client.addListener('join', (channel, nick, message) => {
  if (nick === 'Desch' && channel == '#arx-7') {
    client.say(channel, 'Hello Master.');
  }
});

// Custom Auto-Rejoin
client.addListener('kick', (channel, nick, by, reason, message) => {
  if (nick === client.nick) {
    log(`Kicked from ${channel} by ${by}: ${reason}`);
    setTimeout(() => {
      log(`Rejoining ${channel}`);
      client.join(channel);
    }, 1000 * 3);
  }
});

client.addListener('error', message => {
  // Attempt to rejoin banned channels
  if (message.command == 'err_bannedfromchan') {
    log(`Banned from ${message.args[1]}. Rejoining in in 3 minutes`);

    // `()=>` ensures there is a delay; otherwise it continuously fires
    setTimeout(() => client.join(message.args[1]), 1000 * 60 * 3);
  }
  // Attempt to rejoin +k channels correctly
  else if (message.command == 'err_badchannelkey') {
    // Prevent infinite rejoin attempts
    if (droppedChannels.includes(message.args[1])) {
      log(`Incorrect password for ${message.args[1]}.`);
      return;
    }

    let key = config.channels[channels.indexOf(message.args[1])].key;

    if (key != null) {
      log(`${message.args[1]} is +k. Rejoining with password.`);
      client.join(`${message.args[1]} ${key}`);
      droppedChannels.push(message.args[1]);
    }
    else {
      log(`${message.args[1]} is +k. No key found. Skipping channel`);
    }
  }
  // Log other errors
  else {
    log(`ERROR: ${message.command}`);
  }
});
