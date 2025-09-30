import fs from 'fs';

const content = fs.readFileSync('client/src/pages/dashboard.tsx', 'utf-8');
const lines = content.split('\n');

let stack = [];
let divCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  // Check for opening div tags
  const openDivMatches = line.match(/<div(?:\s|>)/g);
  if (openDivMatches) {
    openDivMatches.forEach(() => {
      divCount++;
      stack.push({ tag: 'div', line: lineNum, text: line.trim() });
    });
  }
  
  // Check for closing div tags
  const closeDivMatches = line.match(/<\/div>/g);
  if (closeDivMatches) {
    closeDivMatches.forEach(() => {
      divCount--;
      if (stack.length > 0 && stack[stack.length - 1].tag === 'div') {
        stack.pop();
      }
    });
  }
}

console.log('Final div count:', divCount);
console.log('Remaining unclosed tags:');
stack.forEach(item => {
  console.log(`  Line ${item.line}: ${item.text.substring(0, 80)}...`);
});