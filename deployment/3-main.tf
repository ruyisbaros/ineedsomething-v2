terraform {
  backend "s3" {
    bucket  = "needsomething-terraform"
    key     = "develop/needssomething.tfstate"
    region  = "eu-central-1"
    encrypt = true
  }
}

locals {
  prefix = "${var.prefix}-${terraform.workspace}"
  common_tags = {
    Environment = terraform.workspace
    Project     = var.project
    ManagedBy   = "Terraform"
    Owner       = "Ahmet Erdonmez"
  }
}