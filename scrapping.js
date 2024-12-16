import puppeteer from "puppeteer";
import fs, { link } from 'fs';
import { title } from "process";

const main = async () => {
    const browser = await puppeteer.launch({
        defaultViewport: null,
        headless: false
    })

    const page = await browser.newPage();

    const cookies = async () => {
        const jsonData = fs.readFileSync('fb_cookies.json');
        const cookies = JSON.parse(jsonData);
        await page.setCookie(...cookies);
    }
    await cookies();

    const selector = ".x1xfsgkm.xqmdsaz.x1cnzs8.x1mtsufr.x1w9j1nh > div > div > div > div ";

    const url = "https://www.facebook.com/marketplace/112205848794597/propertyrentals/?exact=false&latitude=41.6686&longitude=-72.7822&radius=10"

    await page.goto(url);
    await page.waitForSelector(selector);

     await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

    // await page.screenshot({
    //     path: `./scrapingbee_homepage.jpg`,
    //     fullPage: true
    // });

    let elements = await page.$$(selector);
    console.log(elements.length);

    let properties = [];

    for (const links of elements) {
        try {

            const link = await links.$eval("a", (e) => e.href);

            properties.push(link)
            console.log(properties.length);
            // console.log(link);

        } catch (error) {
            console.log(error);
        }
    }

    for (const elements of properties) {
        await page.goto(elements, {
            waitUntil: "networkidle2",
            timeout: 60000,
        });
        try {

            const select = ".x9f619.x1n2onr6.x1ja2u2z > div";
            const element = await page.waitForSelector(select);
            const loc_selector = '.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > .x1xmf6yo > div.xwib8y2'
            const desc_selector = '.x78zum5 > div.xod5an3 div.x1gslohp'
            const desc = await page.$eval(desc_selector, data => data.textContent.replaceAll('\n', ''));
            const items_location = await page.$$eval(loc_selector, data => data.map(data => data.textContent));

            const items = {
                image: await page.$eval('div > img', data => data.src),
                title: await page.$eval('div > div > h1 > span', data => data.textContent),
                price: await page.$eval('.x1anpbxc > span', data => data.textContent),
                item_locator: items_location,
                description: desc,
            }
            console.log(items);
        } catch (error) {
            console.log(error);
        }
    }
    // await browser.close();
}

main();