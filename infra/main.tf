terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project_name
      SwarmID   = var.swarm_id
      ManagedBy = "terraform"
    }
  }
}

# Get latest Ubuntu 22.04 AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security group for the aggregation server
resource "aws_security_group" "aggregation_server" {
  name        = "${var.project_name}-${var.swarm_id}-sg"
  description = "Security group for swarm aggregation server"

  # SSH access
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  # MQTT broker
  ingress {
    description = "MQTT"
    from_port   = var.mqtt_port
    to_port     = var.mqtt_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # MQTT over WebSocket (for browser clients)
  ingress {
    description = "MQTT WebSocket"
    from_port   = 9001
    to_port     = 9001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP API
  ingress {
    description = "HTTP API"
    from_port   = var.http_port
    to_port     = var.http_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.swarm_id}-sg"
  }
}

# EC2 instance for aggregation server
resource "aws_instance" "aggregation_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.aggregation_server.id]

  user_data = templatefile("${path.module}/cloud_init.yaml", {
    swarm_id           = var.swarm_id
    mqtt_port          = var.mqtt_port
    http_port          = var.http_port
    auto_destroy_hours = var.auto_destroy_hours
  })

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.project_name}-${var.swarm_id}-server"
  }

  # Wait for cloud-init to complete
  provisioner "local-exec" {
    command = "echo 'Waiting for server to initialize...'"
  }
}

# Elastic IP for stable address
resource "aws_eip" "aggregation_server" {
  instance = aws_instance.aggregation_server.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-${var.swarm_id}-eip"
  }
}
