#!/bin/bash

cd src/app && tsc
PUBLIC_URL=/app/build/ yarn build
# zip -r extension.zip extension -x "*/node_modules/*"
