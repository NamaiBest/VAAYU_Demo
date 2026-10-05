# Geographic basemap provenance

## Bundled basemap

`india-official.geojson` is the only basemap. No external tile service is used: raster tile providers such as OpenStreetMap draw de facto lines (LoC/LAC) in Jammu & Kashmir and Ladakh, which do not match India's official boundary.

The file contains three feature kinds (`properties.kind`):

- `country`: neighbouring countries, from Natural Earth `ne_10m_admin_0_countries_ind` (India point of view), clipped to 20°E–140°E, 20°S–55°N (the map's pan limit).
- `state`: India's 36 states and union territories, from Natural Earth `ne_10m_admin_1_states_provinces`, clipped to India's official outline. Jammu & Kashmir and Ladakh were rebuilt to their full official extent:
  - Jammu & Kashmir = Natural Earth "Jammu and Kashmir" + Pakistan-occupied Kashmir ("Azad Kashmir"), within India's official outline.
  - Ladakh = the rest of the northern territory: Leh, Kargil, Gilgit-Baltistan, Aksai Chin and the Shaksgam Valley.
- `india`: India's national outline from `ne_10m_admin_0_countries_ind`, drawn last as the bold national border.

Geometry was simplified with mapshaper (`-simplify 10% keep-shapes planar`, shared topology across all layers) and written at 0.001° precision. Verified after simplification: Muzaffarabad, Mirpur, Gilgit, Skardu, Siachen, Aksai Chin and Shaksgam all lie inside India's outline, and no neighbouring country overlaps it.

Downloaded 05 October 2026 from https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
Terms: https://www.naturalearthdata.com/about/terms-of-use/ (public domain).

This is a small-scale reference map, not a Survey of India product. City names and coordinates are geographic reference labels, not operational locations.

## Operational layers

The geographic map contains no aircraft telemetry, actual mission assignments, government weather observations or real airspace clearances. Clean mode has no operational overlays. Optional demo locations use explicitly synthetic placements derived from the seed's schematic coordinates. They must not be interpreted as real facilities. Sample route geometry is illustrative, not flight navigation guidance.
