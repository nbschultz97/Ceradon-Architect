# CSV Import Guide

## Overview

COTS Architect supports importing parts inventory from CSV files. Each part category has specific required and optional fields.

## How to Import

1. Navigate to **Parts Library** module
2. Select the category from the **CSV Template Category** dropdown
3. Click **Download CSV Template** to get a template file with the correct column headers
4. Fill in your parts data in the CSV file
5. Click **Import CSV Inventory** and select your filled CSV file

## Converting from XML

If you have an XML parts list, you'll need to convert it to CSV format. Follow these steps:

1. Download the appropriate CSV template for your part category
2. Extract data from your XML file
3. Map XML fields to the corresponding CSV columns (see field mappings below)
4. Save as CSV and import

## CSV Templates by Category

### Airframes
**Required fields:** `id`, `name`, `type`, `weight_g`

**All fields:**
- `id` - Unique identifier
- `name` - Part name
- `type` - One of: `fixed-wing`, `multi-rotor`, `vtol`, `ground`, `surface`
- `weight_g` - Weight in grams (numeric)
- `max_payload_g` - Maximum payload capacity in grams (numeric)
- `motor_count` - Number of motors (integer)
- `material` - Frame material (e.g., "carbon fiber", "3D-printed PLA")
- `manufacturer` - Manufacturer name
- `part_number` - Manufacturer part number
- `cost_usd` - Cost in USD (numeric)
- `availability` - One of: `in-stock`, `on-order`, `unavailable`, `discontinued`
- `notes` - Additional notes

### Motors
**Required fields:** `id`, `name`, `kv`, `weight_g`, `max_thrust_g`

**All fields:**
- `id` - Unique identifier
- `name` - Part name
- `size` - Motor size (e.g., "2207", "2806")
- `kv` - KV rating (RPM per volt, integer)
- `weight_g` - Weight in grams (numeric)
- `max_current_a` - Maximum current in amps (numeric)
- `max_power_w` - Maximum power in watts (numeric)
- `max_thrust_g` - Maximum thrust in grams (numeric)
- `manufacturer` - Manufacturer name
- `part_number` - Manufacturer part number
- `cost_usd` - Cost in USD (numeric)
- `availability` - One of: `in-stock`, `on-order`, `unavailable`, `discontinued`
- `notes` - Additional notes

### ESCs
**Required fields:** `id`, `name`, `max_current_a`, `weight_g`

**All fields:**
- `id` - Unique identifier
- `name` - Part name
- `max_current_a` - Maximum current rating in amps (numeric)
- `weight_g` - Weight in grams (numeric)
- `firmware` - Firmware type (e.g., "BLHeli_32", "KISS")
- `manufacturer` - Manufacturer name
- `part_number` - Manufacturer part number
- `cost_usd` - Cost in USD (numeric)
- `availability` - One of: `in-stock`, `on-order`, `unavailable`, `discontinued`
- `notes` - Additional notes

### Batteries
**Required fields:** `id`, `name`, `chemistry`, `voltage_nominal_v`, `capacity_mah`, `weight_g`

**All fields:**
- `id` - Unique identifier
- `name` - Part name
- `chemistry` - One of: `LiPo`, `Li-ion`, `LiFe`, `NiMH`, `Lead-acid`
- `cells` - Number of cells (integer)
- `voltage_nominal_v` - Nominal voltage (numeric)
- `capacity_mah` - Capacity in mAh (numeric)
- `weight_g` - Weight in grams (numeric)
- `c_rating` - Discharge rate multiplier (numeric)
- `connector_type` - Connector type (e.g., "XT60", "XT30")
- `manufacturer` - Manufacturer name
- `part_number` - Manufacturer part number
- `cost_usd` - Cost in USD (numeric)
- `availability` - One of: `in-stock`, `on-order`, `unavailable`, `discontinued`
- `notes` - Additional notes

### Flight Controllers
**Required fields:** `id`, `name`, `weight_g`

**All fields:**
- `id` - Unique identifier
- `name` - Part name
- `weight_g` - Weight in grams (numeric)
- `processor` - Processor type
- `firmware` - Compatible firmware (comma-separated for multiple, e.g., "Betaflight,ArduPilot,PX4")
- `manufacturer` - Manufacturer name
- `part_number` - Manufacturer part number
- `cost_usd` - Cost in USD (numeric)
- `availability` - One of: `in-stock`, `on-order`, `unavailable`, `discontinued`
- `notes` - Additional notes

### Radios
**Required fields:** `id`, `name`, `type`, `frequency_band`, `weight_g`

**All fields:**
- `id` - Unique identifier
- `name` - Part name
- `type` - One of: `control`, `video`, `telemetry`, `mesh`, `relay`
- `frequency_band` - Frequency band (e.g., "2.4GHz", "5.8GHz", "900MHz")
- `weight_g` - Weight in grams (numeric)
- `power_output_mw` - Transmit power in milliwatts (numeric)
- `range_m` - Line-of-sight range in meters (numeric)
- `manufacturer` - Manufacturer name
- `part_number` - Manufacturer part number
- `cost_usd` - Cost in USD (numeric)
- `availability` - One of: `in-stock`, `on-order`, `unavailable`, `discontinued`
- `notes` - Additional notes

### Sensors
**Required fields:** `id`, `name`, `type`, `weight_g`

**All fields:**
- `id` - Unique identifier
- `name` - Part name
- `type` - One of: `camera`, `lidar`, `gps`, `imu`, `magnetometer`, `barometer`, `other`
- `weight_g` - Weight in grams (numeric)
- `power_consumption_w` - Power consumption in watts (numeric)
- `manufacturer` - Manufacturer name
- `part_number` - Manufacturer part number
- `cost_usd` - Cost in USD (numeric)
- `availability` - One of: `in-stock`, `on-order`, `unavailable`, `discontinued`
- `notes` - Additional notes

### Accessories
**Required fields:** `id`, `name`, `category`, `weight_g`

**All fields:**
- `id` - Unique identifier
- `name` - Part name
- `category` - Accessory category (e.g., "propeller", "antenna", "mount", "cable", "case")
- `weight_g` - Weight in grams (numeric)
- `material` - Material type
- `manufacturer` - Manufacturer name
- `part_number` - Manufacturer part number
- `cost_usd` - Cost in USD (numeric)
- `availability` - One of: `in-stock`, `on-order`, `unavailable`, `discontinued`
- `notes` - Additional notes

## Data Type Notes

- **Numeric fields** (weight_g, cost_usd, etc.): Enter numbers only, no units
- **Integer fields** (cells, motor_count, kv): Whole numbers only
- **Enum fields** (type, chemistry, availability): Must use exact values listed above
- **Array fields** (firmware, tags): Use comma-separated values
- **Text fields**: Can contain any text, use quotes if commas are present

## Example CSV (Batteries)

```csv
id,name,chemistry,cells,voltage_nominal_v,capacity_mah,weight_g,c_rating,connector_type,manufacturer,part_number,cost_usd,availability,notes
battery-001,5000mAh 4S LiPo,LiPo,4,14.8,5000,450,50,XT60,CNHL,MiniStar 4S 5000mAh,45.99,in-stock,High capacity for long endurance
battery-002,3000mAh 6S LiPo,LiPo,6,22.2,3000,380,100,XT60,Tattu,R-Line 6S 3000mAh,62.50,in-stock,High discharge for racing
```

## Common Import Issues

1. **Missing required fields**: Ensure all required fields for your category are present
2. **Invalid enum values**: Check that type, chemistry, availability match exact values
3. **Non-numeric values**: Ensure numeric fields contain only numbers
4. **Comma handling**: Wrap text containing commas in double quotes
5. **File encoding**: Use UTF-8 encoding for special characters

## Auto-Mapping Feature

The CSV importer includes intelligent column mapping that recognizes common variations:

- `weight` → `weight_g`
- `price` → `cost_usd`
- `part#` → `part_number`
- `mfg` → `manufacturer`

See the full mapping table in [csv_importer.js](../assets/js/csv_importer.js) (MAPPING_TEMPLATES).

## Need Help?

- Check the [schema documentation](../schema/parts_library_schema.json) for detailed field specifications
- Review the [sample parts catalog](../data/sample_parts_library.json) for examples
- Report issues at https://github.com/nbschultz97/Ceradon-Architect/issues
