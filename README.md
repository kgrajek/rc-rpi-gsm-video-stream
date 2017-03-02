# rc-rpi-gsm-video-stream

!This project is on early stages of development and manufacturing!
!It will get released in few months!

## Features:
-	controlled by ?rpi rev2?
-	remote controlled through GSM
-	low latency video stream
-	full duplex communication

## How to start
-	TODO review
-	create heroku account
-	/etc/wvdial

## Todo
-	wss / ws
-	> received < send # log @ broadcast
-	make raspberry receive SRVPING
-	dodanie .localconf i zeby wszystkie komendy z niego braly
-	add panel to turn of / reset vnc, turn off reset stream, reset rpi
-	resetowanie informacji o porcie reloadPage
-	index.html przerobic na refleksje
-	zapisac tu wersje noda z raspberry
-	in case of heroku server/port change it should get access date from some solid domain
-	move in wvdial.conf -> add warn if it differs from system
-	make it always use wvdial rrgvs

sudo modprobe -r bcm2835-v4l2
sudo modprobe bcm2835-v4l2
avconv -f video4linux2 -framerate 25 -video_size 320x200 -i /dev/video0 -f mpegts -codec:v mpeg1video -s 320x200 -b:v 1000k -bf 0 http://192.168.1.100:8081/streamUpload/dupa123

heroku logs --tail
git push heroku master

https://github.com/kgrajek/rc-rpi-gsm-video-stream.git

## Future
-	package for rotating proximity detector
-	https://botland.com.pl/ultradzwiekowe-czujniki-odleglosci/2743-ultradzwiekowy-czujnik-odleglosci-us-015-2-400-cm.html

## Subproject ideas

Intreseted in making cool project?
-	?
