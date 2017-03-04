

console.log('AA');

var child = exec('wget http://google.com -O - -S',
	function(error, stdout, stderr) {
		console.log('stdout: ' + stdout);
		console.log('stderr: ' + stderr);
		if (error !== null) {
			console.log('exec error: ' + error);
		}
});
// child.kill()

console.log(child);

console.log('BB');
