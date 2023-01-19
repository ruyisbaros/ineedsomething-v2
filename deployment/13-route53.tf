#get already created hosted zone on aws route53
data "aws_route53_zone" "main_zone" {
  name         = var.main_api_server_domain
  private_zone = false
}