import os

files = ['store.css', 'men.html', 'index.html', 'shop-all.html', 'product.html', 'auth.js', 'app.js', 'accounts.js', 'product-page.js', 'shop-all.js']
for f in files:
    if os.path.exists(f):
        try:
            with open(f, 'rb') as fr:
                raw = fr.read()
            
            # Detect BOM or try utf-16 if common in this environment
            if raw.startswith(b'\xff\xfe') or raw.startswith(b'\xfe\xff'):
                content = raw.decode('utf-16')
                with open(f, 'w', encoding='utf-8') as fw:
                    fw.write(content)
                print(f"Converted {f} from UTF-16 to UTF-8")
            else:
                # Try to see if it's already utf-8
                raw.decode('utf-8')
                print(f"{f} is already UTF-8")
        except Exception as e:
            print(f"Skipping {f}: {e}")
