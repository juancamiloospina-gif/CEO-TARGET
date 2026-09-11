/*
# Add consulting-qualification fields to business_diagnostics (Fase 2 v3)

1. Changes
- `business_diagnostics`
  - Add `decision_role` (text) — reemplaza a `tool_level` en el formulario:
    eje "accesibilidad del decisor" del outbound scoring de Cupperlab
    (decido_yo / yo_influyo / solo_explorando).
  - Add `pain_intensity` (text) — reemplaza a `urgency` en el formulario:
    eje "dolor visible" del outbound scoring (leve / moderado / alto / critico).
  - `tool_level` y `urgency` NO se eliminan: se dejan como columnas
    historicas para no perder datos de diagnosticos ya enviados con el
    formulario anterior. El frontend deja de escribirlas a partir de ahora.

Motivo del cambio: el objetivo de Fase 2 dejo de ser personalizar un curso
(ticket pequeno) y paso a calificar si vale la pena agendar una llamada de
consultoria de IA con el prospecto (Cupperlab suele tener contacto directo
del decisor via outbound). `decision_role` + `pain_intensity` son las dos
senales que predicen eso; `tool_level` no lo hacia.

2. Security
- No cambia RLS: hereda las policies existentes de la tabla.
*/

ALTER TABLE business_diagnostics ADD COLUMN IF NOT EXISTS decision_role text;
ALTER TABLE business_diagnostics ADD COLUMN IF NOT EXISTS pain_intensity text;
