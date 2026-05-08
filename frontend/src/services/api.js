const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.erro || 'Erro ao comunicar com a API.');
  }

  return data;
}

export function listarNotas() {
  return request('/nfe');
}

export function receberNota(nota) {
  return request('/nfe/receber', {
    method: 'POST',
    body: JSON.stringify(nota)
  });
}

export function autorizarNota(id) {
  return request(`/nfe/autorizar/${id}`, {
    method: 'POST'
  });
}

export function editarNota(id, nota) {
  return request(`/nfe/${id}`, {
    method: 'PUT',
    body: JSON.stringify(nota)
  });
}

export function validarXml(xml) {
  return request('/nfe/validar-xml', {
    method: 'POST',
    body: JSON.stringify({ xml })
  });
}
