export interface ParsedCsvRow {
  rowNumber: number;
  data: Record<string, string>;
}

export function parseCsvFile(content: string): ParsedCsvRow[] {
  const lines = splitCsvLines(content);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: ParsedCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const data: Record<string, string> = {};
    headers.forEach((header, idx) => {
      data[header] = values[idx] || "";
    });
    rows.push({ rowNumber: i, data });
  }

  return rows;
}

function splitCsvLines(content: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < content.length && content[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === "\n" || char === "\r") {
        if (current.trim()) lines.push(current);
        current = "";
        if (
          char === "\r" &&
          i + 1 < content.length &&
          content[i + 1] === "\n"
        ) {
          i++;
        }
      } else {
        current += char;
      }
    }
  }

  if (current.trim()) lines.push(current);
  return lines;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}
