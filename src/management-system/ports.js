module.exports = {
  frontend: 33080, // port used by the server hosting the main frontend
  websocket: 33081, // port used by the websocket server that is used for communication between server and frontend
  puppeteer: 33082, // port used by the server that hosts the frontend for the puppeteer client
  'dev-server': {
    // ports for the dev-servers that host the frontends in development
    frontend: 33083,
    puppeteer: 33084,
    electron: 9000,
  },
};
