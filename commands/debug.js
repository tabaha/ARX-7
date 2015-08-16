import {Command} from './command.js';

export class Debug extends Command {
  message(from, to, text, message) {
    if (text.toLowerCase() === 'ping') {
      this.client.say(to, 'Pong');
    }

    if (text.toLowerCase() === 'bot respond') {
      this.client.say(to, "I'm a pretty stupid bot.");
    }
  }
}