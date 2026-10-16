#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Each suite creates and removes its own nonexisting, explicitly bound database.
# Never deploy migrations into a caller-supplied existing database here.
npm run test:rental-api
npm run test:rental-browser
