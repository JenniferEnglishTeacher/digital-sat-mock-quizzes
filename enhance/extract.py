import json,re,os,sys
test,mod=sys.argv[1],sys.argv[2]
def _ci(name):  # Test 10 files are capitalized (Practice_Test_10_...); match case-insensitively, keep the real filename
  for f in os.listdir('.'):
    if f.lower()==name: return f
  return name
d=json.load(open(_ci(f'practice_test_{test}_module_{mod}_data.json')))
STEMS=["Which choice completes the text with the most logical and precise word or phrase?","Which choice best states the main purpose of the text?","Which choice best describes the function of the underlined sentence in the text as a whole?","Which choice most directly supports the claim or hypothesis?","Which choice most effectively uses or describes data from the table?","Which choice most logically completes the text?","Which choice completes the text so that it conforms to the conventions of Standard English?","Which choice completes the text with the most logical transition?","Which choice most effectively uses relevant information from the notes to accomplish this goal?"]
groups={}
for q in d:
  for m in q['generated']: groups.setdefault(m['id'].split('.')[1],[]).append(m['text'])
pref={}
for k,texts in groups.items():
  p=os.path.commonprefix(texts); p=p[:p.rfind('. ')+2] if '. ' in p else ''; pref[k]=p  # no full shared sentence -> no filler (avoid a 1-letter prefix)
# modules translated before the stem fallback existed keep their original string indexing
FALLBACK=not os.path.exists(f'enhance/zh_opts_t{test}m{mod}_a.json')
def split(text, filler=''):
  while filler and text.startswith(filler): text=text[len(filler):]  # some data files repeat the filler twice
  lines=text.split('\n'); opts={}; stem=None; body=[]
  for l in lines:
    mo=re.match(r'^([A-D])\) (.*)$',l)
    if mo: opts[mo.group(1)]=mo.group(2)
    elif l.strip() in STEMS or (not stem and l.endswith('?') and l.startswith('Which choice')) : stem=l.strip()
    else: body.append(l)
  if stem is None and FALLBACK:  # fallback: the question line just before the options (e.g. 'According to the text, ...?')
    for i in range(len(body)-1,-1,-1):
      if body[i].strip():
        if body[i].strip().endswith('?'): stem=body.pop(i).strip()
        break
  body='\n'.join(body).strip()
  body=re.sub(r'\n{3,}','\n\n',body)
  return body,stem,opts
# optional cleaned originals (raw PDF text with hard line wraps / graph debris): enhance/orig_text_tTmM.json {n: text}
OT=f'enhance/orig_text_t{test}m{mod}.json'
OTX=json.load(open(OT)) if os.path.exists(OT) else {}
items={}
strings=set()
for q in d:
  b,s,o=split(OTX.get(str(q['n']),q['original']))
  items['o%d'%q['n']]={'body':b,'stem':s,'opts':o,'filler':None}
  strings.add(b); strings.update(o.values()); strings.add(s)
  for m in q['generated']:
    k=m['id'].split('.')[1]
    b,s,o=split(m['text'],pref[k])
    items[m['id']]={'body':b,'stem':s,'opts':o,'filler':k}
    strings.add(b); strings.update(o.values()); strings.add(s)
strings.update(pref.values())
strings.discard(""); strings.discard(None)
json.dump({'pref':pref,'items':items},open(f'enhance/t{test}m{mod}_items.json','w'),ensure_ascii=False,indent=1)
sl=sorted(strings,key=lambda s:(len(s)>120,s))
json.dump(sl,open(f'enhance/t{test}m{mod}_strings.json','w'),ensure_ascii=False,indent=0)
print(len(items),'items',len(sl),'distinct strings', sum(len(s.split()) for s in sl),'words')
