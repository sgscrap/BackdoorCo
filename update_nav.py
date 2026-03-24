import os
import re

# Comprehensive Navigation Template
NAV_TEMPLATE = """<nav class="navbar" id="navbar">
    <a class="nav-logo" href="index.html">
        <div class="nav-logo-mark">B</div>
        BACK<span>DOOR</span>
    </a>
    <div class="nav-center">
        <a class="nav-link {shop_active}" href="shop-all.html">Shop</a>
        <div class="nav-dropdown">
            <a class="nav-link nav-dropdown-toggle {brands_active}" href="#">Brands <i class="fa-solid fa-chevron-down"></i></a>
            <div class="nav-dropdown-menu">
                <a href="shop-all.html?filter=Jordan" class="current-cat-link">Jordan</a>
                <a href="shop-all.html?filter=Nike" class="current-cat-link">Nike</a>
                <a href="shop-all.html?filter=Adidas" class="current-cat-link">Adidas</a>
                <a href="shop-all.html?filter=New%20Balance" class="current-cat-link">New Balance</a>
                <a href="shop-all.html?filter=Yeezy" class="current-cat-link">Yeezy</a>
            </div>
        </div>
        <a class="nav-link {drops_active}" href="shop-all.html?sort=newest">New Drops</a>
        <a class="nav-link {about_active}" href="about.html">About</a>
    </div>
    <div class="nav-right">
        <div class="nav-search-wrap">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="navSearch" placeholder="Search sneakers..." />
        </div>
        <div class="nav-icons-group">
            <a class="nav-icon-link" href="#" id="navWishlistBtn" title="Wishlist">
                <i class="fa-regular fa-heart"></i>
                <span class="nav-badge" id="wishlistCountBadge" style="display: none;">0</span>
            </a>
            <button class="btn-cart" id="cartButton" onclick="window.toggleCart?.()">
                <i class="fa-solid fa-bag-shopping"></i>
                <span>Cart</span>
                <span class="cart-badge" id="cartCount" style="display: none;">0</span>
            </button>
        </div>
    </div>
</nav>"""

DEPENDENCIES = """
  <!-- Firebase SDKs & Global Auth -->
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
  <script>
      window.firebaseConfig = {
          apiKey: "AIzaSyDq98ddvXGZLdxPCm0Gd-6gRtOmvBdBctw",
          authDomain: "coalition-aec44.firebaseapp.com",
          projectId: "coalition-aec44",
          storageBucket: "coalition-aec44.firebasestorage.app",
          messagingSenderId: "312196142925",
          appId: "1:312196142925:web:ba090f602c8b5a31b20904"
      };
  </script>
  <script src="auth.js"></script>
"""

def update_file(filepath):
    filename = os.path.basename(filepath)
    if filename in ["admin.html", "checkout.html"]: # Skip non-storefront
        return

    # Determine active states
    shop_active = "active" if filename == "shop-all.html" else ""
    brands_active = ""
    drops_active = ""
    about_active = "active" if filename == "about.html" else ""
    
    # Format template
    new_nav = NAV_TEMPLATE.format(
        shop_active=shop_active,
        brands_active=brands_active,
        drops_active=drops_active,
        about_active=about_active
    )
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace entire <nav class="navbar"> block with any attributes
    nav_pattern = r'<nav\b[^>]*?class="[^"]*?navbar[^"]*?"[^>]*?>.*?</nav>'
    if re.search(nav_pattern, content, re.DOTALL):
        content = re.sub(nav_pattern, new_nav, content, flags=re.DOTALL)
        
        # Ensure dependencies are present before </body>
        if 'auth.js' not in content:
            content = content.replace('</body>', DEPENDENCIES + '\n</body>')
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filename}")
    else:
        print(f"Skipped (navbar not found): {filename}")

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    html_files = []
    
    for file in os.listdir(root_dir):
        if file.endswith(".html"):
            html_files.append(os.path.join(root_dir, file))
    
    for html_file in html_files:
        update_file(html_file)

if __name__ == "__main__":
    main()
