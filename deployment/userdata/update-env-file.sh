#/bin/bash
aws s3 sync s3://needsomething-env-files/staging .
unzip env-file.zip
cp .env.staging .env
rm .env.staging
sed -i -e "s|\(^^REDIS_HOST=\).*|REDIS_HOST=redis://$ELASTICACHE_ENDPOINT:6379|g" .env
rm -rf env-file.zip
cp .env .env.staging
tar -a -c -f env-file.zip .env.staging
aws --region eu-central-1 s3 cp env-file.zip s3://needsomething-env-files/staging/
rm -rf .env*
rm env-file.zip
