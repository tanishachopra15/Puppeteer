import puppeteer from "puppeteer";
import fs from 'fs';
import { parse } from 'json2csv';

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
    await page.evaluate(() => document.body.style.zoom = 0.1);

    let elements = await page.$$(selector);
    while (elements.length < 40) {
        console.log(`Current element count: ${elements.length}`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        elements = await page.$$(selector);
    }
    elements = elements.slice(0, 30);
    console.log(`Collected exactly 30 elements.`);


    let properties = [];

    for (const links of elements) {
        try {

            const link = await links.$eval("a", (e) => e.href);

            properties.push(link)
            console.log(properties.length);
            // console.log(link);

        } catch (error) {
            console.log(error);
            // continue;
        }
    }

    // properties = properties.slice(0, 10);

    let scrapped_data = [];

    for (const elements of properties) {
        await page.goto(elements, {
            waitUntil: "networkidle2",
            timeout: 60000,
        });
        try {

            const select = ".x9f619.x1n2onr6.x1ja2u2z > div";
            const element = await page.waitForSelector(select);
            // const items_location = loc_selector ? await page.$$eval(loc_selector, els => els.map(el => el.textContent.trim())
            // ) : null;
            const items_location = await page.evaluate(() => {
                const loc_selector = '.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > .x1xmf6yo > div.xwib8y2';
                const elements = document.querySelector(loc_selector);

                // Extract text content from each element and return as an array
                return elements ? Array.from(elements.children).map(el => el.textContent.trim()) : null;
            });

            console.log(items_location);

            const desc_selector = '.x78zum5 > div.xod5an3 div.x1gslohp';

            const seeMoreXPath =
                "//span[contains(text(),'See more')]";

            const seeMoreButton = await page.$(`xpath/${seeMoreXPath}`);
            if (seeMoreButton) {
                await seeMoreButton.click();
            }
            let desc = await page.$eval(desc_selector, (data) => data.textContent.replaceAll('\n', ''));
            desc = seeMoreButton ? desc.substring(0, desc.length - 9) : desc;

            const items = {
                image: await page.$eval('div > img', data => data.src),
                title: await page.$eval('div > div > h1 > span', data => data.textContent),
                price: await page.$eval('.x1anpbxc > span', data => data.textContent),
                location_info: items_location,
                description: desc,
                coordinates: await page.$eval('.x1lq5wgf.xgqcy7u.x30kzoy.x9jhf4c.x6ikm8r.x10wlt62.x1n2onr6 > div > div > div', data => {
                    const backgroundImage = getComputedStyle(data).getPropertyValue('background-image');
                    const url = backgroundImage.slice(5, -2);
                    const queryParams = new URL(url).searchParams;
                    const coords = queryParams.get('center');
                    return coords;
                }),
            }

            scrapped_data.push(items);
            console.log(items);
        } catch (error) {
            console.log(error);
            // continue;
        }
    }

    const fields = ["image", "title", "price", "location_info", "description", "coordinates"];

    try {
        const csv = parse(scrapped_data, { fields });
        fs.writeFileSync("scraped_data.csv", csv);
        console.log("Data saved to scraped_data.csv");
    } catch (error) {
        console.error("Error saving data to CSV:", error);
    }

    // await browser.close();

}

main();