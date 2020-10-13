import * as fs from 'fs';
import * as _ from 'lodash';

import * as config from './config.js';

function getPreviousAggregatedData() {
    if (fs.existsSync(config.AGGREGATED_JSON_FILE_NAME)) {
        return JSON.parse(fs.readFileSync(config.AGGREGATED_JSON_FILE_NAME, 'utf8')); 
    } else {
        return [];
    }
}

function aggregate() {
    const jsonFileNames = fs.readdirSync(config.DATA_DIR).filter(
        fileName => fileName.startsWith(`${config.AGGREGATED_JSON_FILE_PREFIX}_`) && fileName.endsWith(config.AGGREGATED_JSON_FILE_SUFFIX)
    );  // returns only filename (not relative/absolute path)

    let aggregatedData = getPreviousAggregatedData();
    for (const jsonFileName of jsonFileNames) {
        const snapshot = JSON.parse(fs.readFileSync(`${config.DATA_DIR}${jsonFileName}`, 'utf8'));
        aggregatedData = [...aggregatedData, ...snapshot];
        aggregatedData = _.default.uniqBy(aggregatedData, 'id');
    }
    return aggregatedData;
}

function writeAggregatedDataToFile(aggregatedData) {
    const aggregatedDataJSONString = JSON.stringify(aggregatedData);
    fs.writeFileSync(config.AGGREGATED_JSON_FILE_NAME, aggregatedDataJSONString);
    const now = Date.now();
    fs.copyFileSync(config.AGGREGATED_JSON_FILE_NAME, `${config.DATA_DIR}${config.AGGREGATED_JSON_FILE_PREFIX}_${now}${config.AGGREGATED_JSON_FILE_SUFFIX}`);
}

function main() {
    const aggregatedData = aggregate();
    writeAggregatedDataToFile(aggregatedData);
}

main();