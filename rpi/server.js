const localconf = require('../localconf');
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;
const kill = require('tree-kill');

const WebSocket = require('ws');
const argv = require('yargs')
	.option('server', { describe: 'addres of remote server' })
	.option('secret', { describe: 'secreed needed for streaming' })
	.option('port', { describe: 'port' })
	.help()
	.argv;


if (!argv.server) {
	argv.server = localconf.server;
	argv.port = localconf.port;
}

// ??? /////////////////////////////////////////////////////////////////////////

var keyToGpio = {
	dpad_l: 0,
	dpad_r: 1,
	dpad_t: 2,
	dpad_d: 3,

	joyL_l: 4,
	joyL_r: 5,
	joyL_t: 6,
	joyL_d: 7,

	joyR_l: null,
	joyR_r: null,
	joyR_t: null,
	joyR_d: null,

	x: null,
	y: null,
	a: null,
	b: null,
	select: null,
	start: null
};

/// command handlers ///////////////////////////////////////////////////////////

var handlers = {
	handle_stop_stream: function(socket) {
		streamer.stop();
		console.log('# received request to stop stream');
		socket.send('$ executing stream stop');
	},
	handle_restart_stream: function(socket) {
		streamer.restart();
		console.log('# received request to restart stream');
		socket.send('$ executing stream start');
	},
	handle_request_ship_status: function(socket) {
		console.log('# generating ship status');
		socket.send('$ ship is probably ok');
	},
	handle_unload_video_driver: function(socket) {
		exec(localconf.command:unloadDriver, function(error, stdout, stderr) {
			if (err) {
				console.log('# unloading driver failed');
				socket.send('$ unloading driver failed');
			}
			else {
				console.log('# unloading driver done');
				socket.send('$ unloading driver done');
			}
		});
	},
	handle_load_video_driver: function(socket) {
		exec(localconf.command:unloadDriver, function(error, stdout, stderr) {
			if (err) {
				console.log('# loading driver failed');
				socket.send('$ loading driver failed');
			}
			else {
				console.log('# loading driver done');
				socket.send('$ loading driver done');
			}
		});
	}
};

/// prepeare working commands //////////////////////////////////////////////////

/* function(error, stdout, stderr) {
	console.log('stdout: ' + stdout);
	console.log('stderr: ' + stderr);
	if (error !== null) {
		console.log('exec error: ' + error);
	} */

function createExternalCommand(localconfCommand, logAlias, socket) {
	var tmpl = localconf[ localconfCommand ];
	tmpl = tmpl.replace(/%SERVER%/, cutProtocolFromUrl(localconf.server));
	tmpl = tmpl.replace(/%PORT%/, localconf.port);
	tmpl = tmpl.replace(/%SECRET%/, localconf.secret);

	var child = null;

	var fStart = function() {
		var args = tmpl.split(/\s+/);
		var cmd = args.shift();

		child = spawn(cmd, args);

		child.stdout.on('data', function(data) {
			socket.readyState === 1 && socket.send(`$ ${logAlias} stdout: ${data}`);
			console.log(`${logAlias} stdout: ${data}`);
		});
		child.stderr.on('data', function(data) {
			socket.readyState === 1 && socket.send(`$ ${logAlias} stderr: ${data}`);
			console.log(`${logAlias} stderr: ${data}`);
		});
		child.on('close', function(code) {
			socket.readyState === 1 && socket.send(`$ ${logAlias} child process exited with code ${code}`);
			console.log(`${logAlias} child process exited with code ${code}`);
		});
		child.on('error', (err) => {
			socket.readyState === 1 && socket.send(`$ ${logAlias} failed to start child process.`);
			console.log(`${logAlias} failed to start child process.`);
		});
	};

	var fRestart = function() {
		if (child) {
			fStop();
		}

		setTimeout(
			function() {
				fStart();
			},
			1000
		);
	};

	var fStop = function() {
		if (child) {
			kill(child.pid);
		}
	}

	return {
		start: fStart,
		restart: fRestart,
		stop: fStop
	}
}

function createWebServiceConnection(callback) {
	console.log(`# conecting to: ${argv.server}:${argv.port}`);

	return new WebSocket(argv.server + ':' + argv.port);

	/* let ws;
	goto: do {
		try {
			ws = new WebSocket(argv.server + ':' + argv.port);
		}
		catch(ex) {
			console.error('#### ', ex);
			continue goto;
		}
	} while(false);

	console.log('!!!');

	return ws; */
}

var ws = createWebServiceConnection();
ws.on('open', function open() {
	ws.send('EHLOSHIP');
	console.info('# Send EHLOSHIP. Waiting for SHIPEHLO ...');
});

ws.on('message', function incoming(data, flags) {
	if (typeof data !== 'string') {
		ws.send('$ received non command frame');
		console.warn('# received non command frame');
		return;
	}

	if (data === 'SHIPEHLO') {
		console.info('# ... SHIPEHLO Received. Connected. Waiting for commands');
	}
	else if (data.substring(0, 2) === '! ') {
		var command = data.substr(2).replace(/-/g, '_')

		if (handlers['handle_' + command]) {
			try {
				handlers['handle_' + command](ws);
			}
			catch(ex) {
				console.log(ex);
				ws.send(`$ error while executing ${command}`);
			}

			return;
		}

		var gpio = keyToGpio[ command ];
		if (gpio >= 0) {
			// if full forward then back as stop else as back
			//
			ws.send(`$ turned on gpio ${gpio}`);
			console.log('# turn gpio:', gpio);
			return;
		}

		ws.send(`$ Unknown command: ${data} / ${command}`);
		console.warn('# Unknown command:', data);
	}
});

const dialer = createExternalCommand('command:dialin', 'ii', ws);
dialer.start();

const streamer = createExternalCommand('command:stream', 'vv', ws);

///

var pinger = setInterval(function() {
	if (ws.readyState === 1) {
		ws.send('$ ping');
	}
	else {
		console.warn(`# Unable to send ping. Socket readyState: ${ws.readyState}`);
		// clearInterval(pinger);
		// process.exit();
		ws = createWebServiceConnection();
	}
}, 1000 * 7);

/// UTILITIES //////////////////////////////////////////////////////////////////

function cutProtocolFromUrl(url) {
	return url.replace(/^\w{2,5}:\/\//, '');
}
