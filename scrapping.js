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

    //  await page.evaluate(() => {
    //     window.scrollTo(0, document.body.scrollHeight);
    //   });

    // await page.screenshot({
    //     path: `./scrapingbee_homepage.jpg`,
    //     fullPage: true
    // });

    // const element = await page.$(selector);

    // if (element) {
    //     // Take a screenshot of the specific element
    //     await element.screenshot({
    //         path: `./specific-element.png`
    //     });
    //     console.log('Screenshot of the selector saved as specific-element.png');
    // } else {
    //     console.log('Element not found');
    // }

    let elements = await page.$$(selector);
    console.log(elements.length);

    let properties = [];

    for (const links of elements) {
        try {

            const link = await links.$eval("a", (e) => e.href);

            properties.push(link)
            console.log(properties.length);
            console.log(link);

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
            const items = {
                image: await page.$eval('div > img', data => data.src),
                title: await page.$eval('div > div > h1 > span', data => data.textContent),
                price: await page.$eval('.x1anpbxc > span', data => data.textContent),
                location: await page.$eval('.xjyslct.xjbqb8w.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1rg5ohu.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.x16tdsg8.xh8yej3 > div', data => data.textContent),
                // listed_on: await page.$eval('.x1xmf6yo div:nth-of-type(2) .x9f619 span.xo1l8bm6', data => data.textContent),
                // description: await page.$eval('.x78zum5 > div.xwib8y2 div:nth-of-type(2) .x9f619 span', data => data.textContent), 
                description: await page.$eval('.x78zum5 > div.xwib8y2 div:nth-of-type(2) .x9f619 span', data => data.textContent), 
            }
            console.log(items);
        } catch (error) {
            console.log(error);
        }
    }
    // await browser.close();
}

main();