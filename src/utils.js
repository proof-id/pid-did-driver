const { Did, connect } = require('@proofid/pid-js-lib');

async function getDidViaChain(address) {
  connect();
  return Did.DidChain.queryById(address);
}

function isUrlFetchable(storageLocation) {
  const fetchableUrlPattern = new RegExp('^(http|https)://');
  return fetchableUrlPattern.test(storageLocation);
}

function getDidDocumentFromJsonResponse(jsonResponse) {
  return jsonResponse.did;
}

async function getDidDocumentStorageLocation(address) {
  const did = await getDidViaChain(address);
  if (!did) return null;
  return did.documentStore;
}

module.exports = {
  getDidDocumentStorageLocation,
  getDidDocumentFromJsonResponse,
  isUrlFetchable
};
