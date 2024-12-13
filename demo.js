import puppeteer from "puppeteer";

const main = async () => {
    const browser = await puppeteer.launch(
        {
            headless: false
        }
    );
    const page = await browser.newPage();

    const selector = '#stream-panel > div > ol > li > div';

    await page.goto("https://www.nytimes.com/international/section/world/asia");
    await page.waitForSelector(selector)


    let elements = await page.$$(selector);
    console.log(elements.length);

    for (const element of elements) {
        const items = {
            title: await element.$eval("article > a > h3", (e) => e.textContent),
            date: await element.$eval("div > span[data-testid=todays-date]", (e) => e.textContent),
            link: await element.$eval("article > a", (e) => e.href),
            // image: (await element.$eval("article > div > figure > div > img ", (e) => e.src)).replace("quality=75","quality=100"),
        }
        console.log(items);
    }
    
}
main()