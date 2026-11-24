import os
import shutil
import unicodedata

BASE_DIR = '/Users/kazuna/workSpace/kaiji-gyotaku/images'

CATEGORIES = {
    '01_最新モック・SUNRISE': [
        'モック', 'SUNRISE', 'GreenTravel', 'クイック登録'
    ],
    '02_ホーム画面': [
        'ホーム', 'ひよこ'
    ],
    '03_案件一覧': [
        '案件一覧'
    ],
    '04_投稿詳細・カルテ': [
        '投稿詳細', 'カルテ', '一覧連携'
    ],
    '05_進捗タイムライン': [
        '進捗', 'タイムライン', 'flowchart'
    ],
    '06_全画面変遷（第1版〜第55版）': [
        # Handled by logic
    ],
    '07_パーツ・素材': [
        # fallback
    ]
}

def get_category(filename):
    fn = unicodedata.normalize('NFC', filename)
    
    # 01
    for k in CATEGORIES['01_最新モック・SUNRISE']:
        if k in fn:
            return '01_最新モック・SUNRISE'
            
    # 02
    for k in CATEGORIES['02_ホーム画面']:
        if k in fn:
            return '02_ホーム画面'
            
    # 03
    for k in CATEGORIES['03_案件一覧']:
        if k in fn:
            return '03_案件一覧'
            
    # 04
    for k in CATEGORIES['04_投稿詳細・カルテ']:
        if k in fn:
            return '04_投稿詳細・カルテ'
            
    # 05
    for k in CATEGORIES['05_進捗タイムライン']:
        if k in fn:
            return '05_進捗タイムライン'
            
    # 06: 全画面変遷（第1版〜第55版, 11-14, 11-17）
    if any(k in fn for k in ['第', '11-14', '11-17']) and ('画面イメージ' in fn or '版' in fn):
        return '06_全画面変遷（第1版〜第55版）'
        
    # 07: その他
    return '07_パーツ・素材'

def main():
    # Create subdirectories
    for cat in CATEGORIES.keys():
        cat_dir = os.path.join(BASE_DIR, cat)
        os.makedirs(cat_dir, exist_ok=True)
        
    items = os.listdir(BASE_DIR)
    moved_count = 0
    
    for item in items:
        item_path = os.path.join(BASE_DIR, item)
        # Skip directories
        if os.path.isdir(item_path):
            continue
        # Skip hidden files
        if item.startswith('.'):
            continue
            
        cat = get_category(item)
        dest_path = os.path.join(BASE_DIR, cat, item)
        shutil.move(item_path, dest_path)
        moved_count += 1
        
    print(f'Successfully organized {moved_count} files into categories!')
    
    # Summary of categorized files
    for cat in CATEGORIES.keys():
        cat_dir = os.path.join(BASE_DIR, cat)
        count = len(os.listdir(cat_dir))
        print(f'  {cat}: {count} items')

if __name__ == '__main__':
    main()
