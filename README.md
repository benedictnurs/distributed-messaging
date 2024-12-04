
# Distributed Messaging Platform

This project is a distributed messaging platform designed for real-time, low-latency communication. It leverages Go and WebSockets for backend functionality and is deployed using Docker on AWS EC2. The platform has been rigorously tested to ensure scalability and reliability, handling high concurrency and load scenarios.

## How It Works

- **WebSocket Connections:** Real-time messaging with persistent WebSocket connections for low-latency communication.
- **Load Balancing:** AWS EC2 with provisions for auto-scaling to manage dynamic loads effectively.
- **Testing:** System resilience validated with k6, simulating 500+ messages per second under load conditions.
- **Containerization:** Deployed as a containerized application using Docker, simplifying deployment and scaling processes.

---

## Getting Started

### Prerequisites

- Docker
- Go (version 1.20 or later)
- AWS EC2 instance
- Postman or similar tools for API testing

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-repo/distributed-messaging-platform.git
cd distributed-messaging-platform
```

2. Build and run the Docker container:

```bash
docker-compose up --build
```

3. Access the platform at `http://<your-ec2-public-ip>:8080`.

4. Test WebSocket functionality using tools like Postman or a WebSocket client.

---

## Features

- **Real-Time Communication:** Leveraging Go and WebSockets for low-latency messaging.
- **Scalable Architecture:** Horizontally scalable backend instances with AWS EC2.
- **Robust Testing:** Load-tested to handle 500+ messages per second.
- **Easy Deployment:** Containerized using Docker for seamless deployment.

---

## Endpoints

### `/create-room`
- **Method:** `POST`
- **Description:** Create a new chat room.
- **Response:** Returns a unique room ID.

### `/ws?roomID=<roomID>&username=<username>`
- **Method:** `WebSocket`
- **Description:** Connect to a chat room using WebSocket.

### `/room-exists?roomID=<roomID>`
- **Method:** `GET`
- **Description:** Check if a chat room exists.
- **Response:** JSON object indicating existence.

---

## Tools & Technologies

### Backend
- [Go](https://golang.org/) – High-performance programming language.
- [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) – Full-duplex communication protocol.

### Deployment
- [Docker](https://www.docker.com/) – Containerization platform.
- [AWS EC2](https://aws.amazon.com/ec2/) – Scalable cloud compute service.

### Testing
- [k6](https://k6.io/) – Load testing tool to validate system resilience.

---

## Future Enhancements

- **State Synchronization Across Nodes:** Improve multi-instance communication for distributed deployments.
- **Enhanced Monitoring:** Integrate tools for real-time monitoring and alerting.

---

## Author

Created by [Benedict Nursalim](https://www.linkedin.com/in/benedict-nursalim/).
