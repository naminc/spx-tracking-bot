/* eslint-disable @typescript-eslint/no-require-imports, no-undef */

const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_DUMP_PATH = 'C:\\Users\\NAMINC\\Downloads\\spx_tracking_db.sql';

function readArgs() {
  const args = process.argv.slice(2);
  const dumpPathArg = args.find((arg) => !arg.startsWith('--'));

  return {
    dumpPath: path.resolve(dumpPathArg || DEFAULT_DUMP_PATH),
    dryRun: args.includes('--dry-run'),
  };
}

function extractInsertStatements(sql, tableName) {
  const statements = [];
  const pattern = new RegExp(
    `INSERT INTO \`${tableName}\` \\(([^)]+)\\) VALUES\\s*([\\s\\S]*?);`,
    'g',
  );
  let match;

  while ((match = pattern.exec(sql)) !== null) {
    statements.push({
      columns: match[1].match(/`([^`]+)`/g).map((column) => column.slice(1, -1)),
      values: match[2],
    });
  }

  return statements;
}

function readSqlString(source, startIndex) {
  let value = '';
  let index = startIndex + 1;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '\\') {
      if (next === undefined) {
        index += 1;
        continue;
      }

      const escapedValues = {
        0: '\0',
        b: '\b',
        n: '\n',
        r: '\r',
        t: '\t',
        Z: '\x1a',
        '\\': '\\',
        "'": "'",
        '"': '"',
      };

      value += Object.prototype.hasOwnProperty.call(escapedValues, next)
        ? escapedValues[next]
        : next;
      index += 2;
      continue;
    }

    if (char === "'") {
      if (next === "'") {
        value += "'";
        index += 2;
        continue;
      }

      return { value, nextIndex: index + 1 };
    }

    value += char;
    index += 1;
  }

  throw new Error('Unterminated SQL string in dump file');
}

function readBareValue(source, startIndex) {
  let index = startIndex;

  while (index < source.length && source[index] !== ',' && source[index] !== ')') {
    index += 1;
  }

  const rawValue = source.slice(startIndex, index).trim();

  if (/^NULL$/i.test(rawValue)) {
    return { value: null, nextIndex: index };
  }

  if (/^-?\d+$/.test(rawValue)) {
    return { value: Number(rawValue), nextIndex: index };
  }

  return { value: rawValue, nextIndex: index };
}

function parseRows(valuesSource) {
  const rows = [];
  let index = 0;

  while (index < valuesSource.length) {
    const char = valuesSource[index];

    if (char !== '(') {
      index += 1;
      continue;
    }

    index += 1;
    const row = [];

    while (index < valuesSource.length) {
      while (/\s/.test(valuesSource[index] || '')) {
        index += 1;
      }

      const valueResult =
        valuesSource[index] === "'"
          ? readSqlString(valuesSource, index)
          : readBareValue(valuesSource, index);

      row.push(valueResult.value);
      index = valueResult.nextIndex;

      while (/\s/.test(valuesSource[index] || '')) {
        index += 1;
      }

      if (valuesSource[index] === ',') {
        index += 1;
        continue;
      }

      if (valuesSource[index] === ')') {
        index += 1;
        break;
      }
    }

    rows.push(row);
  }

  return rows;
}

function parseTable(sql, tableName) {
  return extractInsertStatements(sql, tableName).flatMap((statement) =>
    parseRows(statement.values).map((row) =>
      statement.columns.reduce((record, column, index) => {
        record[column] = row[index];
        return record;
      }, {}),
    ),
  );
}

function parseDateTime(value) {
  if (!value) {
    return undefined;
  }

  return new Date(`${String(value).replace(' ', 'T')}Z`);
}

function parseJson(value) {
  if (value === null || value === undefined) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return { raw: String(value) };
  }
}

function toNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function toBoolean(value) {
  return Number(value) === 1;
}

function groupEarliestCreatedAtByChatId(orders) {
  return orders.reduce((result, order) => {
    const chatId = String(order.telegramChatId);
    const createdAt = parseDateTime(order.createdAt);
    const currentCreatedAt = result.get(chatId);

    if (!currentCreatedAt || createdAt < currentCreatedAt) {
      result.set(chatId, createdAt);
    }

    return result;
  }, new Map());
}

async function importUsers(orders, dryRun) {
  const earliestCreatedAtByChatId = groupEarliestCreatedAtByChatId(orders);
  const chatIds = [...earliestCreatedAtByChatId.keys()].sort();

  if (dryRun) {
    return new Map(chatIds.map((chatId, index) => [chatId, index + 1]));
  }

  const userByChatId = new Map();

  for (const chatId of chatIds) {
    const user = await prisma.user.upsert({
      where: { telegramUserId: chatId },
      create: {
        telegramUserId: chatId,
        username: null,
        firstName: null,
        lastName: null,
        createdAt: earliestCreatedAtByChatId.get(chatId),
      },
      update: {},
      select: { id: true, telegramUserId: true },
    });

    userByChatId.set(user.telegramUserId, user.id);
  }

  return userByChatId;
}

async function importOrders(orders, userByChatId, dryRun) {
  const oldOrderIdToNewOrderId = new Map();
  const summary = { created: 0, existing: 0, linked: 0 };

  for (const order of orders) {
    const chatId = String(order.telegramChatId);
    const userId = userByChatId.get(chatId) ?? null;

    if (dryRun) {
      oldOrderIdToNewOrderId.set(Number(order.id), Number(order.id));
      summary.created += 1;
      continue;
    }

    const existingOrder = await prisma.trackingOrder.findUnique({
      where: {
        trackingNumber_telegramChatId: {
          trackingNumber: String(order.trackingNumber),
          telegramChatId: chatId,
        },
      },
      select: { id: true, userId: true },
    });

    if (existingOrder) {
      oldOrderIdToNewOrderId.set(Number(order.id), existingOrder.id);
      summary.existing += 1;

      if (!existingOrder.userId && userId) {
        await prisma.trackingOrder.update({
          where: { id: existingOrder.id },
          data: { userId },
        });
        summary.linked += 1;
      }

      continue;
    }

    const createdOrder = await prisma.trackingOrder.create({
      data: {
        trackingNumber: String(order.trackingNumber),
        telegramChatId: chatId,
        userId,
        note: null,
        currentStatus: String(order.currentStatus),
        currentStatusCode: String(order.currentStatusCode),
        currentLocation: toNullableString(order.currentLocation),
        nextLocation: toNullableString(order.nextLocation),
        milestoneCode: toNullableString(order.milestoneCode),
        milestoneName: toNullableString(order.milestoneName),
        lastEventTime: parseDateTime(order.lastEventTime),
        isCompleted: toBoolean(order.isCompleted),
        finalStatus: String(order.finalStatus),
        createdAt: parseDateTime(order.createdAt),
        updatedAt: parseDateTime(order.updatedAt),
      },
      select: { id: true },
    });

    oldOrderIdToNewOrderId.set(Number(order.id), createdOrder.id);
    summary.created += 1;
  }

  return { oldOrderIdToNewOrderId, summary };
}

async function importHistories(histories, oldOrderIdToNewOrderId, dryRun) {
  const summary = { created: 0, skippedExisting: 0, skippedMissingOrder: 0 };

  for (const history of histories) {
    const orderId = oldOrderIdToNewOrderId.get(Number(history.orderId));

    if (!orderId) {
      summary.skippedMissingOrder += 1;
      continue;
    }

    if (dryRun) {
      summary.created += 1;
      continue;
    }

    const eventTime = parseDateTime(history.eventTime);
    const existingHistory = await prisma.trackingHistory.findFirst({
      where: {
        orderId,
        trackingCode: String(history.trackingCode),
        eventTime,
        status: String(history.status),
      },
      select: { id: true },
    });

    if (existingHistory) {
      summary.skippedExisting += 1;
      continue;
    }

    await prisma.trackingHistory.create({
      data: {
        orderId,
        trackingCode: String(history.trackingCode),
        trackingName: toNullableString(history.trackingName),
        status: String(history.status),
        location: toNullableString(history.location),
        nextLocation: toNullableString(history.nextLocation),
        description: toNullableString(history.description),
        buyerDescription: toNullableString(history.buyerDescription),
        sellerDescription: toNullableString(history.sellerDescription),
        milestoneCode: toNullableString(history.milestoneCode),
        milestoneName: toNullableString(history.milestoneName),
        eventTime,
        rawData: parseJson(history.rawData),
        createdAt: parseDateTime(history.createdAt),
      },
    });

    summary.created += 1;
  }

  return summary;
}

async function main() {
  const { dumpPath, dryRun } = readArgs();

  if (!fs.existsSync(dumpPath)) {
    throw new Error(`Dump file not found: ${dumpPath}`);
  }

  const sql = fs.readFileSync(dumpPath, 'utf8');
  const orders = parseTable(sql, 'TrackingOrder');
  const histories = parseTable(sql, 'TrackingHistory');

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'import',
        dumpPath,
        parsed: {
          orders: orders.length,
          histories: histories.length,
          telegramUsers: new Set(orders.map((order) => String(order.telegramChatId))).size,
        },
      },
      null,
      2,
    ),
  );

  const userByChatId = await importUsers(orders, dryRun);
  const orderResult = await importOrders(orders, userByChatId, dryRun);
  const historySummary = await importHistories(
    histories,
    orderResult.oldOrderIdToNewOrderId,
    dryRun,
  );

  const dbCounts = dryRun
    ? null
    : {
        users: await prisma.user.count(),
        orders: await prisma.trackingOrder.count(),
        histories: await prisma.trackingHistory.count(),
      };

  console.log(
    JSON.stringify(
      {
        users: { upsertedOrExisting: userByChatId.size },
        orders: orderResult.summary,
        histories: historySummary,
        dbCounts,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
