const net = require('net');

const port = 1337;
const host = '127.0.0.1';

let sockets = []

const server = net.createServer(socket => {
  console.log(`Connected: adress ${socket.remoteAddress}, port ${socket.remotePort}`);
  socket.write('Welcome to the chat!\nPlease enter a username.');
  socket.data = { username: null, admin: false, receiver: null, timeoutId: null, warnings: 0 };
  sockets.push(socket);

  socket.on('data', data => {
    console.log(`Received data from ${socket.remoteAddress}, port ${socket.remotePort}: ${data}`);
    console.log('Connected users:' + sockets.length);
    const text = data.toString();

    if (text.toLowerCase() === 'quit') {
      socket.destroy()
    }

    clearTimeout(socket.data.timeoutId)

    // close the connection if no messages for 5 minutes
    socket.data.timeoutId = setTimeout(() => {
      console.log('Timeout')
      socket.destroy()
    }, 300000)


    if (socket.data.username === null) {
      if (sockets.some(s => s.data.username === text) || text.startsWith('/')) {
        socket.write(`That username is already taken. Please select another one.`)
      } else {
        socket.data.username = text
        socket.write(`Hello ${socket.data.username}!`)
        broadcast(`User '${socket.data.username}' joined the chat.`, socket)
      }
    } else {
      // commands start with '/'
      if (text.startsWith('/')) {
        const command = text.split(' ')[0];
        console.log('cmd', command)
        switch (command) {
          case '/getAdminRights':
            socket.data.admin = true;
            socket.write("You can now kick a user out with the command '/remove username'")
            break;
          // send messages to only one user
          case '/pm': {
            const username = text.split(' ')[1];
            socket.data.receiver = sockets.find(s => s.data.username === username)
            socket.write(`Only '${username}' will see your messages`)
            break;
          }
          // send messages to all users
          case '/all':
            socket.data.receiver = null
            socket.write(`All users will see your messages.`)
            break;
          // remove user, admin rights required
          case '/remove':
            if (username.data.admin) {
            const username = text.split(' ')[1];
            const removed = sockets.find(s => s.data.username === username)
            removed.write('You have been kicked out.')
            removed.destroy()
            }
            break;

          default:
            socket.write('Unknown command.')
        }
      } else {
        let msg = `${socket.data.username}> ${text}`
        if (socket.data.receiver === null) {
          // send message to all users
          sockets.forEach(s => s.write(msg));
        } else {
          // send private message
          console.log('here')
          msg = 'PM ' + msg;
          socket.data.receiver.write(msg);
          socket.write(msg);
        }
      }
    };

    socket.on('error', err => {
      console.log('Error:' + err);
    });

    socket.on('close', () => {
      console.log(`Connection closed: ${socket.remoteAddress}, ${socket.remotePort}`);
      broadcast(`User '${socket.data.username}' left the chat.`, socket)
      sockets.splice(sockets.indexOf(socket), 1);
    });
  });
});

server.listen(port, host, () => {
  console.log('TCP server running on port ' + port);
});

const broadcast = (msg, sender) => {
  sockets.forEach(socket => {
    if (socket !== sender) {
      socket.write(msg);
    }
  });
}
