# rc-rpi-gsm-video-stream

Remote controlled via gsm, video streaming vehicle

!This project is on early stages of development and manufacturing!
!It will get released in few months!

Features:
-	low latency
-	full duplex communication

TODO
-	user friendly messages
-	wiecej kanałów
-	pakiet npm do obslugi np radaru
-	https://botland.com.pl/ultradzwiekowe-czujniki-odleglosci/2743-ultradzwiekowy-czujnik-odleglosci-us-015-2-400-cm.html
-	zapisac tu wersje noda z raspberry

Intreseted in making cool project?
-	?


sudo modprobe -r bcm2835-v4l2
sudo modprobe bcm2835-v4l2
avconv -f video4linux2 -framerate 25 -video_size 320x200 -i /dev/video0 -f mpegts -codec:v mpeg1video -s 320x200 -b:v 1000k -bf 0 http://192.168.1.100:8081/streamUpload/dupa123
