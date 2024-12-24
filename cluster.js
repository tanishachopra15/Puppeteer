import { Cluster } from 'puppeteer-cluster';
import fs from 'fs';
import { parse } from 'json2csv';

(async () => {

    const urls = 'https://www.facebook.com/marketplace/112205848794597/propertyrentals?exact=false&latitude=41.6687&longitude=-72.7825&radius=10'

    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        timeout: 120000,
        maxConcurrency: 30,
        puppeteerOptions: {
            headless: false,
            defaultViewport: false,
        },
    });

    const cookies = async (page) => {
        const jsonData = fs.readFileSync('fb_cookies.json');
        const cookies = JSON.parse(jsonData);
        await page.setCookie(...cookies);
        // const allCookies = await page.cookies();
        // console.log('Cookies applied:', allCookies);
    };

    const selector = ".x1xfsgkm.xqmdsaz.x1cnzs8.x1mtsufr.x1w9j1nh > div > div > div > div ";
    let properties = [];


    await cluster.queue(async ({ page }) => {

        await cookies(page);
        await page.goto(urls);
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
    }
    );

    await cluster.idle();

    console.log(`Collected ${properties.length} property links.`);

    let scrapped_data = [];

    await cluster.task(async ({ page, data: url }) => {

        await cookies(page);
        await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: 120000,
        });
        try {
            const select = ".x9f619.x1n2onr6.x1ja2u2z > div";
            // const element = await page.waitForSelector(select);
            const items_location = await page.evaluate(() => {
                const locSelector = '.x78zum5.xdt5ytf.x1iyjqo2.x1n2onr6 > .x1xmf6yo > div.xwib8y2';
                const elements = document.querySelectorAll(locSelector);

                return Array.from(elements).map(element => {
                    const location = element.children[0]?.textContent?.trim() || null;
                    const sq_feet = element.textContent.includes('feet') ? element.children[1]?.textContent?.trim() : null;
                    const pet_friendly = element.textContent.includes('friendly');
                    const listed_on = element.lastElementChild.textContent?.trim().split('·')[0];
                    const available_on = element.lastElementChild?.textContent?.trim().split('·')[1] || null;
                    return {
                        location: location,
                        sq_feet: sq_feet,
                        pet_friendly: pet_friendly,
                        listed_on: listed_on,
                        available_on: available_on
                    };
                });
            });

            page.keyboard.down("Shift")
            page.keyboard.press("Tab")
            page.keyboard.up("Shift")
            page.keyboard.press("Enter")

            const desc_selector = '.x78zum5 > div.xod5an3 div.x1gslohp';
            const seeMoreXPath =
                "//span[contains(text(),'See more')]/parent::div";

            const seeMoreButton = await page.$(`xpath/${seeMoreXPath}`);
            if (seeMoreButton) {
                await page.evaluate((e) => {
                    e.click()
                  }, seeMoreButton);
                // await seeMoreButton.click();
            }

            await page.waitForSelector(desc_selector, {
                timeout: 1200000
            });
            let desc = await page.$eval(desc_selector, (data) => data.textContent.replace(/\n/g, ''));
            const description = seeMoreButton ? desc.substring(0, desc.length - 9) : desc;

            const items = {
                image: await page.$eval('div > img', data => data.src),
                title: await page.$eval('div > div > h1 > span', data => data.textContent),
                price: await page.$eval('.x1anpbxc > span', data => data.textContent),
                location_info: items_location,
                description: description ? description : null,
                coordinates: await page.$eval('.x1lq5wgf.xgqcy7u.x30kzoy.x9jhf4c.x6ikm8r.x10wlt62.x1n2onr6 > div > div > div', data => {
                    const backgroundImage = getComputedStyle(data).getPropertyValue('background-image');
                    const url = backgroundImage.slice(5, -2);
                    const queryParams = new URL(url).searchParams;
                    const coords = queryParams.get('center');
                    return coords;
                }),
            }
            scrapped_data.push(items);
            console.log("For url", page.url(), " item is \n", items);
        } catch (error) {
            // console.log(error);
            console.log("Error in scraping data for url:", page.url(), error);
            // continue;

        }

    });

    cluster.on('taskerror', (err, data, willRetry) => {
        if (willRetry) {
            console.warn(`Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`);
        } else {
            console.error(`Failed to crawl ${data}: ${err.message}`);
        }
    });

    for (const link of properties) {
        await cluster.queue(link);
    }

    const fields = ["image", "title", "price", "location_info", "description", "coordinates"];

    await cluster.idle();

    try {
        const csv = parse(scrapped_data, { fields });
        fs.writeFileSync("scraped_data.csv", csv);
        console.log("Data saved to scraped_data.csv");
    } catch (error) {
        console.error("Error saving data to CSV:", error);
    }

    await cluster.close();

})();


