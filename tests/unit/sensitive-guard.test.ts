// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { Window } from 'happy-dom';
import * as fs from 'fs';
import * as path from 'path';
import { isBlacklistedUrl } from '../../src/shared/sensitive';
import { checkSensitivePage, sanitizeFormInputs } from '../../src/content/extractor/sensitive';

describe('Sensitive Guard & Privacy Protection', () => {
  describe('isBlacklistedUrl', () => {
    it('detects all built-in sensitive categories', () => {
      // Banking
      expect(isBlacklistedUrl('https://chase.com/login').isBlacklisted).toBe(true);
      expect(isBlacklistedUrl('https://www.bankofamerica.com/').isBlacklisted).toBe(true);
      expect(isBlacklistedUrl('https://my.fidelity.com/account').isBlacklisted).toBe(true);

      // Checkout
      expect(isBlacklistedUrl('https://store.example.com/checkout').isBlacklisted).toBe(true);
      expect(isBlacklistedUrl('https://shop.test.org/cart/pay').isBlacklisted).toBe(true);
      expect(isBlacklistedUrl('https://checkout.stripe.com/pay/cs_test').isBlacklisted).toBe(true);

      // Webmail
      expect(isBlacklistedUrl('https://mail.google.com/mail/u/0').isBlacklisted).toBe(true);
      expect(isBlacklistedUrl('https://outlook.live.com/mail/inbox').isBlacklisted).toBe(true);

      // Health
      expect(isBlacklistedUrl('https://mychart.hospital.org/portal').isBlacklisted).toBe(true);

      // Government
      expect(isBlacklistedUrl('https://login.gov/openid').isBlacklisted).toBe(true);
      expect(isBlacklistedUrl('https://secure.ssa.gov/').isBlacklisted).toBe(true);

      // Password managers
      expect(isBlacklistedUrl('https://vault.bitwarden.com/').isBlacklisted).toBe(true);
      expect(isBlacklistedUrl('https://my.1password.com/signin').isBlacklisted).toBe(true);
    });

    it('permits standard non-sensitive sites', () => {
      expect(isBlacklistedUrl('https://en.wikipedia.org/wiki/Algorithm').isBlacklisted).toBe(false);
      expect(isBlacklistedUrl('https://leetcode.com/problems/two-sum').isBlacklisted).toBe(false);
      expect(isBlacklistedUrl('https://codeforces.com/contest/123').isBlacklisted).toBe(false);
      expect(isBlacklistedUrl('https://developer.mozilla.org/en-US/docs/Web').isBlacklisted).toBe(false);
      expect(isBlacklistedUrl('http://localhost:3000/docs').isBlacklisted).toBe(false);
    });

    it('matches user-defined custom blacklist patterns', () => {
      const custom = ['internal\\.company\\.net', 'secret-portal', 'admin\\.test\\.local'];
      expect(isBlacklistedUrl('https://internal.company.net/dashboard', custom).isBlacklisted).toBe(true);
      expect(isBlacklistedUrl('https://example.com/secret-portal/view', custom).isBlacklisted).toBe(true);
      expect(isBlacklistedUrl('https://admin.test.local', custom).isBlacklisted).toBe(true);
      expect(isBlacklistedUrl('https://other.company.net', custom).isBlacklisted).toBe(false);
    });

    it('handles malformed or invalid URLs gracefully without throwing', () => {
      expect(isBlacklistedUrl('not a url at all').isBlacklisted).toBe(false);
      expect(isBlacklistedUrl('chase.com').isBlacklisted).toBe(true);
      expect(isBlacklistedUrl('').isBlacklisted).toBe(false);
    });
  });

  describe('checkSensitivePage (DOM-level checks)', () => {
    const parseHtml = (html: string, url = 'https://example.com'): Document => {
      const win = new Window({ url });
      win.document.write(html);
      return win.document as unknown as Document;
    };

    it('detects password input fields in fixtures', () => {
      const fixturePath = path.resolve(__dirname, '../fixtures/password-field.html');
      const html = fs.readFileSync(fixturePath, 'utf8');
      const doc = parseHtml(html, 'https://example.com/account');
      const result = checkSensitivePage(doc, 'https://example.com/account');
      expect(result.isSensitive).toBe(true);
      expect(result.reason).toContain('password field');
    });

    it('detects login/auth forms in fixtures', () => {
      const fixturePath = path.resolve(__dirname, '../fixtures/login-form.html');
      const html = fs.readFileSync(fixturePath, 'utf8');
      const doc = parseHtml(html, 'https://example.com/signin');
      const result = checkSensitivePage(doc, 'https://example.com/signin');
      expect(result.isSensitive).toBe(true);
      expect(result.reason).toMatch(/login|password|auth/i);
    });

    it('passes clean articles without sensitive fields', () => {
      const fixturePath = path.resolve(__dirname, '../fixtures/wikipedia-article.html');
      const html = fs.readFileSync(fixturePath, 'utf8');
      const doc = parseHtml(html, 'https://en.wikipedia.org/wiki/Algorithm');
      const result = checkSensitivePage(doc, 'https://en.wikipedia.org/wiki/Algorithm');
      expect(result.isSensitive).toBe(false);
    });

    it('detects checkout forms with cc/cvv fields', () => {
      const doc = parseHtml(`
        <html>
          <body>
            <form action="/pay">
              <input type="text" name="cardnumber" autocomplete="cc-number" />
              <input type="text" name="cvv" />
              <button type="submit">Pay Now</button>
            </form>
          </body>
        </html>
      `, 'https://store.example.com/pay');
      const result = checkSensitivePage(doc, 'https://store.example.com/pay');
      expect(result.isSensitive).toBe(true);
      expect(result.reason).toContain('Payment Checkout');
    });
  });

  describe('sanitizeFormInputs', () => {
    it('strips input, textarea, and contenteditable elements in place', () => {
      const win = new Window();
      win.document.write(`
        <div id="root">
          <h1>Article Header</h1>
          <p>Some paragraph text</p>
          <input type="text" value="secret text" />
          <textarea>private memo</textarea>
          <div contenteditable="true">editable note</div>
          <span>Conclusion</span>
        </div>
      `);

      const root = win.document.querySelector('#root') as unknown as HTMLElement;
      sanitizeFormInputs(root);

      expect(root.querySelector('input')).toBeNull();
      expect(root.querySelector('textarea')).toBeNull();
      expect(root.querySelector('[contenteditable]')).toBeNull();
      expect(root.textContent).toContain('Article Header');
      expect(root.textContent).toContain('Some paragraph text');
      expect(root.textContent).toContain('Conclusion');
      expect(root.textContent).not.toContain('secret text');
      expect(root.textContent).not.toContain('private memo');
    });
  });
});
