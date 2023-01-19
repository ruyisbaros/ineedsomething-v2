DIT="/home/ec2-user/advanced_mern_project-updated"
if [ -d "$DIT" ]; then
    cd /home/ec2-user
    sudo rm -rf advanced_mern_project-updated
else
    echo "File not found"
fi
