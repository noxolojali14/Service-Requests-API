const isLiveServer = Number(window.location.port) >= 5500 && Number(window.location.port) < 5600;
const apiUrl = isLiveServer
  ? `${window.location.protocol}//${window.location.hostname}:3000/api/requests`
  : '/api/requests';
const requestsTable = document.querySelector('#requestRows');
const requestDialog = document.querySelector('#requestDialog');
const requestForm = document.querySelector('#requestForm');
const toast = document.querySelector('#toast');
const searchInput = document.querySelector('#searchInput');
const statusFilter = document.querySelector('#statusFilter');

let requests = [];
let editingRequestId = null;
let toastTimeout;

function showToast(message, isError = false) {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.toggle('toast-error', isError);
  toast.hidden = false;
  toastTimeout = window.setTimeout(() => {
    toast.hidden = true;
  }, 3500);
}

async function sendRequest(url, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...options.headers
  };

  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const requestOptions = {
    ...options,
    headers
  };

  let response;
  const isSeparatePreview = window.location.port && window.location.port !== '3000';

  try {
    response = await fetch(url, requestOptions);
  } catch (error) {
    if (!isSeparatePreview) {
      throw new Error('Could not reach the API. Start the Express server with npm.cmd start.');
    }

    response = await fetchFromExpress(url, requestOptions);
  }

  const contentType = response.headers.get('content-type') || '';
  if (isSeparatePreview && !contentType.includes('application/json')) {
    response = await fetchFromExpress(url, requestOptions);
  }

  const responseType = response.headers.get('content-type') || '';
  const responseText = await response.text();
  let result = null;

  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch (error) {
      if (!response.ok) {
        throw new Error(`The API returned a non-JSON response (${response.status}). Check that Express is running.`);
      }

      throw new Error(`The API returned invalid JSON (${responseType || 'unknown content type'}).`);
    }
  }

  if (!response.ok) {
    throw new Error(result?.error || `The request failed with status ${response.status}.`);
  }

  return result;
}

async function fetchFromExpress(url, options) {
  const expressOrigin = `http://${window.location.hostname || 'localhost'}:3000`;

  try {
    return await fetch(new URL(url, expressOrigin), options);
  } catch (error) {
    throw new Error('Could not reach Express on port 3000. Start it with npm.cmd start.');
  }
}

function makeCell(className, text) {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  if (text !== undefined) cell.textContent = text;
  return cell;
}

function getStatusClass(status) {
  return `status-${status.toLowerCase().replaceAll(' ', '-')}`;
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function renderRequest(request) {
  const row = document.createElement('tr');

  const titleCell = makeCell('');
  const title = document.createElement('span');
  title.className = 'request-title';
  title.textContent = request.title;
  const description = document.createElement('span');
  description.className = 'request-description';
  description.textContent = request.description;
  titleCell.append(title, description);

  const requesterCell = makeCell('');
  const requester = document.createElement('span');
  requester.className = 'requester-name';
  requester.textContent = request.requesterName;
  requesterCell.append(requester);

  const priorityCell = makeCell('');
  const priority = document.createElement('span');
  priority.className = `priority-label priority-${request.priority.toLowerCase()}`;
  const priorityDot = document.createElement('span');
  priorityDot.className = 'priority-dot';
  priorityDot.setAttribute('aria-hidden', 'true');
  priority.append(priorityDot, document.createTextNode(request.priority));
  priorityCell.append(priority);

  const statusCell = makeCell('');
  const statusSelect = document.createElement('select');
  statusSelect.className = `status-select ${getStatusClass(request.status)}`;
  statusSelect.setAttribute('aria-label', `Status for ${request.title}`);
  for (const status of ['Open', 'In Progress', 'Resolved']) {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    option.selected = request.status === status;
    statusSelect.append(option);
  }
  statusSelect.addEventListener('change', () => updateStatus(request.id, statusSelect.value));
  statusCell.append(statusSelect);

  const createdCell = makeCell('created-date', formatDate(request.createdAt));
  const actionsCell = makeCell('');
  const actions = document.createElement('div');
  actions.className = 'row-actions';
  const editButton = document.createElement('button');
  editButton.className = 'text-action';
  editButton.type = 'button';
  editButton.textContent = 'Edit';
  editButton.setAttribute('aria-label', `Edit ${request.title}`);
  editButton.addEventListener('click', () => openEditDialog(request));
  const deleteButton = document.createElement('button');
  deleteButton.className = 'text-action delete-action';
  deleteButton.type = 'button';
  deleteButton.textContent = 'Delete';
  deleteButton.setAttribute('aria-label', `Delete ${request.title}`);
  deleteButton.addEventListener('click', () => deleteRequest(request));
  actions.append(editButton, deleteButton);
  actionsCell.append(actions);

  row.append(titleCell, requesterCell, priorityCell, statusCell, createdCell, actionsCell);
  requestsTable.append(row);
}

function renderRequests() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;
  const filteredRequests = requests.filter((request) => {
    const matchesQuery = [request.title, request.description, request.requesterName]
      .some((value) => value.toLowerCase().includes(query));
    const matchesStatus = selectedStatus === 'All' || request.status === selectedStatus;
    return matchesQuery && matchesStatus;
  });

  requestsTable.replaceChildren();
  for (const request of filteredRequests) renderRequest(request);

  document.querySelector('#totalCount').textContent = requests.length;
  document.querySelector('#openCount').textContent = requests.filter((request) => request.status === 'Open').length;
  document.querySelector('#progressCount').textContent = requests.filter((request) => request.status === 'In Progress').length;
  document.querySelector('#resolvedCount').textContent = requests.filter((request) => request.status === 'Resolved').length;
  document.querySelector('#listFooter').textContent = `Showing ${filteredRequests.length} of ${requests.length} requests`;

  const emptyState = document.querySelector('#emptyState');
  const isFiltered = query !== '' || selectedStatus !== 'All';
  emptyState.hidden = filteredRequests.length > 0;
  document.querySelector('#emptyTitle').textContent = isFiltered ? 'No matching requests' : 'Nothing here yet';
  document.querySelector('#emptyMessage').textContent = isFiltered
    ? 'Try a different search or status filter.'
    : 'Create a request to get the work queue started.';
  document.querySelector('#emptyCreateButton').hidden = isFiltered;
}

async function loadRequests() {
  requestsTable.innerHTML = '<tr><td class="table-message" colspan="6">Loading requests…</td></tr>';
  try {
    requests = await sendRequest(apiUrl);
    renderRequests();
  } catch (error) {
    requests = [];
    requestsTable.replaceChildren();
    renderRequests();
    showToast(error.message, true);
  }
}

function openCreateDialog() {
  editingRequestId = null;
  requestForm.reset();
  document.querySelector('#dialogTitle').textContent = 'New request';
  document.querySelector('#saveRequestButton').textContent = 'Create request';
  document.querySelector('#statusInput').value = 'Open';
  requestDialog.showModal();
  document.querySelector('#titleInput').focus();
}

function openEditDialog(request) {
  editingRequestId = request.id;
  requestForm.elements.title.value = request.title;
  requestForm.elements.description.value = request.description;
  requestForm.elements.requesterName.value = request.requesterName;
  requestForm.elements.priority.value = request.priority;
  requestForm.elements.status.value = request.status;
  document.querySelector('#dialogTitle').textContent = 'Edit request';
  document.querySelector('#saveRequestButton').textContent = 'Save changes';
  requestDialog.showModal();
  document.querySelector('#titleInput').focus();
}

async function saveRequest(event) {
  event.preventDefault();
  const formData = new FormData(requestForm);
  const requestData = Object.fromEntries(formData.entries());
  const isEditing = editingRequestId !== null;
  const url = isEditing ? `${apiUrl}/${encodeURIComponent(editingRequestId)}` : apiUrl;

  try {
    await sendRequest(url, {
      method: isEditing ? 'PUT' : 'POST',
      body: JSON.stringify(requestData)
    });
    requestDialog.close();
    await loadRequests();
    showToast(isEditing ? 'Request updated.' : 'Request created.');
  } catch (error) {
    showToast(error.message, true);
  }
}

async function updateStatus(id, status) {
  try {
    await sendRequest(`${apiUrl}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    await loadRequests();
    showToast('Status updated.');
  } catch (error) {
    showToast(error.message, true);
    await loadRequests();
  }
}

async function deleteRequest(request) {
  const confirmed = window.confirm(`Delete "${request.title}"? This cannot be undone.`);
  if (!confirmed) return;

  try {
    await sendRequest(`${apiUrl}/${encodeURIComponent(request.id)}`, { method: 'DELETE' });
    await loadRequests();
    showToast('Request deleted.');
  } catch (error) {
    showToast(error.message, true);
  }
}

document.querySelector('#newRequestButton').addEventListener('click', openCreateDialog);
document.querySelector('#emptyCreateButton').addEventListener('click', openCreateDialog);
document.querySelector('#closeDialogButton').addEventListener('click', () => requestDialog.close());
document.querySelector('#cancelDialogButton').addEventListener('click', () => requestDialog.close());
requestForm.addEventListener('submit', saveRequest);
searchInput.addEventListener('input', renderRequests);
statusFilter.addEventListener('change', renderRequests);
document.querySelector('#todayLabel').textContent = new Intl.DateTimeFormat(undefined, {
  weekday: 'short', month: 'short', day: 'numeric'
}).format(new Date());

loadRequests();