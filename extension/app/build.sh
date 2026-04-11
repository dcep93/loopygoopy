#!/bin/bash

set -euo pipefail

(cd src/app && tsc)
PUBLIC_URL=/app/build/ yarn build
cd ../../
zip -r extension.zip extension -x "*/node_modules/*" -x "*/app/*/manifest.json"
