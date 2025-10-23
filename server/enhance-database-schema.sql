-- Database Schema Enhancement for Better ChatBot Support
-- Adds category totals and calculated fields to tank_order table

-- 1. Add new columns to tank_order table
ALTER TABLE tank_order 
ADD COLUMN IF NOT EXISTS category_totals JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS price_per_m3 NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS price_per_kg NUMERIC(12,4),
ADD COLUMN IF NOT EXISTS material_cost_eur NUMERIC(14,2),
ADD COLUMN IF NOT EXISTS labor_cost_eur NUMERIC(14,2),
ADD COLUMN IF NOT EXISTS outsource_cost_eur_calc NUMERIC(14,2);

-- 2. Create or replace view for ChatBot with enhanced data
CREATE OR REPLACE VIEW v_tank_orders_enhanced AS
SELECT 
  t.id,
  t.order_code,
  t.customer_name,
  t.sheet_name,
  t.diameter_mm,
  t.length_mm,
  t.volume,
  t.material_grade,
  t.pressure_bar,
  t.pressure_text,
  t.temperature_c,
  t.total_weight_kg,
  t.total_price_eur,
  t.created_date,
  
  -- Calculated fields
  CASE 
    WHEN t.volume > 0 THEN ROUND((t.total_price_eur / t.volume)::numeric, 2)
    ELSE NULL 
  END as price_per_m3_calc,
  
  CASE 
    WHEN t.total_weight_kg > 0 THEN ROUND((t.total_price_eur / t.total_weight_kg)::numeric, 4)
    ELSE NULL 
  END as price_per_kg_calc,
  
  -- Category totals from JSON
  t.category_totals,
  
  -- Extract specific categories for easier querying
  (t.category_totals->>'1_sac_malzemeler')::numeric as sac_malzemeler_eur,
  (t.category_totals->>'2_mil_flans_boru')::numeric as mil_flans_boru_eur,
  (t.category_totals->>'3_nozullar')::numeric as nozullar_eur,
  (t.category_totals->>'4_civata_conta')::numeric as civata_conta_eur,
  (t.category_totals->>'5_yataklama')::numeric as yataklama_eur,
  (t.category_totals->>'6_motor_karistirici')::numeric as motor_karistirici_eur,
  (t.category_totals->>'7_ozel_parcalar')::numeric as ozel_parcalar_eur,
  (t.category_totals->>'8_test_kontrol')::numeric as test_kontrol_eur,
  (t.category_totals->>'9_dis_atolye')::numeric as dis_atolye_eur,
  (t.category_totals->>'10_izolasyon')::numeric as izolasyon_eur,
  (t.category_totals->>'10_yuzey_islem')::numeric as yuzey_islem_eur,
  (t.category_totals->>'10_atolye_iscilik')::numeric as atolye_iscilik_eur,
  (t.category_totals->>'10_genel_gider')::numeric as genel_gider_eur,
  
  -- Aggregate cost item data
  COUNT(ci.id) as total_cost_items,
  SUM(CASE WHEN ci.is_atolye_iscilik = true THEN ci.line_total_eur ELSE 0 END) as atolye_iscilik_total,
  SUM(CASE WHEN ci.is_dis_tedarik = true THEN ci.line_total_eur ELSE 0 END) as dis_tedarik_total,
  
  t.created_at,
  t.updated_at
FROM tank_order t
LEFT JOIN cost_item ci ON ci.order_id = t.id
GROUP BY t.id, t.order_code, t.customer_name, t.sheet_name, t.diameter_mm, 
         t.length_mm, t.volume, t.material_grade, t.pressure_bar, t.pressure_text,
         t.temperature_c, t.total_weight_kg, t.total_price_eur, t.created_date,
         t.category_totals, t.created_at, t.updated_at;

-- 3. Create function to calculate and update category totals
CREATE OR REPLACE FUNCTION calculate_category_totals(p_order_id BIGINT)
RETURNS JSONB AS $$
DECLARE
  v_totals JSONB;
BEGIN
  -- Calculate category totals from cost_item table grouped by group_no
  SELECT jsonb_object_agg(
    CASE 
      WHEN group_no = 1 THEN '1_sac_malzemeler'
      WHEN group_no = 2 THEN '2_mil_flans_boru'
      WHEN group_no = 3 THEN '3_nozullar'
      WHEN group_no = 4 THEN '4_civata_conta'
      WHEN group_no = 5 THEN '5_yataklama'
      WHEN group_no = 6 THEN '6_motor_karistirici'
      WHEN group_no = 7 THEN '7_ozel_parcalar'
      WHEN group_no = 8 THEN '8_test_kontrol'
      WHEN group_no = 9 THEN '9_dis_atolye'
      WHEN group_no = 10 THEN '10_atolye_iscilik'
      ELSE 'other'
    END,
    total
  ) INTO v_totals
  FROM (
    SELECT 
      group_no,
      SUM(line_total_eur) as total
    FROM cost_item
    WHERE order_id = p_order_id
    AND group_no IS NOT NULL
    GROUP BY group_no
  ) grouped;
  
  RETURN COALESCE(v_totals, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to auto-update category totals
CREATE OR REPLACE FUNCTION update_tank_order_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update category totals
  UPDATE tank_order
  SET 
    category_totals = calculate_category_totals(NEW.order_id),
    updated_at = NOW()
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_update_tank_order_totals ON cost_item;

CREATE TRIGGER trg_update_tank_order_totals
AFTER INSERT OR UPDATE OR DELETE ON cost_item
FOR EACH ROW
EXECUTE FUNCTION update_tank_order_totals();

-- 5. Update existing records with category totals
DO $$
DECLARE
  v_order RECORD;
BEGIN
  FOR v_order IN SELECT id FROM tank_order LOOP
    UPDATE tank_order
    SET category_totals = calculate_category_totals(v_order.id)
    WHERE id = v_order.id;
  END LOOP;
END $$;

-- 6. Create index for better ChatBot query performance
CREATE INDEX IF NOT EXISTS idx_tank_order_volume ON tank_order(volume) WHERE volume IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tank_order_diameter ON tank_order(diameter_mm) WHERE diameter_mm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tank_order_material ON tank_order(material_grade) WHERE material_grade IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tank_order_price ON tank_order(total_price_eur DESC) WHERE total_price_eur IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tank_order_date ON tank_order(created_date DESC) WHERE created_date IS NOT NULL;

-- 7. Grant permissions (if needed)
-- GRANT SELECT ON v_tank_orders_enhanced TO your_app_user;

COMMENT ON VIEW v_tank_orders_enhanced IS 'Enhanced view of tank orders with calculated fields and category breakdowns for ChatBot queries';
COMMENT ON FUNCTION calculate_category_totals(BIGINT) IS 'Calculates category totals from cost_item table for a given order';
COMMENT ON COLUMN tank_order.category_totals IS 'JSON object containing breakdown of costs by category (sac, flanş, nozul, etc.)';
