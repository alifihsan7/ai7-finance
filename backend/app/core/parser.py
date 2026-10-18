import re

# Specific regex patterns for account detection (multi-word patterns first)
ACCOUNT_PATTERNS = [
    (r"\b(?:bri\s*1|bri1)\b", "BRI 1"),
    (r"\b(?:bri\s*2|bri2)\b", "BRI 2"),
    (r"\b(?:mandiri|livin)\b", "Mandiri"),
    (r"\b(?:bank\s*jago|jago)\b", "Bank Jago"),
    (r"\b(?:bibit)\b", "Bibit"),
    (r"\b(?:bca|halo\s*bca)\b", "BCA"),
    (r"\b(?:bni)\b", "BNI"),
    (r"\b(?:seabank)\b", "SeaBank"),
    (r"\b(?:gopay|go-pay)\b", "GoPay"),
    (r"\b(?:ovo)\b", "OVO"),
    (r"\b(?:dana)\b", "DANA"),
    (r"\b(?:shopeepay|spay)\b", "ShopeePay"),
    (r"\b(?:cash|tunai|dompet)\b", "Cash"),
]

INCOME_KEYWORDS = [
    "gaji", "income", "pemasukan", "terima", "dapat", "transfer masuk", 
    "transferan", "freelance", "bonus", "cashback", "dividen", "angpao", "cuan", "uang saku"
]

# Order matters: more specific envelopes first!
CATEGORY_RULES = [
    ("Makanan & Minuman", [
        "nasgor", "nasi goreng", "miegor", "mie goreng", "mie", "bakmi", "kwetiau", 
        "bihun", "bubur", "pecel", "lele", "soto", "nasi", "ayam", "bebek", "sate", 
        "bakso", "rawon", "gudeg", "warteg", "padang", "geprek", "rendang", "resto", 
        "makan", "minum", "lunch", "dinner", "sarapan", "breakfast", "kantin", "warung",
        "burger", "pizza", "mcd", "kfc"
    ]),
    ("Jajan / Ngopi", [
        "kopi", "coffee", "cafe", "kafe", "starbucks", "kenangan", "janji jiwa", 
        "tomoro", "fore", "boba", "chatime", "es teh", "esteh", "teh", "mixue", "snack", 
        "cemilan", "roti", "ice cream", "eskrim", "croissant", "jajan", "gorengan",
        "martabak", "cilok", "cireng", "siomay", "batagor", "tahu bulat"
    ]),
    ("Laundry", [
        "laundry", "cuci baju", "cuci pakaian", "londri", "setrika", "dry clean"
    ]),
    ("Galon & Air", [
        "galon", "isi ulang", "aqua galon", "cleo galon", "le minerale galon", "air minum"
    ]),
    ("Langganan & Servis", [
        "netflix", "spotify", "youtube premium", "yt premium", "icloud", "chatgpt", 
        "github copilot", "subscription", "langganan", "wifi", "indihome", "biznet", 
        "myrepublic", "firstmedia", "listrik", "pln", "token", "pulsa", "kuota", 
        "paket data", "telkomsel", "byu", "xl", "indosat", "kos", "kost", "kontrakan"
    ]),
    ("Investasi & Tabungan", [
        "bibit", "reksadana", "saham", "crypto", "nabung", "invest", "deposito"
    ]),
    ("Transportasi", [
        "bensin", "pertalite", "pertamax", "shell", "solar", "gojek", "goride", 
        "gocar", "grab", "grabcar", "grabike", "maxim", "parkir", "tol", "kereta", 
        "krl", "mrt", "lrt", "busway", "transjakarta", "ojol", "angkot", "service motor", 
        "cuci motor", "cuci mobil"
    ]),
    ("Kebutuhan Harian", [
        "indomaret", "alfamart", "supermarket", "hypermart", "belanja", "sabun", 
        "odol", "shampoo", "beras", "baju", "celana", "sepatu", "tokped", "tokopedia", 
        "shopee", "lazada", "tiktok shop", "skincare", "tisu", "deterjen"
    ]),
    ("Kesehatan & Gym", [
        "gym", "fitness", "membership", "suplemen", "whey", "creatine", "obat", 
        "vitamin", "apotek", "dokter", "klinik", "panadol", "paracetamol"
    ]),
    ("Hiburan", [
        "nonton", "bioskop", "cinema", "xxi", "cgv", "game", "steam", "topup", 
        "playstation", "wisata", "liburan", "karaoke"
    ])
]

# Intelligent fallback account based on category when no account is explicitly typed
CATEGORY_DEFAULT_ACCOUNT = {
    "Langganan & Servis": "Bank Jago",
    "Investasi & Tabungan": "Bibit",
}

def parse_amount(text: str):
    pattern = r'(?i)\b(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|jt|juta|m|mio)?\b'
    matches = list(re.finditer(pattern, text))
    
    for match in matches:
        num_str = match.group(1).replace(',', '.')
        unit = (match.group(2) or '').lower()
        
        if not unit:
            cleaned = match.group(1).replace('.', '').replace(',', '')
            if cleaned.isdigit() and int(cleaned) > 0:
                return int(cleaned), match.group(0)
            continue
            
        try:
            val = float(num_str)
            if unit in ['k', 'rb', 'ribu']:
                multiplier = 1_000
            elif unit in ['jt', 'juta', 'm', 'mio']:
                multiplier = 1_000_000
            else:
                multiplier = 1
            amount = int(val * multiplier)
            if amount > 0:
                return amount, match.group(0)
        except ValueError:
            continue
            
    return None, None

def split_raw_into_items(text: str) -> list[str]:
    clean = text.strip()
    if not clean:
        return []

    # Priority 1: Multi-line message
    lines = [line.strip() for line in clean.splitlines() if line.strip()]
    if len(lines) > 1:
        return lines

    # Priority 2: Comma or semicolon separated
    if "," in clean or ";" in clean:
        parts = [p.strip() for p in re.split(r'[,;]+', clean) if p.strip()]
        if len(parts) > 1:
            return parts

    # Priority 3: Multiple amounts in single line (e.g. 'nasgor 20k kopi 28k')
    amt_pattern = r'\b(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|jt|juta|m|mio)\b|\b(?:rp\.?\s*)(\d+(?:[.,]\d+)?)\b'
    matches = list(re.finditer(amt_pattern, clean, flags=re.IGNORECASE))
    
    if len(matches) <= 1:
        return [clean]

    segments = []
    last_end = 0
    for i, m in enumerate(matches):
        seg = clean[last_end:m.end()].strip()
        seg = re.sub(r'^(?:dan|\+|&)\s*', '', seg, flags=re.IGNORECASE)
        segments.append(seg)
        last_end = m.end()

    if last_end < len(clean):
        trailing = clean[last_end:].strip()
        if trailing and segments:
            segments[-1] += " " + trailing

    return segments

def parse_transaction(text: str):
    raw = text.strip()
    if not raw:
        return {"success": False, "error": "Pesan kosong"}
        
    amount, matched_num = parse_amount(raw)
    if not amount or not matched_num:
        return {
            "success": False, 
            "error": "Nominal tidak terdeteksi. Contoh format: `nasi padang 25k` atau `kopi 20k mandiri`"
        }
        
    remaining = raw.replace(matched_num, " ")
    
    # Check explicit account
    selected_account = None
    matched_acc_span = None
    for pattern, acc_name in ACCOUNT_PATTERNS:
        match = re.search(pattern, remaining, re.IGNORECASE)
        if match:
            selected_account = acc_name
            matched_acc_span = match.group(0)
            break
            
    if matched_acc_span:
        remaining = re.sub(re.escape(matched_acc_span), " ", remaining, flags=re.IGNORECASE)
        
    # Check transaction type
    is_income = False
    for ikw in INCOME_KEYWORDS:
        if re.search(rf'\b{re.escape(ikw)}\b', raw.lower()):
            is_income = True
            break
            
    tx_type = "income" if is_income else "expense"
    
    # Determine category
    selected_category = "Pemasukan" if is_income else "Lainnya"
    if not is_income:
        for cat_name, cat_kws in CATEGORY_RULES:
            matched = False
            for ckw in cat_kws:
                if re.search(rf'\b{re.escape(ckw)}\b', raw.lower()):
                    selected_category = cat_name
                    matched = True
                    break
            if matched:
                break

    # If no explicit account was given, smart-infer from category or default to Mandiri
    if not selected_account:
        if selected_category in CATEGORY_DEFAULT_ACCOUNT:
            selected_account = CATEGORY_DEFAULT_ACCOUNT[selected_category]
        elif is_income:
            selected_account = "BRI 1"  # Default hub for income
        else:
            selected_account = "Mandiri"  # Default daily operational pocket
                
    desc_clean = re.sub(r'[^\w\s-]', '', remaining).strip()
    desc_clean = re.sub(r'\s+', ' ', desc_clean)
    
    if not desc_clean:
        desc_clean = selected_category
    else:
        desc_clean = desc_clean.capitalize()
        
    return {
        "success": True,
        "type": tx_type,
        "amount": amount,
        "account": selected_account,
        "category": selected_category,
        "description": desc_clean,
        "raw_text": raw
    }

def parse_multi_transactions(text: str) -> list[dict]:
    items = split_raw_into_items(text)
    results = []
    for item in items:
        parsed = parse_transaction(item)
        if parsed.get("success"):
            results.append(parsed)
    return results
