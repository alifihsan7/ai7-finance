import re

ACCOUNTS = {
    "bca": "BCA",
    "mandiri": "Mandiri",
    "bri": "BRI",
    "bni": "BNI",
    "jago": "Bank Jago",
    "seabank": "SeaBank",
    "gopay": "GoPay",
    "ovo": "OVO",
    "dana": "DANA",
    "shopeepay": "ShopeePay",
    "spay": "ShopeePay",
    "cash": "Cash",
    "tunai": "Cash",
    "dompet": "Cash"
}

INCOME_KEYWORDS = [
    "gaji", "income", "pemasukan", "terima", "dapat", "transfer masuk", 
    "transferan", "freelance", "bonus", "cashback", "dividen", "angpao", "cuan"
]

CATEGORY_RULES = [
    ("Makanan & Minuman", [
        "makan", "minum", "kopi", "coffee", "cafe", "kafe", "nasi", "ayam", "mie", 
        "bakso", "sate", "burger", "pizza", "mcd", "kfc", "starbucks", "chatime", 
        "es teh", "jus", "lunch", "dinner", "sarapan", "breakfast", "cemilan", "snack"
    ]),
    ("Transportasi", [
        "bensin", "pertalite", "pertamax", "solar", "gojek", "goride", "gocar", 
        "grab", "grabcar", "grabike", "maxim", "parkir", "tol", "kereta", "krl", 
        "mrt", "lrt", "busway", "transjakarta", "ojol", "angkot", "service motor", "cuci motor", "cuci mobil"
    ]),
    ("Belanja & Kebutuhan", [
        "indomaret", "alfamart", "supermarket", "hypermart", "belanja", "sabun", 
        "odol", "shampoo", "beras", "galon", "aqua", "baju", "celana", "sepatu", 
        "tokped", "tokopedia", "shopee", "lazada", "tiktok shop", "skincare"
    ]),
    ("Tagihan & Langganan", [
        "wifi", "indihome", "biznet", "myrepublic", "firstmedia", "listrik", "pln", 
        "token", "pulsa", "kuota", "paket data", "telkomsel", "byu", "xl", "indosat", 
        "netflix", "spotify", "youtube", "icloud", "chatgpt", "subscription", "kos", "kost", "kontrakan"
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

def parse_transaction(text: str):
    raw = text.strip()
    if not raw:
        return {"success": False, "error": "Pesan kosong"}
        
    amount, matched_num = parse_amount(raw)
    if not amount or not matched_num:
        return {
            "success": False, 
            "error": "Nominal tidak terdeteksi. Contoh format: `kopi 25k bca` atau `gaji 10jt bca`"
        }
        
    remaining = raw.replace(matched_num, " ").lower()
    
    selected_account = "Cash"
    found_acc_keyword = None
    for kw, acc_name in ACCOUNTS.items():
        if re.search(rf'\b{re.escape(kw)}\b', remaining):
            selected_account = acc_name
            found_acc_keyword = kw
            break
            
    if found_acc_keyword:
        remaining = re.sub(rf'\b{re.escape(found_acc_keyword)}\b', " ", remaining)
        
    is_income = False
    for ikw in INCOME_KEYWORDS:
        if re.search(rf'\b{re.escape(ikw)}\b', raw.lower()):
            is_income = True
            break
            
    tx_type = "income" if is_income else "expense"
    
    selected_category = "Pemasukan" if is_income else "Lain-lain"
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
