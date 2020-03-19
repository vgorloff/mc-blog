#!/bin/bash

SrcDirPath=$(cd "$(dirname "$0")/../"; pwd)
cd "$SrcDirPath"

yarn run dev-to-git || exit 1
