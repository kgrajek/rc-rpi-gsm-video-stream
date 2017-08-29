echo "Searching $1"
devPath=`lsusb | grep $1 | sed -r 's/Bus ([0-9]{3}) Device ([0-9]{3}).*/bus\/usb\/\1\/\2/g;'`
if [ ! -z  $devPath ]
then
    echo "Found $1 @ $devPath"
    echo "Path search"
else
    echo "Don't found $1"
    exit
fi

for sysPath in /sys/bus/usb/devices/*; do
    #echo "$sysPath/uevent"
    devName=`cat "$sysPath/uevent" | grep $devPath`
    #echo devName=$devName
    if [ ! -z $devName ]
    then
        echo "Found $1 @ $sysPath, Reseting"
       #echo "echo 0 > $sysPath/authorized"
        echo 0 > $sysPath/authorized
        #echo "echo 1 > $sysPath/authorized"
        echo 1 > $sysPath/authorized
        exit
fi
done

