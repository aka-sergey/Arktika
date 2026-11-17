import json, subprocess, openpyxl, sys
RC='/root/.claude/skills/synced/d4ac9bcb-4e39-473c-9f82-5e1e4cd87aac_83fa28bc-4616-4035-ae22-0b3f647b3703/xlsx/scripts/recalc.py'
reg=json.load(open('x_reg.json'))
for n,o in reg.items():
    out=json.loads(subprocess.run(['python3',RC,f'x_{n}.xlsx','120'],capture_output=True,text=True).stdout)
    w=openpyxl.load_workbook(f'x_{n}.xlsx',data_only=True)['Кейс']
    worst=('',0)
    for k,arr in o['eng'].items():
        r=o['R'][k]
        for i,v in enumerate(arr):
            x=w.cell(r,5+i).value
            d=abs((x or 0)-v) if isinstance(x,(int,float)) or x is None else 1e18
            if d>worst[1]: worst=(k+str(i+1),d)
    pal=[w[a.replace('$','')].value for a in o['pp']['bpp']]
    if pal!=o['pp']['pal']: print('   ПАЛЛЕТА НЕ СОШЛАСЬ',pal,o['pp']['pal'])
    mm=[w[a.replace('$','')].value for a in o['pp']['m']]; kg=[w[a.replace('$','')].value for a in o['pp']['kg']]
    if max(abs(x-y) for x,y in zip(mm,o['pp']['mEng']))>1e-6: print('   МАТЕРИАЛЫ НА БУТЫЛКУ НЕ СОШЛИСЬ',mm,o['pp']['mEng'])
    if max(abs(x-y) for x,y in zip(kg,o['pp']['kgEng']))>1e-6: print('   ВЕС ПАЛЛЕТЫ НЕ СОШЁЛСЯ',kg,o['pp']['kgEng'])
    K=o['K']; kv=o['kv']; badk=[]
    for key,v in kv.items():
        x=w[K[key]].value
        if v is None:
            if isinstance(x,(int,float)): badk.append((key,x,v))
        elif not isinstance(x,(int,float)) or abs(x-v)>(1e-6 if key in ('ebm','util','irr') else 0.01): badk.append((key,x,v))
    if badk: print('   ИТОГИ НЕ СОШЛИСЬ:',badk)
    bady=[]
    for yr,ye in zip(o['yrows']['rows'],o['yv']):
        r=yr['row']; got=[w[f'{col}{r}'].value for col in 'PQRSTUV']; exp=[ye['y'],ye['n'],ye['rev'],ye['ebitda'],ye['ebm'],ye['profit'],ye['cf']]
        if any(not isinstance(g,(int,float)) or abs(g-e)>(1e-6 if i==4 else 0.01) for i,(g,e) in enumerate(zip(got,exp))): bady.append((got,exp))
    if bady: print('   ГОДЫ НЕ СОШЛИСЬ:',bady[:2])
    chk=[w[f"V{r}"].value for r in range(o['checks']['r0'],o['checks']['r0']+o['checks']['n'])]
    irr=kv['irr']; xi=w[K['irr']].value
    print(f"{n:13s} ошибок формул {out.get('total_errors')} {out.get('error_summary') or ''} | строк сверено {len(o['eng'])}×{len(next(iter(o['eng'].values())))} | макс. расхождение {worst[0]} {worst[1]:.4f} | внести {o['invest']/1e6:.2f} / Excel {w[K['invest']].value/1e6:.2f} | окуп {o['pb']} / {w[K['pb']].value} ({w[K['pb_n']].value}) | IRR {('%.1f%%'%(irr*100)) if irr is not None else 'нет'} / Excel {('%.1f%%'%(xi*100)) if isinstance(xi,(int,float)) else xi} | итогов {len(kv)} и лет {len(o['yv'])} сверено{'' if not (badk or bady) else ' — ЕСТЬ РАСХОЖДЕНИЯ'} | проверки не-OK: {[c for c in chk if c!='OK']} | паллета {pal} | тревоги игры: {len(o['alerts'])}")
