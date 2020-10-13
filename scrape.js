import * as puppeteer from 'puppeteer';
import * as jsdom from 'jsdom';
const { JSDOM } = jsdom.default;
import * as fs from 'fs';
import * as config from './config.js';

const SCROLL_INTERVAL = 8000; // milliseconds

const TI_CLUB_ID = 746471;
const CURRENT_CLUB_ID = TI_CLUB_ID;
const MANUAL_AUTH_WAIT_TIME = 300000; // milliseconds - 300 secs ( 5 mins )

const ICON_CLASS_TO_ACTIVITY_TYPE_MAP = {
    'icon-ride': 'Ride',
    'icon-workout': 'Workout',
    'icon-run': 'Run',
    'icon-walk': 'Walk',
    'icon-yoga': 'Yoga',
    'icon-weighttraining': 'Weight Training',
};

(async () => {
    console.log('Automation started');
    const RECENT_ACTIVITY_URL = `https://www.strava.com/clubs/${CURRENT_CLUB_ID}/recent_activity`;

    const browser = await puppeteer.default.launch({ headless: false, slowMo: 500, timeout: 120000 });
    const page = await browser.newPage();
    page.setDefaultTimeout = 120000;
    page.setDefaultNavigationTimeout = 120000;
    await page.goto('https://www.strava.com/');
    console.log('Waiting');
    await page.waitForSelector('div#dashboard-feed', { timeout: MANUAL_AUTH_WAIT_TIME });

    const navigate = () => {
        await page.goto(RECENT_ACTIVITY_URL, { waitUntil: "domcontentloaded" });
        console.log('Reached activity page');
        await autoScroll(page);
        console.log('Scroll to bottom complete');
        //const activities = await scrape(page);
        const pageContent = await page.content();
        const dom = new JSDOM(pageContent);
        const activities = scrape(dom);
        console.log('Scrape complete');
        console.log('Activities=', activities);
        writeActivitiesToJson(activities);
        console.log('JSON snapshot file created');
    };
    navigate(); // run immediately the first time, & then set the interval
    setInterval(() => navigate, config.SCRAPE_INTERVAL_MS);
})();

function writeActivitiesToJson(activities) {
    const now = Date.now();
    const activitesJSONString = JSON.stringify(activities);
    const filename = `${config.DATA_DIR}${config.SNAPSHOT_JSON_FILE_PREFIX}_${now}${config.SNAPSHOT_JSON_FILE_SUFFIX}`;
    fs.writeFileSync(filename, activitesJSONString);
}

function scrape(dom) {
    console.info("Starting scrape..");
    let activities = [];
    let activityContainers = dom.window.document.querySelectorAll("div.activity");
    const now = Date.now().toString();
    if (activityContainers) {
        for (let activity of activityContainers) {
            let activityData = {}
            let athleteEntry = activity.querySelector("a.entry-athlete");
            if (athleteEntry) {
                activityData['athlete'] = athleteEntry.textContent;
                const activityDateTime = new Date(activity.querySelector("time").getAttribute("datetime"));
                activityData['datetime'] = activityDateTime.toString();
                activityData['epoch'] = activityDateTime.getTime().toString();
                activityData['activityTitle'] = activity.querySelector(".activity-title").textContent;
                let activityIcon = activity.querySelector(".activity-title span.app-icon");
                activityData['activityType'] = getActivityTypeFromIconClasses(Array.from(activityIcon.classList));
                let statList = activity.querySelector("ul.inline-stats");
                for (let stat of ['Distance', 'Elev Gain', 'Time', 'Pace', 'Avg HR', 'Achievements']) {
                    let statElement = statList.querySelector(`li[title='${stat}']`);
                    if (statElement && statElement.textContent) {
                        activityData[stat] = statElement.textContent;
                    }
                }
                Object.keys(activityData).map((key, index) => {
                    activityData[key] = activityData[key].trim();
                    activityData[key] = activityData[key].replace(/\n|\r/g, "");
                });
                activityData['id'] = activityData['athlete'] + '_' + activityData['datetime'];
                activityData['data_fetched_on'] = now;
                activities.push(activityData);
            } else {
                console.warning("No more athlete entries found - i.e. elements matching selector - div.activity");
            }
        }
    } else {
        console.warning("No activityContainers found - i.e. elements matching selector - a.entry-athlete");
    }
    return activities;
}


async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            const SCROLL_INTERVAL = 5000;
            let unsuccessfulScrollCount = 5;
            let scrollHeight = 0;

            const interval = setInterval(() => {
                console.log(`scrollHeight=${scrollHeight}  unsuccessfulScrollCount=${unsuccessfulScrollCount}`);
                if (unsuccessfulScrollCount > 0) {
                    if (document.body.scrollHeight > scrollHeight) {
                        scrollHeight = document.body.scrollHeight;
                        window.scrollTo(0, scrollHeight);
                    } else {
                        unsuccessfulScrollCount--;
                    }
                } else {
                    clearInterval(interval);
                    resolve();
                }
            }, SCROLL_INTERVAL);
        });
    });
}

function getActivityTypeFromIconClasses(classList) {
    for (let className of classList) {
        let activityType = ICON_CLASS_TO_ACTIVITY_TYPE_MAP[className];
        if (activityType) {
            return activityType;
        }
    }
    return 'Unknown'
}