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
    chk=[w[f'V{r}'].value for r in range(5,34)]
    kx=o['kx']; xk=chk[10:14]; bad=[i for i in range(4) if (kx[i] is None)!=(not isinstance(xk[i],(int,float))) or (kx[i] is not None and abs(xk[i]-kx[i])>(1e-6 if i>=2 else 0.01))]
    if bad: print('   ИТОГИ НЕ СОШЛИСЬ (EBITDA 27, 28, маржа, IRR):',xk,kx)
    print(f"{n:13s} ошибок формул {out.get('total_errors')} {out.get('error_summary') or ''} | строк сверено {len(o['eng'])} | макс. расхождение {worst[0]} {worst[1]:.4f} | внести {o['invest']/1e6:.2f} / Excel {chk[0]/1e6:.2f} | окуп {o['pb']} / {chk[3]} | IRR {('%.1f%%'%(kx[3]*100)) if kx[3] is not None else 'нет'} / Excel {('%.1f%%'%(xk[3]*100)) if isinstance(xk[3],(int,float)) else xk[3]} | проверки не-OK: {[c for c in chk[15:] if c not in ('OK',None)]} | паллета {pal} | тревоги игры: {len(o['alerts'])}")
