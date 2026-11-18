-- Eksempelmaskiner. Priser og tekster er pladsholdere: ret dem til jeres rigtige lager.
-- Kan køres flere gange; eksisterende maskiner (samme slug) overskrives ikke.
INSERT INTO "machine" ("id", "slug", "name", "category", "description", "dailyPrice", "image") VALUES
  (gen_random_uuid()::text, '90kg-pladevibrator', '90 kg pladevibrator', 'Komprimering', 'Stærk og kompakt maskine til belægning, indkørsler og mindre anlægsarbejde.', 395, '/category-compaction.png'),
  (gen_random_uuid()::text, '30kg-betonhammer', '30 kg betonhammer', 'Nedbrydning', 'Kraftig 230 V hammer til nedbrydning af beton, fliser og fundamenter.', 295, '/maskiner-hero.png'),
  (gen_random_uuid()::text, 'fritstaaende-betonblander', 'Fritstående betonblander', 'Beton & blanding', '140 liters blander til beton og mørtel. 230 V.', 325, '/maskiner-hero.png'),
  (gen_random_uuid()::text, 'minigraver-1-5-tons', 'Minigraver 1,5 tons', 'Minigravere', 'Kompakt minigraver til terrasser, afløb og havearbejde.', 995, '/category-jord.png'),
  (gen_random_uuid()::text, 'motorboer', 'Motorbør', 'Motorbøre', 'Selvkørende motorbør til jord, sten og byggeaffald.', 345, '/category-transport.png'),
  (gen_random_uuid()::text, 'minilift', 'Minilift', 'Have & anlæg', 'Let lift til arbejde i højden ved facade og tag.', 695, '/category-lift.png')
ON CONFLICT ("slug") DO NOTHING;
