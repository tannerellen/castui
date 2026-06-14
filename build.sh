#!/bin/bash
mkdir -p ./bin/linux ./bin/mac

bun build --compile --minify --bytecode --target=bun-linux-x64 ./index.js --outfile bin/linux/castui
bun build --compile --minify --bytecode --target=bun-darwin-arm64 ./index.js --outfile bin/mac/castui
