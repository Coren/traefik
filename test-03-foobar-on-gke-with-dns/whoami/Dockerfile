# Step 1 : Build binary
FROM golang:alpine AS builder

# Install build dependencies
RUN apk update && apk add -q --no-cache gcc libc-dev bash openssl

# Copy & build 
# Build options:
#   CGO_ENABLED=0 GOOS=linux GOARCH=amd6 => static build for linux 64 bits
# ldflags:
#  -s strip debug information
#  -w strip DWARF information
# See https://pkg.go.dev/cmd/link for details
WORKDIR /go/src
COPY . .
RUN cd foobar-api ; \
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
  go build -a --trimpath --ldflags="-s -w" -o whoami
RUN  openssl req -x509 -nodes -newkey rsa:4096 -keyout key.pem -out cert.pem \
  -sha256 -days 365 -subj "/C=FR/ST=Nouvelle Aquitaine/L=BORDEAUX/O=Traefik/OU=Traefik Labs/CN=www.thisisatest.com"

# Step 2 : Put and run this binary into a small image
FROM scratch
WORKDIR /bin
COPY --from=builder /go/src/foobar-api/whoami /bin/whoami
COPY --from=builder /go/src/*.pem /cert/
# COPY *.pem /cert/
ENTRYPOINT ["/bin/whoami" ]
CMD [ "-name", "whoami", "-port", "443" ]
