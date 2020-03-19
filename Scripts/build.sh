#!/bin/bash

SrcDirPath=$(cd "$(dirname "$0")/../"; pwd)
cd "$SrcDirPath"

yarn run prettier:write || exit 1
yarn run embedme:write || exit 1
yarn run prettier:check || exit 1
yarn run embedme:check || exit 1
