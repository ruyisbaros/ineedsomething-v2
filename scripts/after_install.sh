cd /home/ec2-user/ineedsomething-v2
sudo rm -rf env-file.zip
sudo rm -rf .env
sudo rm -rf .env.develop
aws s3 sync s3://needsomething-env-files/dev .
unzip env-file.zip
sudo cp .env.develop .env
npm install
