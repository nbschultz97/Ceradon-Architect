# COTS Architect - Tools

Utility scripts for working with COTS Architect data.

---

## Inventory Converter

Convert customer inventory spreadsheets to COTS Architect multi-category CSV format.

### Quick Start (Windows)

1. **Drag and drop** your customer's `.xlsx` file onto `convert_inventory.bat`
2. Wait for conversion to complete
3. Import the generated `*_converted.csv` file into COTS Architect

### Command Line Usage

```bash
python convert_customer_inventory.py input.xlsx output.csv
```

### Requirements

```bash
pip install openpyxl
```

### Supported Input Formats

The converter handles spreadsheets with these columns:

| Column A | Column B | Column C | Column D | Column E |
|----------|----------|----------|----------|----------|
| Category | Component | Item | Quantity | Link |

**Example:**
```
| UAS  | ESC       | Lumenier 51A BLHeli_32 bit ESC | 45 | https://... |
| UAS  | Battery   | CNHL battery connectors        | 50 | https://... |
| MISC | Tools     | Tamlis Electric Screwdriver    | 10 | https://... |
```

### Category Mapping

The converter automatically maps customer categories to COTS Architect categories:

| Customer Component | COTS Architect Category |
|-------------------|------------------------|
| ESC               | esc                    |
| Battery           | battery                |
| Frame             | airframe               |
| Motor/Motors      | motor                  |
| Radio/Receiver    | radio                  |
| Controller        | flight_controller      |
| Camera            | sensor                 |
| Propellers/Props  | accessory              |
| Tools/Misc/Parts  | accessory              |

### Output Format

The converter generates a multi-category CSV with these columns:

```csv
category,name,manufacturer,part_number,quantity,weight_g,cost_usd,link,notes
```

**Notes column** preserves the original customer category/component for reference (e.g., "UAS/ESC").

---

## Troubleshooting

### "openpyxl not found"

Install the required library:
```bash
pip install openpyxl
```

### "Python not found"

Ensure Python is installed and added to PATH:
1. Download Python from https://python.org
2. Run installer with "Add to PATH" checked

### Wrong category assignments

Edit `convert_customer_inventory.py` and modify the `component_map` dictionary in the `map_category()` function.

---

## Future Tools (Planned)

- `validate_inventory.py` - Check for duplicate parts, missing data
- `merge_inventories.py` - Combine multiple CSV files
- `export_to_property_book.py` - Generate unit property book format
- `nsn_lookup.py` - Enrich parts with NSN data

---

**Questions?** Open an issue: https://github.com/nbschultz97/COTS-Architect/issues
