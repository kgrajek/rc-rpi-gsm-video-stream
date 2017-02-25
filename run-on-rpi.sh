#!/bin/bash

result=1
while [ $result -ne 0 ]; do
	node rpi/server.js "$@"
	result=$?
done
