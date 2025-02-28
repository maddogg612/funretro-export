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

let outputFormat = ['.txt','.csv']

if (!outputFormat.includes(extension)) {
   throw `Please provide a proper extension: ${outputFormat}`
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

    let parsedText = "";


    const columns = await page.$$('.easy-card-list');
    const columnTitleArray = []
    const messagesObject = {}
    let maxLength = 0

    //populates columnTitleArray and messagesObject
    for (let i = 0; i < columns.length; i++) {
        const columnTitle = await columns[i].$eval('.column-header', (node) => node.innerText.trim());
        columnTitleArray.push(columnTitle)
        messagesObject[columnTitle] = []

        const messages = await columns[i].$$('.easy-board-front');
       
        for (let i = 0; i < messages.length; i++) {
            const messageText = await messages[i].$eval('.easy-card-main .easy-card-main-content .text', (node) => node.innerText.trim());
            const votes = await messages[i].$eval('.easy-card-votes-container .easy-badge-votes', (node) => node.innerText.trim());

            if (Number(votes) >0) {
                messagesObject[columnTitle].push([`${messageText} (${votes})`])
                maxLength = Math.max(maxLength, messagesObject[columnTitle].length)
            }
        }

    }

    //adds column Titles into parseText
    for (let i = 0; i < columnTitleArray.length; i++) {
        parsedText += columnTitleArray[i]
        if (i === columnTitleArray.length - 1) {
            parsedText += "\n"
        } else {
            parsedText += ','
        }
    }

    //divides message into columns and add to parseText
    for (let i = 0; i < maxLength; i++) {
        for (let j = 0; j < columnTitleArray.length; j++) {

            if (!messagesObject[columnTitleArray[j]][i]) {
                parsedText += ""
            } else {
                parsedText += messagesObject[columnTitleArray[j]][i]
            }
            
            if (j === columnTitleArray.length - 1) {
                parsedText += "\n"
            } else {
                parsedText += ','
            }
        }
    }

    return [boardTitle ,parsedText];
}




//function to write the new file that will save to your computer
function writeToFile(extension, data) {
    const resolvedPath = path.resolve(`../${data[0].split(" ").join("")}${extension}`);
    fs.writeFile(resolvedPath, data[1], (error) => {
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
    process.exit();
}

run().then((data) => writeToFile(extension, data)).catch(handleError);