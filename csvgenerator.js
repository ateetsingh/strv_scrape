// const { parse } = require('json2csv');
import * as json2csv from 'json2csv';
const { parse } = json2csv.default;
import * as fs from 'fs';
import * as _ from 'lodash';

import * as config from './config.js';

function main() {
    const aggregatedDataJSON = fs.readFileSync(config.AGGREGATED_JSON_FILE_NAME, 'utf8');
    const csvString = jsonToCsv(aggregatedDataJSON);
    writeCsvContentToFile(csvString);
}

function jsonToCsv(jsonString) {
    let collection = JSON.parse(jsonString);
    collection = _.default.orderBy(collection, ['epoch'], ['desc']);
    const fields = collection.reduce(
        (accumulator, currValue) => _.default.union(accumulator, Object.keys(currValue)),
        []);
    return parse(collection, { fields });
}

function writeCsvContentToFile(csvString) {
    fs.writeFileSync(config.AGGREGATED_CSV_FILE_NAME, csvString);
    const now = Date.now();
    fs.copyFileSync(config.AGGREGATED_CSV_FILE_NAME, `${config.DATA_DIR}${config.AGGREGATED_CSV_FILE_PREFIX}_${now}${config.AGGREGATED_CSV_FILE_SUFFIX}`);
}

main();