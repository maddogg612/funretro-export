const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { exit } = require('process');

const [url, extension] = process.argv.slice(2); 

if (!url) {
    throw 'Please provide a URL as the first argument.';
}

if (!extension) {
    throw 'Please provide an extension for the export file'
}

if (extension !== '.txt' && extension !== '.csv') {
   throw 'Please provide a proper extension: .txt or .csv'
}

//this generates the data
async function run() {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(url);
    await page.waitForSelector('.easy-card-list');

    const boardTitle = await page.$eval('.board-name', (node) => node.innerText.trim());

    if (!boardTitle) {
        throw 'Board title does not exist. Please check if provided URL is correct.'
    }

    let parsedText = boardTitle + '\n\n';

    const columns = await page.$$('.easy-card-list');
    console.table(columns);

    for (let i = 0; i < columns.length; i++) {
        const columnTitle = await columns[i].$eval('.column-header', (node) => node.innerText.trim());

        const messages = await columns[i].$$('.easy-board-front');
        if (messages.length) {
            parsedText += columnTitle + '\n';
        }
        for (let i = 0; i < messages.length; i++) {
            const messageText = await messages[i].$eval('.easy-card-main .easy-card-main-content .text', (node) => node.innerText.trim());
            const votes = await messages[i].$eval('.easy-card-votes-container .easy-badge-votes', (node) => node.innerText.trim());
            if (Number(votes) >0) {
            parsedText += `- ${messageText} (${votes})` + '\n';
            }
        }

        if (messages.length) {
            parsedText += '\n';
        }
    }

    return parsedText;
}


//function to write the new file that will save
function writeToFile(extension, data) {
    //console.log(data) //data is just the information being saved in the board
    //const resolvedPath = path.resolve(filePath || `../${data.split('\n')[0].replace('/', '')}.txt`);
    const resolvedPath = path.resolve(`../${data.split('\n')[0].replace('/', '').split(" ").join("")}${extension}`);
    fs.writeFile(resolvedPath, data, (error) => {
        if (error) {
            throw error;
        } else {
            console.log(`Successfully written to file at: ${resolvedPath}`);
        }
        process.exit();
    });
}

function handleError(error) {
    console.error(error);
}

run().then((data) => writeToFile(extension, data)).catch(handleError);