#!/usr/bin/env sh
set -e

host="${MYSQL_HOST:-mysql}"
port="${MYSQL_PORT:-3306}"

until nc -z "$host" "$port"; do
  echo "Waiting for MySQL at $host:$port..."
  sleep 2
done

echo "MySQL is ready."

