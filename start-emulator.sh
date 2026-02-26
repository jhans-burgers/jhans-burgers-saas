#!/usr/bin/env bash
set -e
mkdir -p .emulator-data
firebase emulators:start --project jhans-burgers-admin --import=./.emulator-data --export-on-exit=./.emulator-data
