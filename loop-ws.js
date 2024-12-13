import puppeteer from "puppeteer";
import fs from 'fs' ;

const main = async () => {
    const browser = await puppeteer.launch(
        {
            headless: false
        }
    );
    const page = await browser.newPage();

    const Cookies = async () => {
        const jsonData = fs.readFileSync('cookies.json');
        const cookies = JSON.parse(jsonData);
        await page.setCookie(...cookies);
    }
    Cookies()

    const selector = '#stream-panel > div > ol > li > div';

    await page.goto("https://www.nytimes.com/international/section/world/asia");
    let elements = await page.$$(selector);
    console.log(elements.length);

    let articles = []

    for (const link of elements) {
        const data = await link.$eval('div > article > a', e => e.href)
        articles.push(data)
    }
    for (const links of articles) {
        await page.goto(links, {
            waitUntil: "networkidle2",
            timeout: 60000,
        });

        try {
            const select = '#story > section > div > div'
            const element = await page.waitForSelector(select)
            const content = await element.evaluate(e => e.textContent)
            const title = await page.$eval('#story > header > div > h1', data=> data.textContent)
            const desc = await page.$eval('#story > header > p', data=> data.textContent)
            const author = await page.$eval('#story > header > div > div > div > p > span > a', data=> data.textContent)
            console.log({ Title:title, Description: desc, Author: author, Article: content });

        } catch (error) {
            console.log('Article not found')
        }

    }


    await browser.close();
    
}
main()