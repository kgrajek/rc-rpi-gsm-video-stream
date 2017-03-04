#!/usr/bin/bash

until node ./srv/index.js $@; do
	echo "srv/index.js crashed with exit code $?. respawning.." >&2
	sleep 1
done
