export function csvCell(value: string) {
  let cell = value.replaceAll('"', '""');
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  return `"${cell}"`;
}

export function toCsv(rows: string[][]) {
  const body = rows.map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\r\n");
  return `\uFEFF${body}\r\n`;
}
