
from openpyxl import Workbook, load_workbook
from datetime import datetime

CENTRAL_SPREADSHEET = "/mnt/data/central_spreadsheet.xlsx"

def create_central_spreadsheet():
    if not os.path.exists(CENTRAL_SPREADSHEET):
        wb = Workbook()
        wb.create_sheet("Monthly Costs")
        wb.create_sheet("Sales Data")
        wb.create_sheet("Pricing Details")
        costs_sheet = wb["Monthly Costs"]
        costs_sheet.append(["Month", "Food Costs", "Beverage Costs", "Chemical Costs", "Total Costs"])
        sales_sheet = wb["Sales Data"]
        sales_sheet.append(["Date", "Category", "Item", "Quantity Sold", "Revenue"])
        pricing_sheet = wb["Pricing Details"]
        pricing_sheet.append(["Item Name", "Category", "Supplier", "Unit Price"])
        wb.save(CENTRAL_SPREADSHEET)
    return "Central spreadsheet created or exists."

def validate_extracted_data(data, expected_keys):
    errors = []
    for key in expected_keys:
        if key not in data or not data[key]:
            errors.append(f"Missing or empty field: {key}")
    return errors

def update_spreadsheet_with_validation(extracted_data, sheet_name):
    wb = load_workbook(CENTRAL_SPREADSHEET)
    error_sheet = wb.create_sheet("Error Log") if "Error Log" not in wb.sheetnames else wb["Error Log"]
    validation_errors = validate_extracted_data(extracted_data, expected_keys={"Pricing Details": ["Item Name", "Category"]})
    if validation_errors:
        error_sheet.append([datetime.now(), "; ".join(validation_errors), extracted_data])
        wb.save(CENTRAL_SPREADSHEET)
        return "Error logged."
    sheet = wb[sheet_name]
    headers = [cell.value for cell in sheet[1]]
    row = [extracted_data.get(header, "") for header in headers]
    sheet.append(row)
    wb.save(CENTRAL_SPREADSHEET)
    return "Data added."
