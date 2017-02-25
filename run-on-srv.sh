#!/bin/bash

cd srv;
ln -s ../node_modules/ npmlibs
cd ..

result=1
while [ $result -ne 0 ]; do
	node srv/server.js "$@"
	result=$?
done
