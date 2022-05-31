import { Server } from 'socket.io';
import { io as createSocket, Socket } from 'socket.io-client';
import { Server as HttpServer, createServer } from 'http';
import { Server as HttpsServer } from 'https';
import { HamCluster } from 'ham-cluster';
import type { ClusterOptions } from 'ham-cluster';

type ClusterClientEventLabels = "connected" | "spot" | "error";
type Spot = { [key: string]: string };

class ClusterServer {
  private hamClusters = [] as HamCluster[];
  private io: Server;

  /**
   * 
   * @param callsign A callsign for logging into clusters.
   * @param clusters An array of ClusterOptions.
   * @param server An HTTP or HTTPS server.
   */
  constructor(callsign: string, clusters: ClusterOptions[], server: HttpServer | HttpsServer);

  /**
   * 
   * @param callsign A callsign for logging into clusters.
   * @param clusters An array of ClusterOptions.
   * @param port A port for creating an HTTP server.
   */
  constructor(callsign: string, clusters: ClusterOptions[], port: number);

  constructor(callsign: string, clusters: ClusterOptions[], serverOrPort: HttpServer | HttpsServer | number) {
    let server: HttpServer | HttpsServer;
    if (typeof serverOrPort == "number") {
      server = createServer();
      server.listen(serverOrPort);
    } else {
      server = serverOrPort;
    }
    this.io = new Server(server, {
      cors: { origin: "*" }
    });

    clusters.forEach((clusterOptions, index) => {
      const cluster = new HamCluster(callsign, clusterOptions);
      cluster.on("spot", (spot: Spot) => this.emitSpot(index, cluster.hostname, cluster.port, spot));
      this.hamClusters.push(cluster);
    });

    this.io.on('connection', socket => {
      socket.on('join', room => {
        socket.join(room.toString());
      });
      socket.on('leave', room => socket.leave(room.toString()));
      socket.on('list', (jobId: string)=> {
        socket.emit("list", { clusters, jobId });
      });
    });
  }

  private emitSpot(index: number, hostname: string, port: number, spot: Spot) {
    this.io.to(index.toString()).emit("spot", { hostname, port, spot });
  }

}

class ClusterClient {
  private socket: Socket;
  private jobs = {} as { [key: string]: Function };
  private handlers = {} as {[key in ClusterClientEventLabels]: (args?: any) => void};

  /**
   * 
   * @param url The url of a ClusterSocket server.
   */
  constructor(url: string) {
    this.socket = createSocket(url);
    this.socket.on("connect", ()=> this.trigger("connected"));
    this.socket.on("list", ({ clusters, jobId })=> this.jobs[jobId]?.(clusters));
    this.socket.on("spot", spot => this.trigger("spot", spot));
  }

  private trigger(label: ClusterClientEventLabels, args?: any) {
    this.handlers[label]?.(args);
  }

  /**
   * @param label of the event.
   * @param event function that is triggered by the event.
   */
   on(label: ClusterClientEventLabels, event: (args?: any) => void) {
    this.handlers[label] = event;
  }

  /**
   * 
   * @returns array of all available clusters.
   */
  list() {
    const jobId = "job_" + Date.now();
    this.socket.emit("list", jobId);
    return new Promise(resolve => this.jobs[jobId] = resolve);
  }

  /**
   * 
   * @param index connects to the cluster at a given index from the list array.
   */
  join(index: number) {
    this.socket.emit("join", index);
  }

  /**
   * 
   * @param index disconnects from the cluster at a given index from the list array.
   */
  leave(index: number) {
    this.socket.emit("leave", index);
  }

}

module.exports = { ClusterServer, ClusterClient };

export { ClusterServer, ClusterClient };
