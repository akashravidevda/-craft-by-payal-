"""Workshop listings shown on the Workshop page.

SAMPLE DATA — formats and prices follow the reference store's workshop range as a starting point.
TODO: replace with Craft by Payal's real workshops, prices and batch dates.
`image` is a full URL or a site-relative path ("{P}assets/…"); None shows an illustration instead.
"""
CDN = "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/"

WORKSHOPS = [
    {
        "id": "online-miniature-frame",
        "type": "online",
        "tag": "Live online",
        "title": "Miniature Frame Workshop",
        "summary": "Build your own personalised miniature frame from home, with live step-by-step guidance over three short sessions.",
        "facts": [("i-clock", "3 sessions · about 3 hrs each"), ("i-hearts", "Small batch, beginner friendly"), ("i-box", "Materials list shared in advance")],
        "price": 2999, "from": False,
        "next": "Weekend batch — dates on WhatsApp",
        "image": CDN + "ChatGPT_Image_Mar_16_2026_11_11_55_AM.png?v=1773645322",
        "alt": "A finished miniature living-room frame like the one you'll make",
    },
    {
        "id": "studio-miniature-frame",
        "type": "studio",
        "tag": "In person",
        "title": "Miniature Frame Studio Workshop",
        "summary": "A relaxed, hands-on day at the studio — make your frame start to finish and take it home the same day.",
        "facts": [("i-clock", "One day · from 11 AM"), ("i-gift", "Bring your own materials, or add a kit"), ("i-heart-lg", "Take your finished frame home")],
        "price": 2999, "from": True,
        "next": "Next date on WhatsApp",
        "image": "{P}assets/images/workshop-maker-600.webp",
        "alt": "Our maker beside a finished, lit house-shaped miniature frame",
    },
    {
        "id": "diy-kit-frame",
        "type": "kit",
        "tag": "DIY kit",
        "title": "Miniature Frame DIY Kit",
        "summary": "Everything you need to make a miniature photo frame at your own pace — frame, tiny furniture, lights and instructions.",
        "facts": [("i-box", "Frame, 3D miniatures & lights included"), ("i-frame", "10×12 or 12×16 inch"), ("i-truck", "Delivered to your door")],
        "price": 1750, "from": True,
        "next": "Ships within India",
        "image": CDN + "IMG_20260309_153612.png?v=1773308305",
        "alt": "A miniature room frame with tiny furniture and photos",
    },
    {
        "id": "diy-kit-home",
        "type": "kit",
        "tag": "DIY kit",
        "title": "Miniature Home DIY Kit",
        "summary": "A house-shaped kit to build your own little home — perfect for a creative weekend or as a gift for a crafty friend.",
        "facts": [("i-box", "House frame & miniatures included"), ("i-frame", "8×10 or 10×12 inch"), ("i-truck", "Delivered to your door")],
        "price": 1500, "from": True,
        "next": "Ships within India",
        "image": CDN + "PSX_20241009_155823.jpg?v=1729232640",
        "alt": "A finished house-shaped miniature frame",
    },
    {
        "id": "beginners-to-business",
        "type": "online",
        "tag": "Live online",
        "title": "Beginners to Business",
        "summary": "An honest 3-hour session on turning a craft into a small online business — what to sell, pricing, social media and handling orders.",
        "facts": [("i-clock", "One session · 3 hrs"), ("i-pencil", "Practical, real-world tips"), ("i-hearts", "Q&A at the end")],
        "price": 850, "from": False,
        "next": "Dates on WhatsApp",
        "image": None,
        "alt": "",
    },
]

FILTERS = [("all", "All"), ("online", "Online"), ("studio", "In person"), ("kit", "DIY kits")]
