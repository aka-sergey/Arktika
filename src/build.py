import io
r=lambda f: open(f,encoding='utf-8').read()
html=f'''<title>Завод воды АРКТИКА</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
{r('style.css')}
</style>
{r('body.html')}
<script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"></script>
<script>
{r('engine.js')}
{r('meta.js')}
{r('excel.js')}
{r('ui.js')}
</script>
'''
print(len(html))

# самостоятельная страница для GitHub Pages или открытия с диска
full='<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<style>html{background:#0B0E11}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n</head>\n<body>\n'+html+'</body>\n</html>\n'
open('../index.html','w',encoding='utf-8').write(full)
