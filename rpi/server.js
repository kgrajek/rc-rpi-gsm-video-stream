const WebSocket = require('ws');
const argv = require('yargs')
	.option('server', { alias: 's', describe: 'addres of websocket' })
	.option('port', { alias: 'p', describe: 'port' })
	.demandOption(['server', 'port'], 'Please provide both run and path arguments to work with this tool')
	.help()
	.argv

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

const ws = new WebSocket('ws://' + argv.server + ':' + argv.port);
ws.on('open', function open() {
	ws.send('EHLOSHIP');
	console.info('Send EHLOSHIP. Waiting for SHIPEHLO ...');
});

ws.on('message', function incoming(data, flags) {
	if (data === 'SHIPEHLO') {
		console.info('... SHIPEHLO Received. Connected. Waiting for commands');
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
