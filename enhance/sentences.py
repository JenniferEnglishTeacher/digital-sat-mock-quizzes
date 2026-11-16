import json,re,sys,collections
test,mod=sys.argv[1],sys.argv[2]
D=json.load(open(f'enhance/t{test}m{mod}_items.json'))
PROT=['Dr.','St.','B.','T.','H.','Mr.','Ms.','vs.','e.g.','i.e.','L.']
def protect(t):
  for p in PROT: t=t.replace(p+' ',p.replace('.','\x00')+' ')
  return t
def unprotect(t): return t.replace('\x00','.')
def sents(body):
  out=[]
  for para in body.split('\n'):
    if not para.strip(): continue
    p=protect(para)
    parts=re.split(r'(?<=[.?!])\s+(?=["A-Z(])',p)
    out.append([unprotect(x) for x in parts])
  return out
if __name__=='__main__':
  c=collections.Counter()
  for k,it in D['items'].items():
    for para in sents(it['body']):
      for s in para: c[s]+=1
  for s in D['pref'].values(): c[s.strip()]+=1
  uniq=list(c)
  print(len(uniq),'unique sentences',sum(len(s.split()) for s in uniq),'words')
  json.dump(uniq,open(f'enhance/t{test}m{mod}_sents.json','w'),ensure_ascii=False,indent=0)
