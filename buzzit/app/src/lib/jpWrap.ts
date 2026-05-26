const JP_PUNCT = /[、。！？；：]/g;

const JP_WRAP_SELECTOR =
  '[data-jp-wrap], main p, main li, footer p, footer li, section p.text-neutral-400, section p.text-neutral-500, section p.text-neutral-600, section p.text-slate-400, section p.text-slate-500, section p.text-gray-500';

function processTextNode(textNode: Text) {
  const text = textNode.textContent ?? '';
  if (!/[ぁ-んァ-ヶ一-龠]/.test(text)) return;

  JP_PUNCT.lastIndex = 0;
  if (!JP_PUNCT.test(text)) return;

  const parent = textNode.parentNode;
  if (!parent) return;

  const frag = document.createDocumentFragment();
  let last = 0;
  JP_PUNCT.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = JP_PUNCT.exec(text)) !== null) {
    const end = match.index + match[0].length;
    frag.appendChild(document.createTextNode(text.slice(last, end)));
    frag.appendChild(document.createElement('wbr'));
    last = end;
  }
  if (last >= text.length) {
    parent.replaceChild(frag, textNode);
    return;
  }
  frag.appendChild(document.createTextNode(text.slice(last)));
  parent.replaceChild(frag, textNode);
}

function enhanceElement(el: HTMLElement) {
  if (el.dataset.jpWrapDone) return;
  if (el.closest('[data-jp-wrap-off], [data-headline-fit]')) return;

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentElement?.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  nodes.forEach(processTextNode);
  el.dataset.jpWrapDone = 'true';
}

export function enhanceJpWrap(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(JP_WRAP_SELECTOR).forEach(enhanceElement);
}
