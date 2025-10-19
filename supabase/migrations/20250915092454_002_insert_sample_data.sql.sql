-- ハロウィン仮装大会 - サンプル候補者データ

-- サンプル候補者データを挿入
INSERT INTO contestants (name, description, category) VALUES
('魔女のエミリー', '伝統的な魔女の衣装で、ほうきと魔法の帽子がポイント！黒猫も一緒です。', 'クラシック'),
('ゾンビハンター太郎', '血まみれのゾンビハンターコスチューム。リアルな特殊メイクが自慢です！', 'ホラー'),
('かぼちゃ王子', 'オレンジ色のかぼちゃスーツで、頭にはかぼちゃのヘルメット。とってもキュート！', 'キュート'),
('ヴァンパイア伯爵', '本格的なヴァンパイアの衣装。マントと牙がリアルで迫力満点！', 'クラシック'),
('お化け屋敷の主', '白いシーツをかぶったシンプルだけど効果的なお化けコスチューム。', 'ホラー');

-- 各候補者に画像URLを追加（プレースホルダー画像）
INSERT INTO contestant_images (contestant_id, image_url, is_primary)
SELECT 
    c.id,
    'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=' || 
    CASE 
        WHEN c.name = '魔女のエミリー' THEN 'halloween_witch_costume_with_hat_and_broomstick_traditional_black_dress'
        WHEN c.name = 'ゾンビハンター太郎' THEN 'zombie_hunter_costume_with_blood_makeup_and_weapons_scary_halloween'
        WHEN c.name = 'かぼちゃ王子' THEN 'cute_pumpkin_costume_orange_suit_with_pumpkin_helmet_kawaii_halloween'
        WHEN c.name = 'ヴァンパイア伯爵' THEN 'vampire_count_costume_with_cape_and_fangs_classic_dracula_halloween'
        WHEN c.name = 'お化け屋敷の主' THEN 'classic_ghost_costume_white_sheet_simple_but_effective_halloween'
    END || '&image_size=square_hd',
    true
FROM contestants c
WHERE c.name IN ('魔女のエミリー', 'ゾンビハンター太郎', 'かぼちゃ王子', 'ヴァンパイア伯爵', 'お化け屋敷の主');;
