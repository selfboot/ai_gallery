To facilitate batch generation of Word documents, I created an [Online Word Document Batch Generator](https://gallery.selfboot.cn/en/tools/gendocx) that can **batch generate personalized Word documents based on Excel data and Word templates**. It's suitable for scenarios where you need to generate multiple documents with the same format but different content, such as:

- Batch generate certificates and awards
- Batch generate contracts and agreements
- Batch generate notices and invitations
- Batch generate personalized reports

You can refer to these two example files for the data and Word template formats: [Template File](/files/template.docx) and [Data File](/files/batchdata.xlsx).

![Word Template File for Online Batch Generation Tool](https://slefboot-1251736664.file.myqcloud.com/20241227_ai_gallery_gendocx.png)

This tool **performs batch generation locally in your browser and doesn't upload any data to servers**. It can even work offline after the page loads, so feel free to use it with confidence.

## How to Use the Online Word Batch Generator

You can batch generate customized Word documents in just 3 simple steps:

1. **Upload Excel File**: Click the "Upload Excel File" area or drag and drop your file into it. The system supports both .xlsx and .xls Excel file formats.

2. **Upload Word Template**: Similarly, click the "Upload Word Template" area or drag and drop your template file. Only .docx format is supported for Word templates.

3. **Generate Documents**: Click the "Generate Documents" button to start the batch generation process. You can monitor the processing status of each record in real-time through the table interface. Once all documents are generated, you can either download individual documents or click "Download All" to get a ZIP archive containing all generated documents.

A successful generation looks like this:

![Generation Results of Online Word Batch Generator](https://slefboot-1251736664.file.myqcloud.com/20241227_ai_gallery_gendocx_oper_en.png)

## Template File Format Instructions

Batch generation requires two files: an Excel file to store the data to be generated, and a Word template file to store the document format. Here are the format requirements for these files.

First, let's look at the **format requirements** for the Excel data file. There are 3 main requirements:

- **The first row must be the header row, which defines the placeholder names used in the Word template**. These names will be used as placeholders in the Word template;
- **Actual data starts from the second row**, and the number of data columns must match the number of variables in the template;
- **For date types, they will be automatically converted to YYYY/MM/DD format**, other types remain unchanged.

Here's a simple example: if you want to generate a payroll with different names, dates, numbers, and amounts, you can use the following Excel format:

| Name | Date | Number | Amount |
|------|------|--------|---------|
| John | 2024/1/1 | A001 | 1000 |
| Mary | 2024/1/2 | A002 | 2000 |

Once you have the Excel data file, you just need a Word template file. To use the column names from Excel, simply wrap them in double curly braces in Word, like this:

```
{{Name}}
```

In the generated Word document, {{Name}} will be replaced with the value from the Name column in Excel.

## Important Notes for Online Word Batch Generation Tool

Before generating a large batch of documents, it's recommended to test with a simple template and a small amount of data first. If there are issues with the generated Word documents, please check the following points:

- Ensure the Excel file format is correct, with headers in the first row and data starting from the second row;
- Variables in the Word template must be wrapped in double curly braces, e.g., `{{name}}`, and must have corresponding columns in Excel;
- Variable names must exactly match the Excel column headers (case-sensitive);
- If the files are too large, processing might be slow or even fail. It's recommended to keep files under 100MB;
- Use modern browsers like Chrome, Firefox, or Edge. Internet Explorer may have compatibility issues.

Finally, please note the document naming rules:
- If the first column of Excel has content, it will be used as the file name
- If the first column of Excel is empty, the format "template-name_sequence-number.docx" will be used
- Illegal characters in file names will be automatically replaced with underscores

Data will be lost when the page is refreshed or closed, so please download your generated documents promptly.