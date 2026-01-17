variable "project_name" {
  description = "Name of the swarm project"
  type        = string
  default     = "swarm-architect"
}

variable "swarm_id" {
  description = "Unique identifier for this swarm deployment"
  type        = string
}

variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "mqtt_port" {
  description = "MQTT broker port"
  type        = number
  default     = 1883
}

variable "http_port" {
  description = "HTTP API port"
  type        = number
  default     = 8080
}

variable "ssh_allowed_cidr" {
  description = "CIDR block allowed for SSH access (set to your IP for security)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "auto_destroy_hours" {
  description = "Auto-terminate instance after this many hours (0 to disable)"
  type        = number
  default     = 2
}
