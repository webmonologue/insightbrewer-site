import { describe, expect, it } from 'vitest';
import { validateContact } from './validateContact';

describe('validateContact', () => {
  it('accepts a well-formed submission', () => {
    const result = validateContact({
      name: '홍길동',
      email: 'hong@example.com',
      message: '안녕하세요, 문의드립니다.',
    });
    expect(result).toEqual({
      ok: true,
      data: {
        name: '홍길동',
        email: 'hong@example.com',
        message: '안녕하세요, 문의드립니다.',
      },
    });
  });

  it('rejects a missing name', () => {
    const result = validateContact({ name: null, email: 'hong@example.com', message: '문의' });
    expect(result).toEqual({ ok: false, error: '이름을 입력해 주세요.' });
  });

  it('rejects a missing message', () => {
    const result = validateContact({ name: '홍길동', email: 'hong@example.com', message: '' });
    expect(result).toEqual({ ok: false, error: '문의 내용을 입력해 주세요.' });
  });

  it('rejects a malformed email', () => {
    const result = validateContact({ name: '홍길동', email: 'not-an-email', message: '문의' });
    expect(result).toEqual({ ok: false, error: '올바른 이메일 주소를 입력해 주세요.' });
  });

  it('trims whitespace from all fields', () => {
    const result = validateContact({
      name: '  홍길동  ',
      email: '  hong@example.com  ',
      message: '  문의  ',
    });
    expect(result).toEqual({
      ok: true,
      data: { name: '홍길동', email: 'hong@example.com', message: '문의' },
    });
  });
});
