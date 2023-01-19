DIR="/home/ec2-user/ineedsomething-v2"
if [ -d "$DIR" ]; then
    cd /home/ec2-user
    sudo pm2 delete all
    sudo rm -rf ineedsomething-v2
else
    echo "File not found"
fi
