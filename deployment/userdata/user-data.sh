#/bin/bash

function is_program_installed {
    local return_=1

    type $1 >/dev/null 2>&1 || { local return_=0;}
    echo "$return_" 
}

sudo yum update -y

#if nodejs is not installed, install it
if [ $(is_program_installed node) === 0]; then
  curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
  sudo yum install nodejs -y 
fi

#if git is not installed, install it
if [ $(is_program_installed git) === 0]; then
  sudo yum install git -y
fi

#if docker is not installed, install it
if [ $(is_program_installed docker) === 0]; then
  sudo amazon-linux-extras install -y docker
  sudo systemctl start docker
  sudo docker run --name needapp-redis -p 6379:6379 --restart always --detach redis
fi

#if pm2 is not installed, install it
if [ $(is_program_installed pm2) === 0]; then
  npm install -g pm2
fi

cd /home/ec2-user

git clone -b develop https://github.com/ruyisbaros/advanced_mern_social_project.git

cd advanced_mern_social_project/backend
npm install
aws s3 sync s3://needsomething-env-files/develop .
unzip env-file.zip
cp .env.develop .env
npm run build 
npm start