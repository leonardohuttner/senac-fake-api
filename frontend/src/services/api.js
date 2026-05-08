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
  return request('/nfe/json');
}

export function receberNota(nota) {
  return request('/nfe/json/receber', {
    method: 'POST',
    body: JSON.stringify(nota)
  });
}

export function autorizarNota(chaveAcesso) {
  return request(`/nfe/json/autorizar/${chaveAcesso}`, {
    method: 'POST'
  });
}

export function editarNota(id, nota) {
  return request(`/nfe/json/${id}`, {
    method: 'PUT',
    body: JSON.stringify(nota)
  });
}

export function validarXml(xml) {
  return request('/nfe/json/validar-xml', {
    method: 'POST',
    body: JSON.stringify({ xml })
  });
}
