cd /home/ec2-user/advanced_mern_project-updated
sudo rm -rf env-file.zip
sudo rm -rf .env
sudo rm -rf .env.2
aws s3 sync s3://needsomething-env-files/develop .
unzip env-file.zip
sudo cp .env.2 .env
sudo pm2 delete all
npm install
