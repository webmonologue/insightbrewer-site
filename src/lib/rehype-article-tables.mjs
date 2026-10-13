/** Preserve native table semantics inside a keyboard-scrollable region. */
export default function rehypeArticleTables() {
  return tree => {
    let index = 0;
    const text = node => node.type === 'text' ? node.value : (node.children ?? []).map(text).join('');
    function walk(parent) {
      for (let i = 0; i < (parent.children?.length ?? 0); i++) {
        const node = parent.children[i];
        if (node.type === 'element' && node.tagName === 'table') {
          const header = node.children.find(child => child.tagName === 'thead');
          for (const row of header?.children ?? []) {
            for (const cell of row.children ?? []) {
              if (cell.tagName === 'th') cell.properties = { ...cell.properties, scope: 'col' };
            }
          }
          const label = text(header ?? node).replace(/\s+/g, ' ').trim();
          const scrollRegion = {
            type: 'element', tagName: 'div',
            properties: { className: ['table-scroll'], role: 'region', ariaLabel: `표 ${++index}: ${label} (가로 스크롤 가능)`, tabIndex: 0 },
            children: [node],
          };
          parent.children[i] = {
            type: 'element', tagName: 'div', properties: { className: ['table-block'] },
            children: [scrollRegion, {
              type: 'element', tagName: 'p', properties: { className: ['table-scroll-hint'], ariaHidden: 'true' },
              children: [{ type: 'text', value: '표를 좌우로 밀어 전체 내용을 확인하세요.' }],
            }],
          };
        } else walk(node);
      }
    }
    walk(tree);
  };
}
