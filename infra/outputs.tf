output "server_ip" {
  description = "Public IP address of the aggregation server"
  value       = aws_eip.aggregation_server.public_ip
}

output "server_url" {
  description = "HTTP API endpoint URL"
  value       = "http://${aws_eip.aggregation_server.public_ip}:${var.http_port}"
}

output "mqtt_broker" {
  description = "MQTT broker hostname"
  value       = aws_eip.aggregation_server.public_ip
}

output "mqtt_port" {
  description = "MQTT broker port"
  value       = var.mqtt_port
}

output "mqtt_ws_url" {
  description = "MQTT WebSocket URL for browser clients"
  value       = "ws://${aws_eip.aggregation_server.public_ip}:9001"
}

output "swarm_id" {
  description = "Swarm identifier"
  value       = var.swarm_id
}

output "ssh_command" {
  description = "SSH command to connect to server"
  value       = "ssh ubuntu@${aws_eip.aggregation_server.public_ip}"
}

output "instance_id" {
  description = "EC2 instance ID (for manual termination)"
  value       = aws_instance.aggregation_server.id
}
