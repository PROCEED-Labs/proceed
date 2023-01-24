const Nexpress = require('@proceed/native-express');
const Nmachine = require('@proceed/native-machine');
const Nmdns = require('@proceed/native-mdns');
const Ncapabilities = require('@proceed/native-capabilities');

const express = require('express');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = 3000;

const _modules = new Map();
const registerModule = (module) => {
  module.commands.forEach((command) => _modules.set(command, module));
};

registerModule(new Nexpress());
registerModule(new Nmachine());
registerModule(new Nmdns());
registerModule(new Ncapabilities());

// console.log({_modules});

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('client connected');
  socket.on('disconnect', () => {
    console.log('client disconnected');
  });

  socket.on('message', (message) => {
    const [taskID, command, args] = message;
    const module = _modules.get(command);
    if (!module) {
      console.log('module not found for: ', command);
      return;
    }

    const send = (err, data) => {
      io.emit('response', [taskID, [err, ...(data || [])]]);
    };

    const result = module.executeCommand(command, args, send);

    if (typeof result === 'object' && result instanceof Promise) {
      result
        .then((data) => send(null, data))
        .catch((err) => {
          console.log({ err });
          return send(err);
        });
    }
  });
});

http.listen(PORT, () => console.log('listening on port 3000!'));
