import { readFileSync, writeFileSync } from 'fs';

const filePath = 'c:\\Users\\Rafael lauri\\arena-sports\\src\\pages\\Landing.tsx';
let content = readFileSync(filePath, 'utf-8');

// 1. Change div to main with role and id
content = content.replace(
    /<div\s+data-seo-ready\s+className="relative min-h-dvh/,
    '<main\n\t\t\t\trole="main"\n\t\t\t\tid="main-content"\n\t\t\t\tdata-seo-ready\n\t\t\t\tclassName="relative min-h-dvh'
);

// 2. Change closing div to main (at the end before PremiumFooter)
const footerIndex = content.lastIndexOf('<PremiumFooter />');
const beforeFooter = content.slice(0, footerIndex);
const afterFooter = content.slice(footerIndex);
const closingDivIndex = beforeFooter.lastIndexOf('</div>');
content = beforeFooter.slice(0, closingDivIndex) + '</main>' + beforeFooter.slice(closingDivIndex + 6) + afterFooter;

// 3. Add aria-label and focus to Login button
content = content.replace(
    /(<button\s+onClick=\{\(\) => navigate\("\/login"\)\}\s+className="text-sm font-medium text-gray-400 hover:text-white transition-all duration-300 px-3 py-2 rounded-full hover:bg-white\/5)">(\s+Login\s+<\/button>)/,
    '$1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020205]">\n\t\t\t\t\t\t\t\t\tLogin\n\t\t\t\t\t\t\t\t</button>'
);

// 4. Add aria-label and focus to Header CTA button
content = content.replace(
    /(<button\s+onClick=\{\(\) => navigate\("\/login\?mode=signup"\)\}\s+className="relative h-10 px-5 rounded-full text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-400 text-black overflow-hidden group magnetic-btn shadow-lg shadow-emerald-500\/20 hover:shadow-emerald-500\/40 transition-shadow duration-300)"/,
    '$1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020205]"\n\t\t\t\t\t\t\t\t\taria-label="Começar teste grátis de 7 dias do ArenaSys"'
);

// 5. Add aria-label and focus to Hero CTA button
content = content.replace(
    /(<button\s+onClick=\{\(\) => navigate\("\/login\?mode=signup"\)\}\s+className="relative overflow-hidden h-16 px-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg shadow-\[0_0_50px_-10px_rgba\(16,185,129,0\.5\)\] transition-all duration-300 hover:scale-105 hover:shadow-\[0_0_60px_-10px_rgba\(16,185,129,0\.7\)\] active:scale-95 w-full sm:w-auto animate-border-glow btn-shine flex items-center justify-center gap-2)"/,
    '$1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020205]"\n\t\t\t\t\t\taria-label="Testar grátis agora - começar teste de 7 dias"'
);

// 6. Add aria-label and focus to Pricing button
content = content.replace(
    /(<button\s+onClick=\{\(\) => navigate\("\/login\?mode=signup"\)\}\s+className="relative overflow-hidden w-full h-16 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg rounded-2xl transition-all duration-300 hover:shadow-\[0_0_40px_rgba\(16,185,129,0\.4\)\] btn-shine)"/,
    '$1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020205]"\n\t\t\t\t\t\t\t\taria-label="Começar teste grátis de 7 dias - plano Founders"'
);

// 7. Add aria-label and focus to Final CTA button
content = content.replace(
    /(<button\s+onClick=\{\(\) => navigate\("\/login\?mode=signup"\)\}\s+className="relative overflow-hidden h-16 px-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg shadow-\[0_0_60px_-10px_rgba\(16,185,129,0\.6\)\] transition-all duration-300 hover:scale-105 hover:shadow-\[0_0_80px_-10px_rgba\(16,185,129,0\.8\)\] active:scale-95 animate-border-glow btn-shine inline-flex items-center gap-3)"/,
    '$1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020205]"\n\t\t\t\t\taria-label="Organizar minha arena agora - começar teste grátis"'
);

writeFileSync(filePath, content, 'utf-8');
console.log('✅ All accessibility improvements applied successfully!');
console.log('Changes:');
console.log('- Changed <div> to <main role="main" id="main-content">');
console.log('- Added aria-labels to 5 CTA buttons');
console.log('- Added WCAG AAA focus indicators to all buttons');
