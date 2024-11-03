[Here](/en/tools/chartrace/dynamic) you can find a collection of pre-generated dynamic bar charts covering various interesting datasets.

Bar Chart Race is a dynamic data visualization method that vividly displays data trends over time. This tool helps you easily create professional bar chart race animations. It supports JSON, CSV, XLSX, and XLS file uploads - please ensure your data format is correct. **All file processing is done locally in your browser; no files are uploaded to servers**.

## Features

This tool offers rich functionality to help you create professional bar chart races effortlessly. You can import data files in various formats, including JSON, CSV, and Excel, making it convenient to use your existing data sources. After importing data, the tool provides real-time dynamic preview functionality, allowing you to instantly view and adjust chart effects.

To make charts more personalized, you can customize chart titles to better match your data theme. The system automatically generates coordinated color schemes for different data categories, ensuring professional visual effects. Once satisfied with your chart, you can export it as a high-quality GIF animation for easy sharing and presentation.

Notably, this tool runs entirely in the browser, with all data processing completed locally without server uploads, fully protecting your data privacy and security. This design ensures both data security and faster processing.

## Data Requirements

### Supported File Formats
The tool supports common data file formats including JSON (.json), CSV (.csv), and Excel files (.xlsx/.xls). To ensure system stability and good processing performance, uploaded files should be under 100MB. This limit is sufficient for most data visualization needs.

### Data Format Requirements

Your data table must include three basic columns. While column names are customizable, the content must meet these requirements:

1. **Time Column**: Represents the time dimension of data, can be years, specific dates, or other time identifiers. For example, "2000", "2023-01-01", etc. Time intervals should remain consistent for smooth animation.
2. **Category Column**: Distinguishes different data items, such as country names, product types, company names, etc. Brief category names are recommended, as lengthy names may affect display.
3. **Value Column**: Contains the actual numerical data, such as GDP, sales figures, population numbers, etc. Please use pure numerical format without units or special symbols.

Here's a simple example showing GDP changes for different countries over time:

```csv
Year,Country,GDP
2000,China,1000
2000,USA,2000
2001,China,1200
2001,USA,2100
```

In practice, you can prepare more time points and categories as needed. It's recommended to ensure data is cleaned and normalized, without missing or anomalous values, for optimal visualization results.

## Usage Steps

Using this tool is simple, involving three main steps:

1. **Upload Data**: Drag and drop your formatted data file to the upload area, or click to select file; preview data content after successful upload.
2. **Configure Chart**: Select corresponding time, category, and value columns; enter chart title (optional); click "Generate Chart" to preview dynamic effects.
3. **Export Animation**: After confirming chart effects, click "Export GIF" and wait for automatic download of the generated GIF.

## FAQ

Q: Why isn't my data displaying correctly?  
A: Please check if your data format meets requirements and ensure time, category, and value columns are correctly selected.

Q: How long does GIF generation take?  
A: Depends on data volume and number of time points, generally not exceeding 1 minute.

Q: What time formats are supported?  
A: Supports numerical years, dates, and standard date formats.

## Additional Resources

- [Sample Data Download](/racechart/china_population.csv)
- [Pre-made Race Charts](/en/tools/chartrace/dynamic)

---

*Note: This tool is completely free to use. Feedback and suggestions are welcome.*