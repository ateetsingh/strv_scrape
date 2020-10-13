// const cron = require('node-cron');
import * as _cron from 'node-cron';
const cron = _cron.default;

cron.schedule('* * * * *', () => {
  console.log('running a task every minute');
});