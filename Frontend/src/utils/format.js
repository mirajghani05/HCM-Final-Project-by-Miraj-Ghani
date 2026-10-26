export const formatCurrency = (value) => {
  const number = Number(value || 0);
  return `Rs ${number.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
};

export const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${formatDate(date)} · ${formatTime(date)}`;
};

export const initials = (firstName, lastName) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
};

export const titleCase = (value = '') => {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const roleLabel = (role) => {
  if (role === 'admin') return 'Administrator';
  if (role === 'hr') return 'HR Manager';
  if (role === 'employee') return 'Employee';
  return titleCase(role || 'User');
};
