import fs from 'fs';
// @ts-ignore
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('dom_dump.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

function getDetails(el) {
    return {
        tag: el.tagName,
        classes: el.className,
        text: el.textContent.trim().substring(0, 30),
        ariaLabel: el.getAttribute('aria-label'),
        role: el.getAttribute('role'),
        id: el.id
    };
}

console.log("Listing all buttons and role=button elements:");
const buttons = document.querySelectorAll('button, [role="button"]');
buttons.forEach((btn, i) => {
    const details = getDetails(btn);
    if (details.ariaLabel || details.text) {
         console.log(`${i}:`, details);
    }
});

console.log("\nListing all SVGs with labels:");
const svgs = document.querySelectorAll('svg');
svgs.forEach((svg, i) => {
    const label = svg.getAttribute('aria-label');
    if (label) {
        console.log(`SVG ${i}: label="${label}"`);
    }
});
