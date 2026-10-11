// Read-only production diagnosis using the user's existing Firebase CLI session.
// Outputs aggregate numbers and index status, never credentials or participant records.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { getProjectDefaultAccount } = require('firebase-tools/lib/auth');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');
const { FirestoreApi } = require('firebase-tools/lib/firestore/api');

const eventId = process.argv[2];
if (!eventId || !/^[a-zA-Z0-9_-]{1,128}$/.test(eventId)) throw new Error('An explicit event ID is required.');
const project = 'ieeeqassim';
const account = getProjectDefaultAccount(process.cwd());
await requireAuth({ project, ...account, nonInteractive: true });
const api = new Client({ urlPrefix: 'https://firestore.googleapis.com', apiVersion: 'v1' });
const root = `/projects/${project}/databases/(default)/documents`;
const event = await api.get(`${root}/events/${eventId}`, { resolveOnHTTPError: true, queryParams: { 'mask.fieldPaths': 'title' } });
if (event.status !== 200) {
  console.log(JSON.stringify({ eventExists: false, httpStatus: event.status }));
  process.exit(2);
}
const equal = (field, value) => ({ fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } });
const specs = process.argv.includes('--index-status') ? [] : process.argv.includes('--feedback-only') ? [['event_feedback', null]] : [
  ['registrations', null], ...['pending', 'approved', 'waitlisted', 'rejected', 'cancelled', 'attended'].map(status => ['registrations', status]),
  ...['Available', 'Failed', 'Generating'].map(status => ['certificates', status]), ['event_feedback', null],
];
const results = await Promise.all(specs.map(async ([collection, status]) => {
  const filters = [equal('eventId', eventId), ...(status ? [equal('status', status)] : [])];
  const aggregations = [{ alias: 'total', count: {} }, ...(collection === 'event_feedback' ? [{ alias: 'averageRating', avg: { field: { fieldPath: 'rating' } } }] : [])];
  try {
    const response = await api.post(`${root}:runAggregationQuery`, { structuredAggregationQuery: {
      structuredQuery: { from: [{ collectionId: collection }], where: filters.length === 1 ? filters[0] : { compositeFilter: { op: 'AND', filters } } }, aggregations,
    } }, { resolveOnHTTPError: true });
    const aggregate = response.body?.[0]?.result?.aggregateFields;
    const failure = response.body?.[0]?.error;
    return { collection, status, ok: response.status < 400, httpStatus: response.status,
      ...(aggregate ? { total: Number(aggregate.total?.integerValue || 0), ...(aggregate.averageRating ? { averageRating: aggregate.averageRating.doubleValue ?? null } : {}) } : {}),
      ...(failure ? { category: failure.status, message: failure.message } : {}),
    };
  } catch (error) {
    const failure = error.context?.body?.error || error.context?.body?.[0]?.error;
    return { collection, status, ok: false, code: failure?.code, category: failure?.status, message: failure?.message || error.message || 'Query failed.' };
  }
}));
console.log(JSON.stringify({ eventId, queries: results }, null, 2));
const indexes = await new FirestoreApi().listIndexes(project);
console.log(JSON.stringify({ indexes: indexes.filter(index => index.state !== 'READY' || index.name?.includes('/event_feedback/')).map(index => ({ collection: index.name?.split('/collectionGroups/')[1]?.split('/')[0], state: index.state, fields: index.fields?.map(field => ({ name: field.fieldPath, order: field.order })) })) }, null, 2));
if (results.some(result => !result.ok)) process.exitCode = 1;
