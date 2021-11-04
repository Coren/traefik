.PHONY: default build check

default: test build

build:
	CGO_ENABLED=0 go build -a --trimpath --installsuffix cgo --ldflags="-s" -o whoami

test:
	go test -v -cover ./...

check:
	/bin/golangci-lint run

clean:
	rm -f whoami
