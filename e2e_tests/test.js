const puppeteer = require('puppeteer');

(async () => {
    let hasErrors = false;
    let consoleErrors = [];
    let networkErrors = [];

    const browser = await puppeteer.launch({ 
        executablePath: 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
        headless: 'new' 
    });
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
        }
    });

    page.on('requestfailed', request => {
        networkErrors.push(`Failed request: ${request.url()} - ${request.failure()?.errorText}`);
    });

    try {
        console.log("Navigating to Dashboard...");
        await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
        console.log("Dashboard loaded.");
        await page.waitForSelector('.dashboard-card', { timeout: 5000 }).catch(() => console.log('Warning: No dashboard cards found'));

        console.log("Navigating to View Flights...");
        await page.goto('http://localhost:5173/flights', { waitUntil: 'networkidle0' });
        console.log("View Flights loaded.");
        await page.waitForSelector('table', { timeout: 5000 }).catch(() => console.log('Warning: No table found on flights page'));

        console.log("Navigating to Add Flight...");
        await page.goto('http://localhost:5173/flights/add', { waitUntil: 'networkidle0' });
        console.log("Add Flight loaded.");
        await page.waitForSelector('form', { timeout: 5000 }).catch(() => console.log('Warning: No form found on add flight page'));

        console.log("Navigating to Live Monitoring...");
        await page.goto('http://localhost:5173/monitoring', { waitUntil: 'networkidle0' });
        console.log("Live Monitoring loaded.");
        await page.waitForSelector('.leaflet-container', { timeout: 10000 }).catch(() => console.log('Warning: No map found'));

        console.log("\n--- TEST REPORT ---");
        console.log("Console Errors/Warnings:");
        consoleErrors.forEach(e => console.log(e));
        
        console.log("\nNetwork Errors:");
        networkErrors.forEach(e => console.log(e));
        
        if(consoleErrors.length === 0 && networkErrors.length === 0) {
            console.log("\nAll pages navigated successfully with no errors.");
        }

    } catch (e) {
        console.error("Test execution failed:", e);
    } finally {
        await browser.close();
    }
})();
