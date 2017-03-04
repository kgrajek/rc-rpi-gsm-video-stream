
/// INITIALIZATION CODE ////////////////////////////////////////////////////////

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const SocketServer = require('ws').Server;
const localconf = require('../localconf');

const argv = require('yargs')
	.option('secret', { alias: 's', describe: 'secret to make sure that no one else will stream' })
	.option('port', { alias: 'p', describe: 'port to start application' })
	.help()
	.argv;

if (argv.port === 'auto' || !argv.port) {
	if (process.env.PORT) {
		argv.port = process.env.PORT;
	}
}

if (!argv.port) {
	argv.port = localconf.port;
}

if (!argv.secret) {
	argv.secret = localconf.secret;
}

if (!argv.port) {
	throw new Error('Missing port parameter! Aborting!');
}

if (!argv.secret) {
	throw new Error('Missing secret parameter! Aborting!');
}

/// UTILITY FUNCTIONS //////////////////////////////////////////////////////////

function dictExtensionToMime(ext) {
	const mimeMap = {
		'ico': 'image/x-icon',
		'html': 'text/html',
		'js': 'text/javascript',
		'json': 'application/json',
		'css': 'text/css',
		'png': 'image/png',
		'jpg': 'image/jpeg',
		'wav': 'audio/wav',
		'mp3': 'audio/mpeg',
		'svg': 'image/svg+xml'
	};

	return mimeMap[ ext ];
}

function broadcastMessage(wss, type, content) {
	wss.clients.forEach(function each(client) {
		if (client.readyState !== 1) { // WebSocket.OPEN) {\
			return;
		}

		if (
			00
			|| ( type === 'command' && client._EHLOTYPE === 'SHIP')
			|| ( type === 'video'   && client._EHLOTYPE === 'PAD')
			|| ( type === 'log'     && client._EHLOTYPE === 'PAD')
		) {
			client.send(content);
		}
	});
}

function rejectHttpRequest(res, httpStatusCode, message) {
	res.statusCode = httpStatusCode;
	res.end(message);
	return;
}

function getFilepathFromUrl(url) {
	const qmarkPos = url.indexOf('?');
	if (qmarkPos >= 0) {
		return url.substr(0, qmarkPos);
	}

	return url;
}

function parseMessage(msg) {
	// type: ping,ehlo,log,command,video

	if (typeof msg === 'string') {
		if (msg.substr(0, 4) === 'EHLO') {
			var match = msg.match(/^EHLO([A-Z]{3,5})/);
			if (match) {
				return {
					type: 'ehlo',
					content: match[1]
				}
			}
		}
		else if (msg.substring(0, 2) === '$ ') {
			return {
				type: 'log',
				content: msg
			}
		}
		else if (msg.substring(0, 2) === '! ') {
			return {
				type: 'command',
				content: msg
			}
		}
	}
	else if (typeof msg === 'object' && msg.length > 30) {
		return {
			type: 'video',
			content: msg
		}
	}

	console.warn('Not parsed message:', msg.length, typeof msg === 'string' ? msg : typeof msg);
}

/// SERVER /////////////////////////////////////////////////////////////////////

// HTTP Server to accept incomming MPEG-TS Stream from ffmpeg
const httpServer = http.createServer(function(req, res) {
	// TODO limit to /srv/
	var params = req.url.substr(1).split('/');
	if (params[0] === 'streamUpload') {
		if (params[1] !== argv.secret) {
			// return rejectHttpRequest(res, 401, `Bad secret. Rejecting: ${req.socket.remoteAddress}:${req.socket.remotePort}`);
		}

		console.log(`Stream Connected: ${req.socket.remoteAddress}:${req.socket.remotePort}`);

		res.connection.setTimeout(0);
		req.on('data', function(data) {
			var msg = parseMessage(data);
			if (msg) {
				broadcastMessage(wsServer, msg.type, msg.content);
			}
		});

		req.on('end',function(){
			console.log(`Disconected: ${req.socket.remoteAddress}:${req.socket.remotePort}`);
		});
	}
	else {
		if (req.method !== 'GET') {
			// return rejectHttpRequest(res, 400, `Not supported method: ${req.method}!`);
		}

		let relfilepath = getFilepathFromUrl(req.url);
		if (!relfilepath || relfilepath === '/') {
			relfilepath = '/index.html';
		}

		const filepath = __dirname + relfilepath;
		const fileext = relfilepath.split('.').pop();

		fs.exists(filepath, function (exist) {
			if (!exist) {
				return rejectHttpRequest(res, 404, `File ${relfilepath} not found!`);
			}

			if (fs.statSync(filepath).isDirectory()) {
				return rejectHttpRequest(res, 404, `File ${relfilepath} not found!`);
			}

			// read file from file system
			fs.readFile(filepath, function(err, data) {
				if (err) {
					return rejectHttpRequest(res, 500, `Error getting the file: ${err}.`);
				}

				res.setHeader('Content-type', dictExtensionToMime(fileext) || 'text/plain' );
				res.end(data);
			});
		});
	}
}).listen(argv.port, function() {
	console.log(`HTTP Server Listening on: ${argv.port}`);
});

const wsServer = new SocketServer({ server: httpServer });

wsServer.on('connection', function(socket) {
	const address = socket._socket.address();
	console.log(`Client connected: ${address.address}:${address.port}`);

	socket.on('message', function incoming(data) {
		var msgh = parseMessage(data);
		if (msgh) {
			if (msgh.type === 'ehlo') {
				console.log('# New device:', msgh.content);
				socket._EHLOTYPE = msgh.content;
				socket.send(msgh.content + 'EHLO');
				return;
			}

			broadcastMessage(wsServer, msgh.type, msgh.content);
		}
	});

	socket.on('close', function() {
		console.log('Client disconnected');
	});
});

/// THE END ////////////////////////////////////////////////////////////////////
