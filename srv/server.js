var fs = require('fs');
var http = require('http');
var WebSocket = require('ws');
var connect = require('connect');
var serveStatic = require('serve-static');

const argv = require('yargs')
	.option('secret', { aliXas: 's', describe: 'secret to make sure that no one else will stream' })
	.option('httpPort', { alXias: 'p', describe: 'might be omited' })
	.option('streamPort', { aXlias: 'p', describe: 'port' })
	.option('feedPort', { aliaXs: 'p', describe: 'port' })
	.option('ctrlPort', { aliaXs: 'p', describe: 'port' })
	.demandOption(['secret', 'streamPort', 'feedPort', 'ctrlPort'], 'Please provide both run and path arguments to work with this tool')
	//.default({ httpPort: 8080 streamPort: 10, feedPort : ctrlPort })
	.help()
	.argv;

var STREAM_SECRET = argv.secret;
var HTTP_PORT = argv.httpPort;
var STREAM_PORT = argv.streamPort;
var WEBSOCKET_PORT = argv.feedPort;
var CONTROLL_SERVER = argv.ctrlPort;
var RECORD_STREAM = false;

// http server

if (HTTP_PORT) {
	connect().use(serveStatic(__dirname+'/../')).listen(HTTP_PORT, function(){
	    console.log('Server running on ' + HTTP_PORT + '...');
	});
}

// Leechers of video server

var socketServer = new WebSocket.Server({port: WEBSOCKET_PORT, perMessageDeflate: false});
socketServer.connectionCount = 0;
socketServer.on('connection', function(socket) {
	socketServer.connectionCount++;
	console.log(
		'New WebSocket Connection: ',
		socket.upgradeReq.socket.remoteAddress,
		socket.upgradeReq.headers['user-agent'],
		'(' + socketServer.connectionCount + ' total)'
	);
	socket.on('close', function(code, message){
		socketServer.connectionCount--;
		console.log(
			'Disconnected WebSocket (' + socketServer.connectionCount + ' total)'
		);
	});
});
socketServer.broadcast = function(data) {
	socketServer.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	});
};

// Command broadcaster

var commandServer = new WebSocket.Server({port: CONTROLL_SERVER, perMessageDeflate: false});
commandServer.on('connection', function connection(ws) {
	ws.on('message', function incoming(data) {
		if (data === 'EHLOSHIP') {
			ws.send('SHIPEHLO')
		}
		else {
			// Broadcast to everyone else.
			commandServer.clients.forEach(function each(client) {
				console.log('broadcasting:', data);
				if (client !== ws && client.readyState === WebSocket.OPEN) {
					client.send(data);
				}
			});
		}
	});
});

// HTTP Server to accept incomming MPEG-TS Stream from ffmpeg
var streamServer = http.createServer(function(request, response) {
	var params = request.url.substr(1).split('/');

	if (params[0] !== STREAM_SECRET) {
		console.log(
			'Failed Stream Connection: '+ request.socket.remoteAddress + ':' +
			request.socket.remotePort + ' - wrong secret.'
		);
		response.end();
	}

	response.connection.setTimeout(0);
	console.log(
		'Stream Connected: ' +
		request.socket.remoteAddress + ':' +
		request.socket.remotePort
	);
	request.on('data', function(data){
		socketServer.broadcast(data);
		if (request.socket.recording) {
			request.socket.recording.write(data);
		}
	});
	request.on('end',function(){
		console.log('close');
		if (request.socket.recording) {
			request.socket.recording.close();
		}
	});

	// Record the stream to a local file?
	if (RECORD_STREAM) {
		var path = 'recordings/' + Date.now() + '.ts';
		request.socket.recording = fs.createWriteStream(path);
	}
}).listen(STREAM_PORT);


console.log('Listening for incomming MPEG-TS Stream on http://127.0.0.1:' + STREAM_PORT + '/<secret>');
console.log('Awaiting WebSocket commands connections on ws://127.0.0.1::' + CONTROLL_SERVER + '/');
console.log('Awaiting WebSocket video leechers connections on ws://127.0.0.1:' + WEBSOCKET_PORT + '/');
