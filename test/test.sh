#!/bin/sh

../cli.js --format dollar-handlebars --project example-project --config dev ./data ./data2
head -n 10 ./data2/test-template.txt
rm -rf ./data2
