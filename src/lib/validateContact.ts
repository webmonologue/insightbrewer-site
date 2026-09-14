type FieldInput = FormDataEntryValue | null;

export type ContactInput = {
  name: FieldInput;
  email: FieldInput;
  message: FieldInput;
};

export type ContactData = {
  name: string;
  email: string;
  message: string;
};

export type ValidateContactResult =
  | { ok: true; data: ContactData }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asString(value: FieldInput): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateContact(input: ContactInput): ValidateContactResult {
  const name = asString(input.name);
  const email = asString(input.email);
  const message = asString(input.message);

  if (!name) {
    return { ok: false, error: '이름을 입력해 주세요.' };
  }
  if (!email) {
    return { ok: false, error: '이메일을 입력해 주세요.' };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: '올바른 이메일 주소를 입력해 주세요.' };
  }
  if (!message) {
    return { ok: false, error: '문의 내용을 입력해 주세요.' };
  }

  return { ok: true, data: { name, email, message } };
}
