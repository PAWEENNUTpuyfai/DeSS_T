FROM golang:1.24 AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# STATIC BUILD (สำคัญมาก)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o main .

FROM scratch

WORKDIR /app
COPY --from=build /app/main .

EXPOSE 8080
ENTRYPOINT ["./main"]
