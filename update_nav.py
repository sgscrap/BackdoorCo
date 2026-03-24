import os
import re

# Navigation template
NAV_TEMPLATE = """<div class="nav-center">
    <a class="nav-link {shop_active}" href="shop-all.html">SHOP</a>
    <a class="nav-link {men_active}" href="men.html">Men</a>
    <a class="nav-link {women_active}" href="women.html">Women</a>
    <a class="nav-link {kids_active}" href="kids.html">Kids</a>
    <div class="nav-dropdown">
        <a class="nav-link nav-dropdown-toggle" href="#">Browse <i class="fa-solid fa-chevron-down"></i></a>
        <div class="nav-dropdown-menu">
            <a href="shoes.html" class="nav-dropdown-item">Shoes</a>
            <a href="apparel.html" class="nav-dropdown-item">Apparel</a>
            <a href="accessories.html" class="nav-dropdown-item" data-category="accessories">Accessories</a>
            <a href="electronics.html" class="nav-dropdown-item">Electronics</a>
        </div>
    </div>
</div>"""

def update_file(filepath):
    filename = os.path.basename(filepath)
    
    # Determine active states
    shop_active = "active" if filename == "shop-all.html" else ""
    men_active = "active" if filename == "men.html" else ""
    women_active = "active" if filename == "women.html" else ""
    kids_active = "active" if filename == "kids.html" else ""
    
    # Format template
    new_nav = NAV_TEMPLATE.format(
        shop_active=shop_active,
        men_active=men_active,
        women_active=women_active,
        kids_active=kids_active
    )
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace nav-center block
    # Matches <div class="nav-center"> ... </div> including nested content
    # We use a non-greedy match that stops at the next </div> that is followed by <div class="nav-right">
    # which is a common pattern in your HTML structure.
    pattern = r'<div class="nav-center">.*?</div>(?=\s*<div class="nav-right">)'
    
    if re.search(pattern, content, re.DOTALL):
        updated_content = re.sub(pattern, new_nav, content, flags=re.DOTALL)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        print(f"Updated: {filename}")
    else:
        print(f"Skipped (nav-center not found): {filename}")

def main():
    root_dir = "c:\\Users\\SG\\OneDrive\\WebApps\\Backdoor"
    html_files = []
    
    # Walk through root and admin directory
    for root, dirs, files in os.walk(root_dir):
        if "node_modules" in root or ".git" in root:
            continue
        for file in files:
            if file.endswith(".html"):
                html_files.append(os.path.join(root, file))
    
    for html_file in html_files:
        update_file(html_file)

if __name__ == "__main__":
    main()
