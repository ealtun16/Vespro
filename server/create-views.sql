-- Create orders_list_view to combine tank data with calculated costs
CREATE OR REPLACE VIEW orders_list_view AS
SELECT 
  t.id,
  t.tank_kodu AS kod,
  '' AS customer_name,
  '' AS project_code,
  t.cap_mm AS diameter_mm,
  t.silindir_boyu_mm AS length_mm,
  t.basinc_bar AS pressure_bar,
  NULL AS pressure_text,
  t.hacim_m3 AS volume,
  t.urun_kalitesi AS material_grade,
  t.toplam_agirlik_kg AS total_weight_kg,
  t.satis_fiyati_eur AS total_price_eur,
  NULL AS labor_eur,
  NULL AS outsource_eur,
  t.fiyat_tarihi AS created_date,
  t.created_at,
  t.updated_at,
  'Excel' AS source_kind,
  t.excel_file_path AS source_filename,
  NULL AS source_sheet_id,
  NULL AS sheet_name,
  -- Calculate costs from tank_kalem table
  COALESCE(SUM(tk.toplam_fiyat_eur), 0) AS calculated_total_eur,
  COUNT(tk.id) AS item_count
FROM tank t
LEFT JOIN tank_kalem tk ON tk.tank_id = t.id
GROUP BY 
  t.id,
  t.tank_kodu,
  t.cap_mm,
  t.silindir_boyu_mm,
  t.basinc_bar,
  t.hacim_m3,
  t.urun_kalitesi,
  t.toplam_agirlik_kg,
  t.satis_fiyati_eur,
  t.fiyat_tarihi,
  t.created_at,
  t.updated_at,
  t.excel_file_path;

-- Grant permissions
GRANT SELECT ON orders_list_view TO PUBLIC;
