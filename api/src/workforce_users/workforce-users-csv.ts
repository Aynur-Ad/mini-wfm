import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateWorkforceUserDto } from './dto/create-workforce_user.dto.js';

export const MAX_CSV_BYTES = 256 * 1024;
const MAX_ROWS = 500;
const requiredColumns = ['firstName', 'lastName', 'registrationNumber'];
const optionalColumn = 'phone';

export interface WorkforceImportRow {
  row: number;
  person: CreateWorkforceUserDto;
}

interface CsvRecord {
  row: number;
  fields: string[];
}

function invalid(message: string, row?: number): never {
  throw new BadRequestException({
    message,
    ...(row === undefined ? {} : { details: [{ row, messages: [message] }] }),
  });
}

function parseRecords(text: string): CsvRecord[] {
  const header = text.split(/\r\n|\n|\r/).find((line) => line.trim()) ?? '';
  const separator = header.includes(';') ? ';' : ',';
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = '';
  let line = 1;
  let recordLine = 1;
  let state: 'unquoted' | 'quoted' | 'closed' = 'unquoted';

  function finishField() {
    fields.push(field);
    field = '';
    state = 'unquoted';
  }

  function finishRecord() {
    finishField();
    if (fields.length > 1 || fields[0].trim()) {
      records.push({ row: recordLine, fields });
      if (records.length > MAX_ROWS + 1)
        invalid('CSV en fazla 500 personel satırı içerebilir.');
    }
    fields = [];
  }

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const newline = char === '\r' || char === '\n';
    if (state === 'quoted' && char === '"') {
      if (text[index + 1] === '"') {
        field += '"';
        index++;
      } else state = 'closed';
    } else if (newline) {
      if (char === '\r' && text[index + 1] === '\n') index++;
      line++;
      if (state === 'quoted') field += '\n';
      else {
        finishRecord();
        recordLine = line;
      }
    } else if (state === 'quoted') {
      field += char;
    } else if (char === separator) {
      finishField();
    } else if (char === '"' && state === 'unquoted' && field === '') {
      state = 'quoted';
    } else if (state === 'closed' || char === '"') {
      invalid('CSV tırnak biçimi geçersiz.', recordLine);
    } else {
      field += char;
    }
  }

  if (state === 'quoted') invalid('CSV tırnağı kapatılmamış.', recordLine);
  finishRecord();
  return records;
}

export function readWorkforceCsv(buffer: Buffer): WorkforceImportRow[] {
  if (!buffer.length || buffer.length > MAX_CSV_BYTES)
    invalid('CSV dosyası boş veya 256 KB sınırını aşıyor.');

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    invalid('CSV dosyasını UTF-8 olarak kaydedin.');
  }
  if (text.includes('\0')) invalid('CSV dosyasını UTF-8 olarak kaydedin.');

  const [header, ...data] = parseRecords(text);
  const columns = header?.fields.map((field) => field.trim()) ?? [];
  const allowedColumns = [...requiredColumns, optionalColumn];
  if (
    new Set(columns).size !== columns.length ||
    !requiredColumns.every((column) => columns.includes(column)) ||
    !columns.every((column) => allowedColumns.includes(column))
  ) {
    invalid(
      'CSV başlıkları firstName, lastName, registrationNumber ve isteğe bağlı phone olmalıdır.',
    );
  }
  if (!data.length) invalid('CSV en az bir personel satırı içermelidir.');

  const rows: WorkforceImportRow[] = [];
  const details: { row: number; messages: string[] }[] = [];
  for (const { row, fields } of data) {
    if (fields.length !== columns.length) {
      details.push({ row, messages: ['Sütun sayısı başlıkla eşleşmiyor.'] });
      continue;
    }
    const values = Object.fromEntries(
      columns.map((column, index) => [column, fields[index].trim()]),
    );
    const person = plainToInstance(CreateWorkforceUserDto, {
      ...values,
      phone: values.phone || null,
    });
    const errors = validateSync(person, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length) {
      details.push({
        row,
        messages: errors.flatMap((error) =>
          Object.values(error.constraints ?? {}),
        ),
      });
    } else {
      rows.push({ row, person });
    }
  }

  if (details.length) {
    throw new BadRequestException({
      message: 'CSV satırlarını kontrol edin.',
      details,
    });
  }
  return rows;
}
