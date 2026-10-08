import os
path = 'app/templates/uptime_status_component.html'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('\\`', '`')
text = text.replace('\\$', '$')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
