import os
import re

models_dir = 'app/models'

for filename in os.listdir(models_dir):
    if not filename.endswith('.py') or filename == '__init__.py':
        continue
    filepath = os.path.join(models_dir, filename)
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    if '.isoformat()' not in content:
        continue
        
    # Inject import if not present
    if 'from app.utils.time_utils import to_utc_iso' not in content:
        content = 'from app.utils.time_utils import to_utc_iso\n' + content
        
    # Find patterns like: self.started_at.isoformat() if self.started_at else None
    # and replace with: to_utc_iso(self.started_at)
    # We can use regex.
    # Pattern: (self\.[a_zA-Z0-9_]+)\.isoformat\(\) if \1 else None
    content = re.sub(
        r'(self\.[a-zA-Z0-9_]+)\.isoformat\(\) if \1 else None',
        r'to_utc_iso(\1)',
        content
    )
    
    # Also catch cases like: self.created_at.isoformat()
    content = re.sub(
        r'(self\.[a-zA-Z0-9_]+)\.isoformat\(\)',
        r'to_utc_iso(\1)',
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"Updated {filename}")
