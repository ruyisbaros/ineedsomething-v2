DIT="/home/ec2-user/ineedsomething-v2"
if [ -d "$DIT" ]; then
    cd /home/ec2-user
    sudo rm -rf ineedsomething-v2
else
    echo "File not found"
fi
