const path = require('path');
const fs = require('fs');

const file = process.argv[2];
const package = require(file);
const types = package['types'];

if (!types) return;

const typesPath = path.join(path.dirname(file), types);

if (fs.existsSync(typesPath)) console.log(`${typesPath} ✅`);
else console.log(`${typesPath} ❌`);
