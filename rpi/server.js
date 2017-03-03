var localconf = require('../localconf');

const WebSocket = require('ws');
const argv = require('yargs')
	.option('server', { alias: 's', describe: 'addres of remote server' })
	.option('port', { alias: 'p', describe: 'port' })
	.help()
	.argv;


if (!argv.server) {
	argv.server = localconf.server;
	argv.port = localconf.port;
}

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

/// handlers ///////////////////////////////////////////////////////////////////

var handlers = {
	handle_stop_stream: function(socket) {
		console.log('# received request to stop stream');
		socket.send('$ stream stoped');
	},
	handle_restart_stream: function(socket) {
		console.log('# received request to restart stream');
		socket.send('$ stream started not');
	},
	handle_request_ship_status: function(socket) {
		console.log('# generating ship status');
		socket.send('$ ship is probably ok');
	}
};

///

console.log(`# conecting to: ${argv.server}:${argv.port}`);

const ws = new WebSocket(argv.server + ':' + argv.port);
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

///

setInterval(function() {
	ws.send('$ ping');
}, 1000 * 7);
