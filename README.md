# cluster-sockets
A TypeScript web socket implementation for ham radio clusters.
## Installation 
```sh
npm install cluster-sockets --save
```
## Usage
### Server (Built-in web server)
```javascript
const { ClusterServer } = require('cluster-sockets');

const clusterServer = new ClusterServer(callsign, {
  hostname: "telnet.reversebeacon.net",
  port: 7000,
  type: "rbn"
}, 80);
```
### Server (Existing HTTP or HTTPS server)
```javascript
const { createServer } = require ('http');
const { ClusterServer } = require('cluster-sockets');

const webServer = createServer();
webServer.listen(80);

const clusterServer = new ClusterServer(callsign, {
  hostname: "telnet.reversebeacon.net",
  port: 7000,
  type: "rbn"
}, webServer);
```
### Client
```javascript
const { ClusterClient } = require('cluster-sockets');

const clusterClient = new ClusterClient("ws://localhost");

clusterClient.on("connected", async ()=> {
  const clusters = await clusterClient.list(); // Array of ClusterOptions
  clusterClient.join(0); // Joins the cluster at index 0 of "clusters";

  // Later
  clusterClient.leave(0);
});
clusterClient.on("spot", clusterSpot => {
  if (clusterSpot.spot.dxCall != callsign) return;

  console.log(`You've been spotted by ${clusterSpot.hostname}:${clusterSpot.port}!`);
  console.log(clusterSpot.spot);
});

```

# TODO
* Add error handling
* Continue testing (module is *extremely* experimental at this stage)