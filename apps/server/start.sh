#!/bin/sh
set -e

echo "OpenSSL version:"
openssl version

echo "Looking for compiled entry..."

# Prefer top-level dist/index.js (old layout), fall back to dist/src/index.js (when rootDir changed)
if [ -f ./dist/index.js ]; then
	ENTRY=./dist/index.js
elif [ -f ./dist/src/index.js ]; then
	ENTRY=./dist/src/index.js
else
	echo "No compiled entry found. Building TypeScript..."
	npm run build || { echo "Build failed"; exit 1; }
	if [ -f ./dist/index.js ]; then
		ENTRY=./dist/index.js
	elif [ -f ./dist/src/index.js ]; then
		ENTRY=./dist/src/index.js
	else
		echo "Build did not produce an entry file. Exiting." >&2
		exit 1
	fi
fi

echo "Starting app via node $ENTRY"
exec node "$ENTRY"
