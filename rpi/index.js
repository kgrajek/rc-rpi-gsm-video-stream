const localconf = require('../localconf');
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;
const kill = require('tree-kill');
const gpio = require('rpi-gpio');

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

// COMMANDS /////////////////////////////////////////////////////////////////////////

var keyToGpio = {
	turnl: { num:  7, mode: 'press', val: null, tid: false },
	turnr: { num: 11, mode: 'press', val: null, tid: false },
	forth: { num: 16, mode: 'hold',  val: null, tid: false },
	back:  { num: 22, mode: 'press', val: null, tid: false, reset: 'forth' },
	caml:  { num: 12, mode: 'press', val: null, tid: false },
	camr:  { num: 13, mode: 'press', val: null, tid: false },
	camu:  { num: 15, mode: 'press', val: null, tid: false },
	camd:  { num: 18,  mode: 'press', val: null, tid: false },
};

/// INITIALIZE GPIO ////////////////////////////////////////////////////////////

for (var k in keyToGpio) { // TODO move to handle
	var gpioh = keyToGpio[ k ];

	gpio.setup(gpioh.num, gpio.DIR_OUT, function(err) {
		if (err) {
			console.error(`# error while initializing gpio ${gpioh.num}`, err);
		}
	});
}

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
		exec(localconf['command:unloadDriver'], function(err, stdout, stderr) {
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
		exec(localconf['command:loadDriver'], function(err, stdout, stderr) {
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
			if (socket.readyState === 1) {
				socket.send(`$ ${logAlias} stdout: ${data}`);
			}

			console.log(`${logAlias} stdout: ${data}`);
		});
		child.stderr.on('data', function(data) {
			if (data.indexOf('frame=') >= 0 && data.indexOf('size=') >= 0 && data.indexOf('time=') >= 0 && data.indexOf('bitrate=') >= 0) { // TODO separate
				return;
			}

			if (socket.readyState === 1) {
				socket.send(`$ ${logAlias} stderr: ${data}`);
			}

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

		var gpioh = keyToGpio[ command ];
		if (gpioh) {
			var gpnum = gpioh.num;
			var gpmode = gpioh.mode;
			var gpval = gpioh.val;
			var gptid = gpioh.tid;
			var gpreset = gpioh.reset;

			if (gptid) {
				clearTimeout(gptid);
				gpioh.tid = null;
			}

			if (gpreset && keyToGpio[ gpreset ].value) {
				keyToGpio[ gpreset ].value = false;
				ws.send(`$ canceled ${gpreset}`);
				console.log(`# canceled ${gpreset}`);
				gpioSet(keyToGpio[ gpreset ].num, 0, ws);
			}
			else {
				if (gpmode === 'press') {
					if (gpioh.value !== true) {
						ws.send(`$ activate ${command}`);
						console.log(`# activate ${command}`);
						gpioh.value = true;
						gpioSet(gpnum, 1, ws);
					}

					gpioh.tid = setTimeout(
						function() {
							ws.send(`$ de-activate ${command}`);
							console.log(`# de-activate ${command}`);
							gpioh.tid = null;
							gpioh.value = false;
							gpioSet(gpnum, 0, ws);
						},
						200 // TODO configure. Should be a little bit longer than key read interval on index.html
					);
				}
				else if (gpmode === 'hold') {
					if (gpioh.value !== true) {
						gpioh.value = true;
						gpioSet(gpnum, 1, ws);
						ws.send(`$ activate ${command}`);
						console.log(`# activate ${command}`);
					}
				}
				else {
					ws.send(`$ unknown command ${command}`);
					console.log(`# unknown command ${command}`);
				}
			}

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

function gpioSet(pin, value, socket) {
	gpio.write(pin, value, function(err) {
		if (err) {
			if (socket) {
				socket.send(`# error while setting gpio ${pin}`);
			}

			console.log(`# error while setting gpio ${pin}`, err);
		}
	});
}
