@echo off
REM Convert customer inventory spreadsheet to COTS Architect CSV format
REM
REM Usage: Drag and drop an .xlsx file onto this batch file

echo ========================================
echo COTS Architect Inventory Converter
echo ========================================
echo.

if "%~1"=="" (
    echo ERROR: No file provided
    echo.
    echo Usage: Drag and drop an .xlsx file onto this batch file
    echo.
    pause
    exit /b 1
)

set INPUT_FILE=%~1
set OUTPUT_FILE=%~dpn1_converted.csv

echo Input:  %INPUT_FILE%
echo Output: %OUTPUT_FILE%
echo.

python "%~dp0convert_customer_inventory.py" "%INPUT_FILE%" "%OUTPUT_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! File converted.
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Open COTS Architect
    echo 2. Go to Parts Library
    echo 3. Click "Import Multi-Category CSV"
    echo 4. Select: %OUTPUT_FILE%
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR: Conversion failed
    echo ========================================
    echo.
)

pause
