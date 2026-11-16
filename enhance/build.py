#!/usr/bin/env python3
"""Build an enhanced bilingual mock-quiz page.
usage: python3 enhance/build.py <test> <module>
needs: practice_test_T_module_M_data.json, enhance/tTmM_items.json, tTmM_sents.json,
       tTmM_strings.json, zh_sents_tTmM_*.json, zh_opts_tTmM_*.json, vocab_tTmM.json, orig_tTmM.json
"""
import json, re, sys, glob, html
sys.path.insert(0, 'enhance')
from sentences import sents as split_sents

T, M = sys.argv[1], sys.argv[2]
tag = f't{T}m{M}'
data = json.load(open(f'practice_test_{T}_module_{M}_data.json'))
I = json.load(open(f'enhance/{tag}_items.json'))
items, pref = I['items'], I['pref']
sents_list = json.load(open(f'enhance/{tag}_sents.json'))
strings_list = json.load(open(f'enhance/{tag}_strings.json'))
zh_s = {}
for f in sorted(glob.glob(f'enhance/zh_sents_{tag}_*.json')): zh_s.update(json.load(open(f)))
zh_o = {}
for f in sorted(glob.glob(f'enhance/zh_opts_{tag}_*.json')): zh_o.update(json.load(open(f)))
vocab = json.load(open(f'enhance/vocab_{tag}.json'))
orig = json.load(open(f'enhance/orig_{tag}.json'))
SENT_ZH = {s: zh_s.get(str(i), '') for i, s in enumerate(sents_list)}
STR_ZH = {s: zh_o.get(str(i), '') for i, s in enumerate(strings_list)}

missing = []
def zh_sentence(s):
    s2 = s.strip()
    if s2 in SENT_ZH and SENT_ZH[s2]: return SENT_ZH[s2]
    if s2 in STR_ZH and STR_ZH[s2]: return STR_ZH[s2]
    missing.append(s2); return ''

def zh_body(body, filler_key):
    parts = []
    if filler_key: parts.append(zh_sentence(pref[filler_key]))
    for para in split_sents(body):
        parts.append(''.join(zh_sentence(s) for s in para))
    return '\n'.join(p for p in parts if p)

def zh_opt(o):
    if o in STR_ZH and STR_ZH[o]: return STR_ZH[o]
    if o in SENT_ZH and SENT_ZH[o]: return SENT_ZH[o]
    missing.append(o); return ''

STOP = set('''about above after again against almost already also although always among another anyone anything around because become becomes became before began begin behind being believe believed below beside besides between beyond called cannot certain change changed comes could course describe described describes different during either enough every example except family finally following former further having himself herself however include included includes including instead itself little making many might moment nearly nothing often others otherwise people perhaps possible present rather really recently several should simply something sometimes still students study their there therefore these things though through toward towards under until usually various whether which while within without would years young public report research researchers scientists however later early later great little large small whole other another across along toward where whose'''.split())

def pick_words(text, n=4):
    seen, cands = set(), []
    for m in re.finditer(r"[A-Za-z][a-z]+(?:-[a-z]+)?", text):
        w = m.group(0)
        if w[0].isupper() or '_' in w: continue
        lw = w.lower()
        if lw in STOP or lw in seen or len(lw) < 7: continue
        seen.add(lw); cands.append(lw)
    cands.sort(key=len, reverse=True)
    out = cands[:n]
    if len(out) < 3:  # relax
        for m in re.finditer(r"[a-z]{5,}", text):
            lw = m.group(0)
            if lw not in out and lw not in STOP: out.append(lw)
            if len(out) >= 3: break
    return out

def link_words(text):
    esc = html.escape(text)
    for w in pick_words(text):
        pat = re.compile(r'(?<![A-Za-z>])(' + re.escape(w) + r')(?![A-Za-z])', re.I)
        esc = pat.sub(lambda m: f'<a class="dict" href="https://dictionary.cambridge.org/search/english-chinese-traditional/direct/?q={w}" target="_blank" rel="noopener" title="Cambridge 英漢（繁體）字典">{m.group(1)}</a>', esc, count=1)
    return esc.replace('\n', '<br>')

Q = []
for q in data:
    n = q['n']; is_vocab = q['concept'].startswith('Words in Context')
    def build(key, text, answer, expl, expl_zh, label):
        it = items[key]
        body_en = (pref[it['filler']] if it['filler'] else '') + it['body']
        ent = {
            'id': key, 'label': label, 'n': n, 'concept': q['concept'], 'vocab': is_vocab,
            'body': link_words(body_en), 'bodyPlain': body_en,
            'stem': it['stem'] or '', 'stemZh': zh_opt(it['stem']) if it['stem'] else '',
            'bodyZh': zh_body(it['body'], it['filler']),
            'opts': it['opts'], 'optsZh': {k: zh_opt(v) for k, v in it['opts'].items()},
            'answer': answer, 'expl': expl, 'explZh': expl_zh,
        }
        ul = key.startswith('o') and orig[str(n)].get('underline')
        if ul:
            ent['body'] = re.sub(r'(' + re.escape(html.escape(ul)) + r'.*?[.!?])(?=\s|<br>|$)', r'<u>\1</u>', ent['body'], count=1, flags=re.S)
        if is_vocab:
            ent['defs'] = {k: vocab.get(v, {}) | {'word': vocab.get(v, {}).get('w', v)} for k, v in it['opts'].items()}
        return ent
    o = orig[str(n)]
    Q.append(build(f'o{n}', q['original'], o['answer'], o['explanation'], o.get('zh', ''), f'Original Q{n}'))
    for m in q['generated']:
        Q.append(build(m['id'], m['text'], m['answer'], m.get('explanation', ''), '', f'Mock {m["id"]}'))

if missing:
    print('MISSING translations:', len(set(missing)))
    for s in sorted(set(missing))[:20]: print('  -', s[:100])

title = f'Digital SAT English Mock Quiz - Practice Test {T}, Module {M}'
slug = f'dsat_t{T}m{M}'
page = open('enhance/template.html').read()
page = page.replace('__TITLE__', title).replace('__SLUG__', slug).replace('__SOURCE__', f'Digital SAT Practice Test {T}, Module {M}')
page = page.replace('__NCONCEPTS__', str(len(data))).replace('__NITEMS__', str(len(Q)))
page = page.replace('__DATA__', json.dumps(Q, ensure_ascii=False).replace('</', '<\\/'))
out = f'practice_test_{T}_module_{M}_mock_quiz.html'
open(out, 'w').write(page)
print('wrote', out, len(page), 'bytes;', len(Q), 'items')
