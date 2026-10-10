(function () {
  async function request(path, options = {}) {
    const { headers, ...rest } = options;
    const res = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...rest,
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    });

    if (res.status === 401) {
      window.location.href = '/login';
      const err = new Error('Unauthorized');
      err.status = 401;
      throw err;
    }

    let body = null;
    try { body = await res.json(); } catch (_) { /* empty body */ }

    if (!res.ok) {
      const err = new Error((body && body.message) || 'Request failed');
      err.status = res.status;
      err.body = body; // field errors from validation (422)
      throw err;
    }
    return body;
  }

  window.Api = {
    get: (path) => request(path),
    post: (path, data) => request(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
    put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
    del: (path) => request(path, { method: 'DELETE' }),
  };
})();