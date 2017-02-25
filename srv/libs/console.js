
function consoleapi$initialize(div) {
	var original = {
		log: console.log,
		info: console.info,
		warn: console.warn,
		error: console.error
	};

	console.log = function(msg) {
		consoleapi$write(div, 'log', msg);
		original.log.apply(console, arguments);
	};

	console.info = function(msg) {
		consoleapi$write(div, 'info', msg);
		original.info.apply(console, arguments);
	};

	console.warn = function(msg) {
		consoleapi$write(div, 'warn', msg);
		original.warn.apply(console, arguments);
	};

	console.error = function(msg) {
		consoleapi$write(div, 'error', msg);
		original.error.apply(console, arguments);
	};

	window.onerror = function(msg, url, line, col, error) {
		var extra = !col ? '' : '\ncolumn: ' + col;
		extra += !error ? '' : '\nerror: ' + error;

		consoleapi$write(div, 'exception', msg);
		original.error.apply(console, 'ex: ' + msg);

		var suppressErrorAlert = true;

		return suppressErrorAlert;
	};

	return true;
}

function consoleapi$write(div, type, msg) {
	var background = 'none';
	if (type === 'err') {
		var color = '#ee0000';
	}
	else if (type === 'log') {
		var color = 'white';
	}
	else if (type === 'info') {
		var color = 'white';
	}
	else if (type === 'warn') {
		var color = 'orange';
	}
	else if (type === 'ex') {
		var color = 'red';
		var background = 'white';
	}
	else {
		var color = 'magenta';
	}

	var $entry = jQuery('<div/>')
	$entry.text(type + ': ' + msg);
	$entry.css({
		color: color,
		backgroundColor: background
	});

	jQuery(div).prepend($entry);
	setTimeout(function() {
		$entry.remove();
	}, 5000)

	div.scrollTop = 0;

	return true;
}
