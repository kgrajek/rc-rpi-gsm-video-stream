#!/usr/bin/bash

until node ./rpi/index.js $@; do
	echo "rpi/index.js crashed with exit code $?. respawning.." >&2
	sleep 1
done
