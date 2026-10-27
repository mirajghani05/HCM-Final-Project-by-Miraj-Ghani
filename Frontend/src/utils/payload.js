const trimmed = (value) => (typeof value === 'string' ? value.trim() : value);

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

/**
 * Builds the employee payload for create/update requests.
 *
 * Optional fields are omitted when empty so the API never receives
 * `department: ''` or similar values that Mongoose cannot cast to ObjectId.
 */
export const buildEmployeePayload = (form) => {
  const payload = {
    firstName: trimmed(form.firstName) || '',
    lastName: trimmed(form.lastName) || '',
    email: trimmed(form.email) || '',
    joinDate: form.joinDate
  };

  if (hasValue(form.phone)) payload.phone = trimmed(form.phone);
  if (hasValue(form.address)) payload.address = trimmed(form.address);
  if (hasValue(form.department)) payload.department = form.department;
  if (hasValue(form.designation)) payload.designation = form.designation;
  if (hasValue(form.gender)) payload.gender = form.gender;
  if (hasValue(form.dateOfBirth)) payload.dateOfBirth = form.dateOfBirth;
  if (hasValue(form.employmentType)) payload.employmentType = form.employmentType;
  if (hasValue(form.status)) payload.status = form.status;

  if (hasValue(form.basicSalary)) {
    payload.basicSalary = Number(form.basicSalary);
  }

  return payload;
};

export const buildUserPayload = (form) => ({
  email: trimmed(form.email) || '',
  password: form.password,
  firstName: trimmed(form.firstName) || '',
  lastName: trimmed(form.lastName) || ''
});
