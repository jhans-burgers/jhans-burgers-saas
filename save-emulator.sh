#!/usr/bin/env bash
set -e
firebase emulators:export ./.emulator-data --project jhans-burgers-admin
echo "✅ Emulator salvo em .emulator-data"
