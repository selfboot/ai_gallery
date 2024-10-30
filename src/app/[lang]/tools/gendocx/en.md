## Online Word Document Batch Generator

This tool can **batch generate personalized Word documents based on Excel data and Word templates**. It's suitable for scenarios where you need to generate multiple documents with the same format but different content.

Data and templates can be referred to in the two file examples here: [Template File](/files/template.docx) and [Data File](/files/batchdata.xlsx).

This tool **performs batch generation locally in your browser and doesn't upload any data to servers**. It can even work offline after the page loads.

For example:
- Batch generate certificates and awards
- Batch generate contracts and agreements
- Batch generate notices and invitations
- Batch generate personalized reports
- Other scenarios requiring batch document generation

## How to Use

1. **Upload Excel File**
   - Click or drag file to the "Upload Excel File" area
   - Supports .xlsx/.xls formats
   - File size limit: 50MB

2. **Upload Word Template**
   - Click or drag file to the "Upload Word Template" area
   - Only supports .docx format
   - File size limit: 50MB

3. **Generate Documents**
   - Click "Generate Documents" button to start batch generation
   - Monitor processing status of each record in the table
   - After completion, download individually or click "Download All" for ZIP archive

## Detailed Template Creation Guide

Excel file **format requirements**

- First row must be header row for defining variables
- Actual data starts from second row
- Date types automatically convert to YYYY/MM/DD format

Example:
| Name | Date | ID | Amount |
|------|------|------|------|
| John | 2024/1/1 | A001 | 1000 |
| Jane | 2024/1/2 | A002 | 2000 |

Word template requirements. First, the **variable format**:

```
{{variable_name}}
```

For example:

```
Dear {{Name}},

You completed order {{ID}} on {{Date}} with an amount of {{Amount}} dollars.
```

## Important Notes

- Ensure Excel file's first row is the header row
- Variables in Word template must be wrapped in double curly braces, e.g., `{{name}}`
- Variable names must exactly match Excel column headers (case-sensitive)
- Generated documents are automatically named as "template-name_number.docx"
- Data is lost after page refresh or close, download generated documents promptly
- Complex formulas or conditional logic not supported
- **Recommended to test template with small dataset first**

## Common Issues

1. **Generation Fails**
   - Check if Excel file format is correct
   - Verify variable names in Word template match Excel headers exactly
   - Check for special characters or formatting issues

2. **File Size Limits**
   - Excel and Word files limited to 50MB each
   - No size limit for generated documents

3. **Browser Compatibility**
   - Recommended browsers: Chrome, Firefox, Edge
   - IE browser not supported
