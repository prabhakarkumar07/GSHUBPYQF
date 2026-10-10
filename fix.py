import os
import re

# Fix revenue
revenue_path = 'src/app/admin/revenue/page.tsx'
with open(revenue_path, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix the broken backticks in stat and bar
c = re.sub(r'className=\{ounded-2xl p-4 \}', 'className={ounded-2xl p-4 }', c)
c = re.sub(r'className=\{\s+ext-xs font-medium uppercase tracking-wide \}', 'className={	ext-xs font-medium uppercase tracking-wide }', c)
c = re.sub(r'className=\{mt-1 font-display text-2xl font-bold \}', 'className={mt-1 font-display text-2xl font-bold }', c)
c = re.sub(r'className=\{mt-0\.5 text-xs \}', 'className={mt-0.5 text-xs }', c)

with open(revenue_path, 'w', encoding='utf-8') as f:
    f.write(c)


# Fix QuizBuilder
quiz_path = 'src/app/practice/QuizBuilder.tsx'
with open(quiz_path, 'r', encoding='utf-8') as f:
    q = f.read()

q = re.sub(r'className=\{isLocked \? ".*?" : examIds\.includes\(ex\.id\) \? ".*?" : ".*?"\}', 'className={isLocked ? "chip border-gold/60 bg-gold-50 text-gold-700" : examIds.includes(ex.id) ? "chip-on" : "chip-off"}', q)

with open(quiz_path, 'w', encoding='utf-8') as f:
    f.write(q)

print("Fixed")
