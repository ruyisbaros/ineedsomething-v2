cd /home/ec2-user/ineedsomething-v2

sudo rm -rf .env
sudo rm -rf .env.production
aws s3 sync s3://needsomething-env-files/production .
sudo cp .env.production .env
sudo pm2 delete all
npm install
