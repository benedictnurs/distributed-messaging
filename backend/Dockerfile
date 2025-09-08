# Use the official Golang image to build the app
FROM golang:1.20 as builder

# Set the working directory inside the container
WORKDIR /app

# Copy go.mod and go.sum files to the working directory
COPY go.mod go.sum ./

# Download all dependencies
RUN go mod download

# Copy the rest of the application code
COPY . .

# Build the application
RUN go build -o app

# Use Debian Bookworm (Debian 12) for the runtime image
FROM debian:bookworm-slim

# Set working directory
WORKDIR /app

# Copy the compiled Go binary from the builder stage
COPY --from=builder /app/app .

# Expose the port your application listens on
EXPOSE 443

# Command to run the application
CMD ["./app"]
