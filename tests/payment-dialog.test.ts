import test from 'node:test';
import assert from 'node:assert/strict';
import { openPaymentDialog } from '../src/lib/paymentDialog';

function fixture(fail = false) {
  const style = () => {
    const values = new Map<string, [string, string]>();
    return {
      getPropertyValue: (key: string) => values.get(key)?.[0] || '',
      getPropertyPriority: (key: string) => values.get(key)?.[1] || '',
      setProperty(key: string, value: string, priority = '') {
        if (value) values.set(key, [value, priority]);
        else values.delete(key);
      },
    };
  };
  const bodyStyle = style();
  const rootStyle = style();
  bodyStyle.setProperty('padding-right', '8px');
  bodyStyle.setProperty('position', 'relative', 'important');
  rootStyle.setProperty('scroll-behavior', 'smooth');
  let focused = 0;
  let closed = 0;
  const scrolls: number[][] = [];
  const view = {
    scrollX: 12, scrollY: 640, innerWidth: 1000,
    document: {
      body: { style: bodyStyle },
      documentElement: { style: rootStyle, clientWidth: 985 },
      activeElement: { isConnected: true, focus: () => focused++ },
    },
    getComputedStyle: () => ({ paddingRight: '8px' }),
    scrollTo(x: number, y: number) {
      assert.equal(rootStyle.getPropertyValue('scroll-behavior'), 'auto');
      scrolls.push([x, y]);
    },
  };
  const dialog = {
    showModal() { if (fail) throw new Error('cannot open'); },
    close() { closed++; },
  };
  return { view, dialog, bodyStyle, rootStyle, scrolls, focused: () => focused, closed: () => closed };
}

test('결제창은 배경 스크롤을 고정하고 닫으면 스타일·위치·포커스를 복원한다', () => {
  const f = fixture();
  const cleanup = openPaymentDialog(f.dialog as HTMLDialogElement, f.view as unknown as Window);
  assert.equal(f.bodyStyle.getPropertyValue('position'), 'fixed');
  assert.equal(f.bodyStyle.getPropertyValue('top'), '-640px');
  assert.equal(f.bodyStyle.getPropertyValue('left'), '-12px');
  assert.equal(f.bodyStyle.getPropertyValue('padding-right'), '23px');
  assert.equal(f.rootStyle.getPropertyValue('overflow'), 'hidden');
  cleanup();
  cleanup();
  assert.equal(f.bodyStyle.getPropertyValue('position'), 'relative');
  assert.equal(f.bodyStyle.getPropertyPriority('position'), 'important');
  assert.equal(f.bodyStyle.getPropertyValue('top'), '');
  assert.equal(f.bodyStyle.getPropertyValue('padding-right'), '8px');
  assert.equal(f.rootStyle.getPropertyValue('overflow'), '');
  assert.equal(f.rootStyle.getPropertyValue('scroll-behavior'), 'smooth');
  assert.deepEqual(f.scrolls, [[12, 640]]);
  assert.equal(f.focused(), 1);
  assert.equal(f.closed(), 1);
});

test('모달 열기 실패 시에도 배경 고정과 포커스를 원복한다', () => {
  const f = fixture(true);
  assert.throws(() => openPaymentDialog(f.dialog as HTMLDialogElement, f.view as unknown as Window), /cannot open/);
  assert.equal(f.bodyStyle.getPropertyValue('position'), 'relative');
  assert.equal(f.rootStyle.getPropertyValue('overflow'), '');
  assert.deepEqual(f.scrolls, [[12, 640]]);
  assert.equal(f.focused(), 1);
});

test('열기·닫기·다시 열기에서도 스크롤 잠금이 남지 않는다', () => {
  const f = fixture();
  for (let i = 0; i < 3; i++) {
    const cleanup = openPaymentDialog(f.dialog as HTMLDialogElement, f.view as unknown as Window);
    cleanup();
    assert.equal(f.bodyStyle.getPropertyValue('width'), '');
    assert.equal(f.bodyStyle.getPropertyValue('overflow'), '');
  }
  assert.equal(f.closed(), 3);
});
