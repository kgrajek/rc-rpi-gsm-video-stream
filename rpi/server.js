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

console.log(`# conecting to: ${argv.server}:${argv.port}`);

const ws = new WebSocket(argv.server + ':' + argv.port);
ws.on('open', function open() {
	ws.send('EHLOSHIP');
	console.info('# Send EHLOSHIP. Waiting for SHIPEHLO ...');
});

ws.on('message', function incoming(data, flags) {
	if (data.length > 10) {
		console.error('received non command frame');
		return;
	}

	if (data === 'SHIPEHLO') {
		console.info('# ... SHIPEHLO Received. Connected. Waiting for commands');
	}
	else if (data === 'SRVPING') {
	}
	else {
		var gpio = keyToGpio[ data ];
		if (gpio >= 0) {
			// if full forward then back as stop else as back
			//
			console.log('turn gpio:', gpio);
		}
		else {
			console.error('unknown:', data);
		}
	}
});
