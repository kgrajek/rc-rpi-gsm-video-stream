#!/usr/bin/bash

until node "${BASH_SOURCE%/*}/rpi/index.js" $@; do
	echo "${BASH_SOURCE%/*}/rpi/index.js crashed with exit code $?. respawning.." >&2
	sleep 1
done
